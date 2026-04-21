-- 1) Novos campos em contract_addendums
ALTER TABLE public.contract_addendums
  ADD COLUMN IF NOT EXISTS addendum_type TEXT NOT NULL DEFAULT 'extra_service',
  ADD COLUMN IF NOT EXISTS proof_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS proof_photo_taken_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS proof_source TEXT,
  ADD COLUMN IF NOT EXISTS chat_message_id UUID;

-- Constraint: tipo válido
ALTER TABLE public.contract_addendums
  DROP CONSTRAINT IF EXISTS contract_addendums_type_check;
ALTER TABLE public.contract_addendums
  ADD CONSTRAINT contract_addendums_type_check
  CHECK (addendum_type IN ('extra_hours', 'extra_service'));

-- Constraint: proof_source válido (quando preenchido)
ALTER TABLE public.contract_addendums
  DROP CONSTRAINT IF EXISTS contract_addendums_proof_source_check;
ALTER TABLE public.contract_addendums
  ADD CONSTRAINT contract_addendums_proof_source_check
  CHECK (proof_source IS NULL OR proof_source IN ('presencial_foto', 'chat_message'));

-- 2) Bucket de storage para as fotos-prova
INSERT INTO storage.buckets (id, name, public)
VALUES ('addendum-proofs', 'addendum-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: profissional faz upload no próprio contrato (path: {contract_id}/{file})
DROP POLICY IF EXISTS "addendum_proofs_pro_insert" ON storage.objects;
CREATE POLICY "addendum_proofs_pro_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'addendum-proofs'
  AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.professional_id = auth.uid()
  )
);

-- Policy: cliente e profissional do contrato leem
DROP POLICY IF EXISTS "addendum_proofs_parties_select" ON storage.objects;
CREATE POLICY "addendum_proofs_parties_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'addendum-proofs'
  AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.professional_id = auth.uid() OR c.client_id = auth.uid())
  )
);

-- Admin total
DROP POLICY IF EXISTS "addendum_proofs_admin_all" ON storage.objects;
CREATE POLICY "addendum_proofs_admin_all"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'addendum-proofs' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'addendum-proofs' AND public.is_admin(auth.uid()));

-- 3) Função: cliente tem dívida de aditivo pendente?
CREATE OR REPLACE FUNCTION public.client_has_pending_addendum_debt(p_client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.contract_addendums a
    JOIN public.contracts c ON c.id = a.contract_id
    WHERE c.client_id = p_client_id
      AND a.status = 'accepted'
      AND a.paid_at IS NULL
      AND COALESCE(a.merged_with_original, false) = false
  );
$$;

-- 4) Trigger que bloqueia criação/aceitação de oportunidades se o cliente tem dívida
CREATE OR REPLACE FUNCTION public.block_opportunity_if_addendum_debt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND public.client_has_pending_addendum_debt(NEW.client_id) THEN
    RAISE EXCEPTION 'pending_addendum_debt'
      USING HINT = 'Você possui aditivos aprovados pendentes de pagamento. Pague-os antes de criar novas oportunidades.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_opportunity_if_addendum_debt ON public.opportunities;
CREATE TRIGGER trg_block_opportunity_if_addendum_debt
  BEFORE INSERT ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.block_opportunity_if_addendum_debt();

