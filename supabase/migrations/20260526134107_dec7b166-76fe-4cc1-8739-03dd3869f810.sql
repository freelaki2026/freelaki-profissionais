
-- 1. is_admin: usar o parâmetro _user_id corretamente (consulta profiles)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND user_type = 'admin'
  );
$$;

-- 2. Contracts: revogar acesso a colunas de token de assinatura
REVOKE SELECT (sign_token_client, sign_token_professional) ON public.contracts FROM anon, authenticated;
REVOKE INSERT (sign_token_client, sign_token_professional) ON public.contracts FROM anon, authenticated;
REVOKE UPDATE (sign_token_client, sign_token_professional) ON public.contracts FROM anon, authenticated;

-- 3. Withdrawals: remover INSERT/UPDATE diretos do cliente (passar a usar edge function)
DROP POLICY IF EXISTS withdrawals_insert_own ON public.asaas_withdrawals;
DROP POLICY IF EXISTS withdrawals_update_own ON public.asaas_withdrawals;
REVOKE INSERT, UPDATE, DELETE ON public.asaas_withdrawals FROM anon, authenticated;

-- 4. payment_transactions: política restritiva negando INSERT/UPDATE/DELETE de não-admin
DROP POLICY IF EXISTS pt_no_client_writes ON public.payment_transactions;
CREATE POLICY pt_no_client_writes ON public.payment_transactions
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (
  current_setting('request.jwt.claim.role', true) = 'service_role'
  OR ((auth.jwt() -> 'app_metadata') ->> 'user_type') = 'admin'
)
WITH CHECK (
  current_setting('request.jwt.claim.role', true) = 'service_role'
  OR ((auth.jwt() -> 'app_metadata') ->> 'user_type') = 'admin'
);

-- 5. Reviews: exigir autenticação para ler (evita enumeração de UUIDs por anônimos)
DROP POLICY IF EXISTS reviews_select_all ON public.reviews;
CREATE POLICY reviews_select_authenticated ON public.reviews
FOR SELECT
TO authenticated
USING (true);
