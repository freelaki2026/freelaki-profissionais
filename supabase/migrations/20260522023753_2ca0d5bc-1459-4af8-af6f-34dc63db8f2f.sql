
-- Persistent log table for account deletion requests (admin reporting/export).
-- Survives the eventual profile purge so admin can still see historical reasons.
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  user_email text,
  user_full_name text,
  reason text NOT NULL,
  feedback text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  scheduled_for timestamptz,
  cancelled_at timestamptz,
  purged_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_adr_profile ON public.account_deletion_requests(profile_id);
CREATE INDEX IF NOT EXISTS idx_adr_requested_at ON public.account_deletion_requests(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_adr_reason ON public.account_deletion_requests(reason);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "adr_admin_all" ON public.account_deletion_requests
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "adr_select_own" ON public.account_deletion_requests
  FOR SELECT USING (auth.uid() = profile_id);

-- Update RPC to also insert a log row
CREATE OR REPLACE FUNCTION public.request_account_deletion(p_reason text, p_feedback text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_active_count int;
  v_scheduled timestamptz;
  v_email text;
  v_name text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'reason_required');
  END IF;

  SELECT COUNT(*) INTO v_active_count
  FROM public.contracts
  WHERE (client_id = v_uid OR professional_id = v_uid)
    AND status IN ('pending', 'accepted', 'in_progress', 'awaiting_signatures');

  IF v_active_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'has_active_contracts', 'count', v_active_count);
  END IF;

  v_scheduled := now() + interval '15 days';

  UPDATE public.profiles
  SET deletion_requested_at = now(),
      deletion_scheduled_for = v_scheduled,
      deletion_reason = p_reason,
      deletion_feedback = NULLIF(trim(coalesce(p_feedback, '')), ''),
      updated_at = now()
  WHERE id = v_uid
  RETURNING email, full_name INTO v_email, v_name;

  INSERT INTO public.account_deletion_requests
    (profile_id, user_email, user_full_name, reason, feedback, scheduled_for)
  VALUES
    (v_uid, v_email, v_name, p_reason, NULLIF(trim(coalesce(p_feedback, '')), ''), v_scheduled);

  RETURN jsonb_build_object('success', true, 'scheduled_for', v_scheduled);
END;
$function$;

-- Update cancel RPC to mark log row as cancelled, if it exists
CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  UPDATE public.profiles
  SET deletion_requested_at = NULL,
      deletion_scheduled_for = NULL,
      deletion_reason = NULL,
      deletion_feedback = NULL,
      updated_at = now()
  WHERE id = v_uid;

  UPDATE public.account_deletion_requests
  SET cancelled_at = now()
  WHERE profile_id = v_uid AND cancelled_at IS NULL AND purged_at IS NULL;

  RETURN jsonb_build_object('success', true);
END;
$function$;
