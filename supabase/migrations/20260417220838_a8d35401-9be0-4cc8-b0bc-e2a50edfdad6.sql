ALTER TABLE public.opportunities
ADD COLUMN IF NOT EXISTS is_remote BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.opportunities.is_remote IS 'true = serviço home office (profissional pode pegar múltiplos em paralelo); false = presencial (lock de 1 contrato ativo por vez).';