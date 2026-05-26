UPDATE storage.buckets
SET file_size_limit = 157286400,
    allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif','video/mp4','video/quicktime','video/webm','video/x-m4v']
WHERE id = 'portfolio';