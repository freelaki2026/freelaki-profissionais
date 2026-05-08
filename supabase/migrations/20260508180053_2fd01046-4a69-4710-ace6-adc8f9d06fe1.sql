-- Bucket público para assets de marca (vídeo de splash, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Leitura pública
DROP POLICY IF EXISTS "Branding assets are publicly readable" ON storage.objects;
CREATE POLICY "Branding assets are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

-- Escrita apenas por usuários autenticados (precaução)
DROP POLICY IF EXISTS "Authenticated can upload branding" ON storage.objects;
CREATE POLICY "Authenticated can upload branding"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'branding');

DROP POLICY IF EXISTS "Authenticated can update branding" ON storage.objects;
CREATE POLICY "Authenticated can update branding"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "Authenticated can delete branding" ON storage.objects;
CREATE POLICY "Authenticated can delete branding"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'branding');