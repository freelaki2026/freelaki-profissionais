CREATE OR REPLACE FUNCTION public.generate_contract(p_opportunity_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_opp         opportunities%ROWTYPE;
  v_client      profiles%ROWTYPE;
  v_pro         profiles%ROWTYPE;
  v_cat         categories%ROWTYPE;
  v_contract_id UUID;
  v_contract_text TEXT;
  v_date        TEXT;
  v_fee_rate    NUMERIC;
  v_fee_pct     TEXT;
  v_platform_fee NUMERIC;
  v_total_amount NUMERIC;
BEGIN
  SELECT * INTO v_opp FROM opportunities WHERE id = p_opportunity_id;
  SELECT * INTO v_client FROM profiles WHERE id = v_opp.client_id;
  SELECT * INTO v_pro FROM profiles WHERE id = v_opp.accepted_by;
  SELECT * INTO v_cat FROM categories WHERE id = v_opp.category_id;

  v_fee_rate := public.get_platform_fee_rate();
  v_fee_pct := TRIM(TRAILING '0' FROM TRIM(TRAILING '0' FROM TO_CHAR(v_fee_rate * 100, 'FM999990.99'))) || '%';
  v_platform_fee := COALESCE(v_opp.budget, 0) * v_fee_rate;
  v_total_amount := COALESCE(v_opp.budget, 0) + v_platform_fee;

  -- Update opportunity with calculated values
  UPDATE opportunities
  SET platform_fee = v_platform_fee,
      total_amount = v_total_amount
  WHERE id = p_opportunity_id;

  v_date := TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY');

  v_contract_text :=
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS' || E'\n\n' ||
    'Data de emissão: ' || v_date || E'\n' ||
    'Código: FLK-' || EXTRACT(YEAR FROM NOW()) || '-' || UPPER(LEFT(p_opportunity_id::TEXT, 8)) || E'\n\n' ||

    '1. PARTES' || E'\n' ||
    'CONTRATANTE: ' || COALESCE(v_client.full_name, 'Não informado') ||
    ', CPF/CNPJ: ' || COALESCE(v_client.cpf_cnpj, 'Não informado') ||
    ', Email: ' || COALESCE(v_client.email, 'Não informado') ||
    ', Telefone: ' || COALESCE(v_client.phone, 'Não informado') || E'\n\n' ||

    'CONTRATADO: ' || COALESCE(v_pro.full_name, 'Não informado') ||
    ', CPF/CNPJ: ' || COALESCE(v_pro.cpf_cnpj, 'Não informado') ||
    ', Email: ' || COALESCE(v_pro.email, 'Não informado') ||
    ', Telefone: ' || COALESCE(v_pro.phone, 'Não informado') || E'\n\n' ||

    '2. OBJETO DO CONTRATO' || E'\n' ||
    'Serviço: ' || COALESCE(v_opp.title, '') || E'\n' ||
    'Categoria: ' || COALESCE(v_cat.name, '') || E'\n' ||
    'Descrição: ' || COALESCE(v_opp.description, 'Não informado') || E'\n' ||
    'Local: ' || COALESCE(v_opp.location_address, 'Não informado') || E'\n' ||
    'Data/Hora: ' || COALESCE(TO_CHAR(v_opp.scheduled_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY às HH24:MI'), 'A combinar') || E'\n' ||
    'Duração: ' || COALESCE(v_opp.duration_hours::TEXT || ' horas', 'A combinar') || E'\n\n' ||

    '3. VALORES' || E'\n' ||
    'Subtotal do serviço: R$ ' || COALESCE(v_opp.budget::TEXT, '0,00') || E'\n' ||
    'Taxa da plataforma (' || v_fee_pct || '): R$ ' || v_platform_fee::TEXT || E'\n' ||
    'VALOR TOTAL: R$ ' || v_total_amount::TEXT || E'\n\n' ||

    '4. CONDIÇÕES DE PAGAMENTO' || E'\n' ||
    'O pagamento será processado pela plataforma Freelaki após confirmação do início do serviço pelo contratante. ' ||
    'O valor será liberado ao contratado após conclusão confirmada por ambas as partes.' || E'\n\n' ||

    '5. OBRIGAÇÕES DO CONTRATADO' || E'\n' ||
    'a) Realizar o serviço conforme descrito neste contrato;' || E'\n' ||
    'b) Comparecer no local, data e horário acordados;' || E'\n' ||
    'c) Manter conduta profissional durante a prestação do serviço;' || E'\n' ||
    'd) Entregar os materiais/entregáveis acordados no prazo combinado.' || E'\n\n' ||

    '6. OBRIGAÇÕES DO CONTRATANTE' || E'\n' ||
    'a) Realizar o pagamento conforme condições estabelecidas;' || E'\n' ||
    'b) Fornecer as condições necessárias para a execução do serviço;' || E'\n' ||
    'c) Confirmar o início e conclusão do serviço na plataforma.' || E'\n\n' ||

    '7. CANCELAMENTO E PENALIDADES' || E'\n' ||
    'Cancelamentos após assinatura de ambas as partes poderão resultar em penalidades ' ||
    'conforme os Termos de Uso da plataforma Freelaki disponíveis em freelaqui.com.br/termos.' || E'\n\n' ||

    '8. PROPRIEDADE INTELECTUAL' || E'\n' ||
    'Os materiais produzidos durante a prestação do serviço serão de propriedade do contratante ' ||
    'após liberação integral do pagamento ao contratado.' || E'\n\n' ||

    '9. FORO' || E'\n' ||
    'As partes elegem o foro da comarca de São Paulo/SP para dirimir quaisquer controvérsias ' ||
    'oriundas deste contrato, com renúncia a qualquer outro.' || E'\n\n' ||

    '10. ACEITE DIGITAL' || E'\n' ||
    'Este contrato foi gerado automaticamente pela plataforma Freelaki. ' ||
    'A assinatura digital das partes, registrada com data, hora, endereço IP e ' ||
    'confirmação por email, possui validade como manifestação de vontade nos termos ' ||
    'do Art. 107 do Código Civil Brasileiro e da MP 2.200-2/2001.' || E'\n\n' ||

    'Plataforma Freelaki | freelaqui.com.br | suporte@freelaqui.com.br';

  INSERT INTO contracts (
    opportunity_id, client_id, professional_id,
    contract_text, status, contract_version,
    contract_hash
  ) VALUES (
    p_opportunity_id,
    v_opp.client_id,
    v_opp.accepted_by,
    v_contract_text,
    'pending',
    '1.0',
    encode(extensions.digest(v_contract_text, 'sha256'::text), 'hex')
  )
  ON CONFLICT (opportunity_id)
  DO UPDATE SET
    contract_text = EXCLUDED.contract_text,
    contract_hash = EXCLUDED.contract_hash
  RETURNING id INTO v_contract_id;

  RETURN v_contract_id;
END;
$function$;