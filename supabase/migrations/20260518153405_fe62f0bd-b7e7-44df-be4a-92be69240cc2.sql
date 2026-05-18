
DROP POLICY IF EXISTS "Authenticated can upload branding" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update branding" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete branding" ON storage.objects;

CREATE POLICY "Admins can upload branding"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'branding'
  AND (((auth.jwt() -> 'app_metadata'::text) ->> 'user_type'::text) = 'admin'::text)
);

CREATE POLICY "Admins can update branding"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'branding'
  AND (((auth.jwt() -> 'app_metadata'::text) ->> 'user_type'::text) = 'admin'::text)
)
WITH CHECK (
  bucket_id = 'branding'
  AND (((auth.jwt() -> 'app_metadata'::text) ->> 'user_type'::text) = 'admin'::text)
);

CREATE POLICY "Admins can delete branding"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'branding'
  AND (((auth.jwt() -> 'app_metadata'::text) ->> 'user_type'::text) = 'admin'::text)
);
