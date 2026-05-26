
-- 1) Lock down sensitive payment columns from authenticated role (only admin/service_role read)
REVOKE SELECT (pix_qr_code, pix_qr_code_url, pix_transaction_id, stripe_checkout_session_id, stripe_charge_id, stripe_payment_intent_id)
  ON public.payment_transactions FROM anon, authenticated;

-- 2) Reinforce sign_token REVOKE on contracts (admin role is still 'authenticated' under the hood)
REVOKE SELECT (sign_token_client, sign_token_professional) ON public.contracts FROM anon, authenticated;
REVOKE INSERT (sign_token_client, sign_token_professional) ON public.contracts FROM anon, authenticated;
REVOKE UPDATE (sign_token_client, sign_token_professional) ON public.contracts FROM anon, authenticated;

-- 3) Harden payment_transactions write restriction (remove unreliable GUC, rely on admin JWT only; service_role bypasses RLS natively)
DROP POLICY IF EXISTS pt_no_client_writes ON public.payment_transactions;
CREATE POLICY pt_no_client_writes ON public.payment_transactions
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (((auth.jwt() -> 'app_metadata') ->> 'user_type') = 'admin')
  WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'user_type') = 'admin');
