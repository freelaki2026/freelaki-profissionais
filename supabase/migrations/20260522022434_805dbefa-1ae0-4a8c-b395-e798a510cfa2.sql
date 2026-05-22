ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS identity_doc_type text
CHECK (identity_doc_type IN ('rg','cnh','passaporte'));