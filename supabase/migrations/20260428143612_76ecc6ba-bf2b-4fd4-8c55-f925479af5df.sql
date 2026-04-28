UPDATE storage.buckets
SET public = true
WHERE id = 'share-files';

CREATE POLICY "Anyone can retrieve shared file metadata by code"
ON public.share_files
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can read cloud shared storage files"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'share-files');