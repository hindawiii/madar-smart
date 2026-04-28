DROP POLICY IF EXISTS "Anyone can read cloud shared storage files" ON storage.objects;

UPDATE storage.buckets
SET public = false
WHERE id = 'share-files';