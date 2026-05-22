CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    ((auth.jwt() -> 'app_metadata') ->> 'user_type') = 'admin',
    false
  );
$function$;