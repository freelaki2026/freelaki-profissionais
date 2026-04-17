-- Function to handle a professional refusing to sign the contract
CREATE OR REPLACE FUNCTION public.refuse_contract(p_contract_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_contract contracts%ROWTYPE;
  v_opp opportunities%ROWTYPE;
  v_was_exclusive BOOLEAN;
  v_pro_name TEXT;
BEGIN
  SELECT * INTO v_contract FROM contracts WHERE id = p_contract_id;

  IF v_contract.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_contract.professional_id != auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  IF v_contract.status NOT IN ('pending', 'client_signed') THEN
    RETURN json_build_object('success', false, 'error', 'already_signed');
  END IF;

  SELECT * INTO v_opp FROM opportunities WHERE id = v_contract.opportunity_id;
  SELECT COALESCE(full_name, 'O profissional') INTO v_pro_name FROM profiles WHERE id = auth.uid();

  -- Determine whether this opportunity was originally exclusive (private targeted)
  -- We treat it as exclusive if there are NO applications recorded for it.
  v_was_exclusive := NOT EXISTS (
    SELECT 1 FROM opportunity_applications WHERE opportunity_id = v_opp.id
  );

  -- Cancel the contract
  UPDATE contracts SET
    status = 'cancelled',
    cancelled_by = 'professional',
    cancellation_reason = 'Profissional recusou assinar o contrato',
    cancelled_at = NOW()
  WHERE id = p_contract_id;

  IF v_was_exclusive THEN
    -- Exclusive opportunity: keep private but clear acceptance so client can pick another professional
    UPDATE opportunities SET
      status = 'open',
      accepted_by = NULL,
      accepted_at = NULL,
      target_professional_id = NULL,
      is_private = FALSE
    WHERE id = v_opp.id;

    INSERT INTO notifications (profile_id, type, title, body, action_url)
    VALUES (
      v_opp.client_id,
      'cliente',
      '😔 Profissional recusou assinar',
      v_pro_name || ' recusou assinar o contrato de "' || v_opp.title || '". Sua solicitação está aberta para outros profissionais.',
      '/chamado/' || v_opp.id
    );
  ELSE
    -- Public opportunity: mark this application as withdrawn, reopen for new candidates
    UPDATE opportunity_applications SET
      status = 'withdrawn',
      withdrawn_at = NOW()
    WHERE opportunity_id = v_opp.id
      AND professional_id = auth.uid();

    -- Restore other rejected applications back to pending so the client can re-pick
    UPDATE opportunity_applications SET
      status = 'pending'
    WHERE opportunity_id = v_opp.id
      AND status = 'rejected';

    UPDATE opportunities SET
      status = 'open',
      accepted_by = NULL,
      accepted_at = NULL,
      target_professional_id = NULL,
      is_private = FALSE
    WHERE id = v_opp.id;

    INSERT INTO notifications (profile_id, type, title, body, action_url)
    VALUES (
      v_opp.client_id,
      'cliente',
      '😔 Profissional recusou assinar',
      v_pro_name || ' recusou assinar o contrato de "' || v_opp.title || '". A vaga voltou a ficar aberta para outros profissionais.',
      '/chamado/' || v_opp.id
    );
  END IF;

  RETURN json_build_object('success', true, 'was_exclusive', v_was_exclusive);
END;
$function$;