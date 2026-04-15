ALTER TABLE public.withdrawals
ADD COLUMN IF NOT EXISTS asaas_transfer_id text,
ADD COLUMN IF NOT EXISTS pix_receipt_url text;