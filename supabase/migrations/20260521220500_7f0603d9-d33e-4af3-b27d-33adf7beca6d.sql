-- Add deletion columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_reason text,
  ADD COLUMN IF NOT EXISTS deletion_feedback text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_deletion_scheduled
  ON public.profiles (deletion_scheduled_for)
  WHERE deletion_scheduled_for IS NOT NULL AND deleted_at IS NULL;

-- Request account deletion
CREATE OR REPLACE FUNCTION public.request_account_deletion(
  p_reason text,
  p_feedback text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_active_count int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'reason_required');
  END IF;

  -- Block deletion when there are active contracts
  SELECT COUNT(*) INTO v_active_count
  FROM public.contracts
  WHERE (client_id = v_uid OR professional_id = v_uid)
    AND status IN ('pending', 'accepted', 'in_progress', 'awaiting_signatures');

  IF v_active_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'has_active_contracts',
      'count', v_active_count
    );
  END IF;

  UPDATE public.profiles
  SET deletion_requested_at = now(),
      deletion_scheduled_for = now() + interval '15 days',
      deletion_reason = p_reason,
      deletion_feedback = NULLIF(trim(coalesce(p_feedback, '')), ''),
      updated_at = now()
  WHERE id = v_uid;

  RETURN jsonb_build_object(
    'success', true,
    'scheduled_for', (now() + interval '15 days')
  );
END;
$$;

-- Cancel account deletion (reactivate)
CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
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
  WHERE id = v_uid
    AND deleted_at IS NULL;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Helper
CREATE OR REPLACE FUNCTION public.is_account_pending_deletion(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
      AND deletion_requested_at IS NOT NULL
      AND deleted_at IS NULL
  );
$$;