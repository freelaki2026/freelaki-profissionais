
-- Trigger to prevent user_type changes by non-service-role callers
CREATE OR REPLACE FUNCTION public.prevent_user_type_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_type IS DISTINCT FROM OLD.user_type THEN
    IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
       AND auth.role() IS DISTINCT FROM 'service_role' THEN
      RAISE EXCEPTION 'Not allowed to change user_type';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_user_type_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_user_type_escalation_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_user_type_escalation();
