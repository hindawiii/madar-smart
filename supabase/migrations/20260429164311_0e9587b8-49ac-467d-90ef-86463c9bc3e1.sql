DROP POLICY IF EXISTS "Authenticated users can read shared storage objects" ON storage.objects;

CREATE POLICY "Authenticated users can read shared storage objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'share-files');