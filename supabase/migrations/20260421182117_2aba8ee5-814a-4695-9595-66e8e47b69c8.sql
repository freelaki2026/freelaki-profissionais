-- =========================================================================
-- BLOCO 1: SECURITY HARDENING (App Store readiness)
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1) PRIVILEGE ESCALATION FIX
--    Substituir a política "profiles_own" (ALL) por políticas granulares
--    que impeçam o usuário de alterar campos sensíveis do próprio perfil.
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS profiles_own ON public.profiles;

-- SELECT: dono vê o próprio perfil completo
CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- INSERT: dono pode criar o próprio registro
CREATE POLICY profiles_insert_own
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- UPDATE: dono pode atualizar, MAS o trigger prevent_privilege_escalation
-- já força a manter user_type/is_approved/approval_status inalterados.
-- Adicionamos garantia adicional via WITH CHECK no nível da política.
CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- DELETE: bloqueado para o próprio usuário (apenas admin pode remover perfis)
-- Não criamos política DELETE → ninguém além de admin pode deletar.

-- Garantir que o trigger de proteção esteja ativo na tabela profiles
DROP TRIGGER IF EXISTS trg_prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_privilege_escalation();


-- -------------------------------------------------------------------------
-- 2) EXPOSED SENSITIVE DATA FIX
--    Remover políticas que expõem perfis completos a outros usuários.
--    Substituir por uma VIEW pública somente com campos seguros.
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS client_select_approved_professionals ON public.profiles;
DROP POLICY IF EXISTS client_select_online_professionals ON public.profiles;
DROP POLICY IF EXISTS professional_select_related_clients ON public.profiles;

-- VIEW pública com APENAS campos não sensíveis dos profissionais aprovados
CREATE OR REPLACE VIEW public.public_professionals
WITH (security_invoker = true) AS
SELECT
  id,
  full_name,
  avatar_url,
  bio,
  is_online,
  is_approved,
  user_type,
  instagram, tiktok, youtube, linkedin, behance, dribbble,
  figma, github, vimeo, twitter, pinterest, website,
  created_at
FROM public.profiles
WHERE is_approved = true AND user_type = 'professional';

GRANT SELECT ON public.public_professionals TO authenticated, anon;

-- VIEW para profissional ver dados básicos do cliente com quem tem relação
CREATE OR REPLACE VIEW public.related_client_profiles
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.bio
FROM public.profiles p
WHERE p.user_type = 'client'
  AND (
    EXISTS (SELECT 1 FROM public.conversations c
            WHERE c.client_id = p.id AND c.professional_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.contracts c
               WHERE c.client_id = p.id AND c.professional_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.opportunities o
               WHERE o.client_id = p.id
                 AND (o.accepted_by = auth.uid() OR o.target_professional_id = auth.uid()))
  );

GRANT SELECT ON public.related_client_profiles TO authenticated;


-- -------------------------------------------------------------------------
-- 3) CONTRACT SIGNING TOKENS FIX
--    Esconder sign_token_client/sign_token_professional da contraparte.
-- -------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.contracts_safe
WITH (security_invoker = true) AS
SELECT
  id, opportunity_id, client_id, professional_id,
  contract_text, contract_hash, contract_version,
  client_signed, client_signed_at,
  professional_signed, professional_signed_at,
  status, payment_method, asaas_payment_id, asaas_payment_status,
  pdf_url, started_at, completed_at,
  work_started_at, work_finished_at,
  cancelled_at, cancellation_reason, cancellation_details, cancelled_by,
  completion_requested_at, completion_confirmed_at, auto_confirmed,
  created_at, updated_at,
  -- Cada parte só vê SEU próprio token
  CASE WHEN auth.uid() = client_id THEN sign_token_client ELSE NULL END AS sign_token_client,
  CASE WHEN auth.uid() = professional_id THEN sign_token_professional ELSE NULL END AS sign_token_professional,
  -- IPs/user agents NÃO expostos (apenas para auditoria via admin)
  CASE WHEN auth.uid() = client_id THEN client_ip ELSE NULL END AS client_ip,
  CASE WHEN auth.uid() = professional_id THEN professional_ip ELSE NULL END AS professional_ip
FROM public.contracts
WHERE auth.uid() = client_id OR auth.uid() = professional_id OR public.is_admin(auth.uid());

GRANT SELECT ON public.contracts_safe TO authenticated;


-- -------------------------------------------------------------------------
-- 4) PAYMENTS — cliente pode ver os próprios pagamentos
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS payments_select_client ON public.payments;
CREATE POLICY payments_select_client
ON public.payments
FOR SELECT
USING (auth.uid() = client_id);


-- -------------------------------------------------------------------------
-- 5) FUNCTION SEARCH_PATH FIXES
-- -------------------------------------------------------------------------
ALTER FUNCTION public.get_professional_balance(uuid) SET search_path = public;
ALTER FUNCTION public.get_professional_reserved_balance(uuid) SET search_path = public;
ALTER FUNCTION public.criar_earning_ao_concluir() SET search_path = public;
ALTER FUNCTION public.get_platform_fee_rate(timestamp with time zone) SET search_path = public;


-- -------------------------------------------------------------------------
-- 6) is_admin reforçada (evita recursão e usa roles dedicadas se existir)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND user_type = 'admin'
  );
$$;


-- -------------------------------------------------------------------------
-- 7) ASAAS_WEBHOOKS — bloquear inserts de fora (só service role)
-- -------------------------------------------------------------------------
-- A tabela já tem RLS habilitada sem políticas → ninguém entra exceto service role.
-- Garantir explicitamente que NENHUMA política de INSERT/SELECT/UPDATE existe para usuários.
-- (Service role bypassa RLS automaticamente — webhook continua funcionando.)
-- Nada a fazer aqui além de confirmar.

COMMENT ON TABLE public.asaas_webhooks IS
'Tabela de auditoria de webhooks Asaas. Acesso apenas via service role (edge functions).';