-- 5) Atualizar propose_contract_addendum para aceitar tipo + foto-prova
CREATE OR REPLACE FUNCTION public.propose_contract_addendum(
  p_contract_id uuid,
  p_items jsonb,
  p_reason text,
  p_ip text DEFAULT NULL::text,
  p_user_agent text DEFAULT NULL::text,
  p_addendum_type text DEFAULT 'extra_service',
  p_proof_photo_url text DEFAULT NULL,
  p_proof_source text DEFAULT NULL,
  p_chat_message_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_contract contracts%ROWTYPE;
  v_role TEXT;
  v_other_party UUID;
  v_total NUMERIC := 0;
  v_item JSONB;
  v_addendum_id UUID;
  v_text TEXT;
  v_proposer profiles%ROWTYPE;
  v_other_name TEXT;
  v_opp_title TEXT;
  v_items_text TEXT := '';
  v_idx INT := 1;
  v_proof_taken_at TIMESTAMPTZ := NULL;
BEGIN
  SELECT * INTO v_contract FROM contracts WHERE id = p_contract_id;
  IF v_contract.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'contract_not_found');
  END IF;

  -- Determinar papel
  IF v_contract.client_id = auth.uid() THEN
    v_role := 'client'; v_other_party := v_contract.professional_id;
  ELSIF v_contract.professional_id = auth.uid() THEN
    v_role := 'professional'; v_other_party := v_contract.client_id;
  ELSE
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  -- Permitir somente em contratos antes de concluído
  IF v_contract.status IN ('completed', 'cancelled') OR v_contract.completed_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'contract_closed');
  END IF;

  -- Validar tipo
  IF p_addendum_type NOT IN ('extra_hours', 'extra_service') THEN
    RETURN json_build_object('success', false, 'error', 'invalid_type');
  END IF;

  -- Para horas extras propostas pelo profissional → foto obrigatória
  IF p_addendum_type = 'extra_hours' AND v_role = 'professional' AND p_proof_photo_url IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'proof_photo_required');
  END IF;

  -- Validar e somar itens
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'no_items');
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_total := v_total + COALESCE((v_item->>'subtotal')::NUMERIC, 0);
    v_items_text := v_items_text || '  ' || v_idx || '. '
      || COALESCE(v_item->>'description', 'Item') || ' — '
      || COALESCE(v_item->>'type','servico') || ' — '
      || 'Qtd: ' || COALESCE(v_item->>'quantity','1') || ' × R$ '
      || COALESCE(v_item->>'unit_price','0') || ' = R$ '
      || COALESCE(v_item->>'subtotal','0') || E'\n';
    v_idx := v_idx + 1;
  END LOOP;

  IF v_total < 5 THEN
    RETURN json_build_object('success', false, 'error', 'below_minimum');
  END IF;

  IF p_proof_photo_url IS NOT NULL THEN
    v_proof_taken_at := NOW();
  END IF;

  SELECT * INTO v_proposer FROM profiles WHERE id = auth.uid();
  SELECT COALESCE(full_name, email) INTO v_other_name FROM profiles WHERE id = v_other_party;
  SELECT title INTO v_opp_title FROM opportunities WHERE id = v_contract.opportunity_id;

  v_text :=
    'TERMO ADITIVO AO CONTRATO DE PRESTAÇÃO DE SERVIÇOS' || E'\n\n' ||
    'Contrato original: FLK-' || EXTRACT(YEAR FROM v_contract.created_at) || '-' || UPPER(LEFT(v_contract.id::TEXT, 8)) || E'\n' ||
    'Tipo de aditivo: ' || CASE WHEN p_addendum_type = 'extra_hours' THEN 'Horas extras' ELSE 'Serviço/Item extra' END || E'\n' ||
    'Serviço: ' || COALESCE(v_opp_title, '') || E'\n' ||
    'Data do aditivo: ' || TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') || E'\n\n' ||

    '1. PARTES' || E'\n' ||
    'Proponente (' || v_role || '): ' || COALESCE(v_proposer.full_name, '—') ||
    ' — CPF/CNPJ: ' || COALESCE(v_proposer.cpf_cnpj, '—') || E'\n' ||
    'Contraparte: ' || COALESCE(v_other_name, '—') || E'\n\n' ||

    '2. OBJETO DO ADITIVO' || E'\n' ||
    v_items_text || E'\n' ||

    '3. MOTIVO' || E'\n' ||
    COALESCE(p_reason, 'Não informado') || E'\n\n' ||

    '4. COMPROVAÇÃO' || E'\n' ||
    CASE
      WHEN p_proof_source = 'presencial_foto' THEN 'Foto-prova anexada pelo profissional, registrada em ' || TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
      WHEN p_proof_source = 'chat_message' THEN 'Solicitação registrada no chat oficial da plataforma'
      ELSE 'Sem prova adicional'
    END || E'\n\n' ||

    '5. VALOR ADICIONAL' || E'\n' ||
    'Valor total: R$ ' || TO_CHAR(v_total, 'FM999990.00') || E'\n' ||
    'Cobrado em adição ao valor original do contrato.' || E'\n\n' ||

    '6. RATIFICAÇÃO E ACEITE DIGITAL' || E'\n' ||
    'Permanecem inalteradas as demais cláusulas. Aceite eletrônico válido nos termos da MP 2.200-2/2001.' || E'\n\n' ||

    'Plataforma Freelaki | freelaqui.com.br';

  INSERT INTO contract_addendums (
    contract_id, opportunity_id, proposed_by, proposed_by_role,
    proposer_ip, proposer_user_agent,
    reason, items, total_amount,
    addendum_text, addendum_hash, status,
    addendum_type, proof_photo_url, proof_photo_taken_at, proof_source, chat_message_id
  ) VALUES (
    p_contract_id, v_contract.opportunity_id, auth.uid(), v_role,
    p_ip, p_user_agent,
    p_reason, p_items, v_total,
    v_text,
    encode(extensions.digest(v_text, 'sha256'::text), 'hex'),
    'pending',
    p_addendum_type, p_proof_photo_url, v_proof_taken_at, p_proof_source, p_chat_message_id
  ) RETURNING id INTO v_addendum_id;

  -- Notificar contraparte
  INSERT INTO notifications (profile_id, type, title, body, action_url)
  VALUES (
    v_other_party,
    'contrato',
    CASE WHEN p_addendum_type = 'extra_hours'
      THEN '⏱️ Solicitação de horas extras'
      ELSE '📑 Aditivo de serviço recebido'
    END,
    COALESCE(v_proposer.full_name, 'A outra parte') || ' propôs um aditivo de R$ ' ||
    TO_CHAR(v_total, 'FM999990.00') || '. Revise e aprove.',
    '/chamado/' || v_contract.opportunity_id
  );

  RETURN json_build_object('success', true, 'addendum_id', v_addendum_id, 'total', v_total);
END;
$function$;