UPDATE public.asaas_withdrawals 
SET status='failed', 
    error_message='Autorização externa recusada pelo Asaas - chave PIX em formato inválido' 
WHERE id='6d64ced5-b728-4da9-9bd7-c5e2aceb4c10';