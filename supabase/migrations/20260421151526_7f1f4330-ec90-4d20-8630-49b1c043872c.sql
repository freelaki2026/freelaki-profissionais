-- Reverter earnings que foram marcados withdrawn mas o saque foi recusado pelo Asaas
UPDATE public.earnings
SET status = 'available', withdrawn_at = NULL
WHERE id IN ('69b1e9ac-1b74-4e81-ad3e-a1ab7b41290b', 'bb7387f2-a2e3-4a3b-99c8-ab1c9f197bf2');