-- Restrict access to contract signing tokens.
-- Each party should not be able to read the other's signing token.
-- Revoke column-level SELECT on the token columns from client roles; only
-- service_role (used by edge functions / admin server-side flows) keeps access.
REVOKE SELECT (sign_token_client, sign_token_professional) ON public.contracts FROM anon, authenticated;