-- Reverter earnings que foram marcados como 'withdrawn' mas o saque não foi efetivado no Asaas
-- A tabela asaas_withdrawals está vazia para esses registros, indicando que o saque falhou
UPDATE public.earnings
SET status = 'available',
    withdrawn_at = NULL,
    asaas_transfer_id = NULL,
    transfer_status = 'PENDING',
    updated_at = NOW()
WHERE profile_id = '7a18cf04-d9d7-4ac8-9a60-a312b2aeca2c'
  AND status = 'withdrawn'
  AND id IN (
    '69b1e9ac-1b74-4e81-ad3e-a1ab7b41290b',
    'bb7387f2-a2e3-4a3b-99c8-ab1c9f197bf2'
  );