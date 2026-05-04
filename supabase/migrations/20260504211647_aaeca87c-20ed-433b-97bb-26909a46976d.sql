ALTER TABLE public.portfolio_photos
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS duration_seconds numeric;