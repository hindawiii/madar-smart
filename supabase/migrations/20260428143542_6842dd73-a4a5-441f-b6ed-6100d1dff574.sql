ALTER TABLE public.vault_files
ADD COLUMN IF NOT EXISTS storage_path TEXT;

ALTER TABLE public.share_files
ADD COLUMN IF NOT EXISTS storage_path TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('vault-files', 'vault-files', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('share-files', 'share-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can view their own vault storage files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'vault-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own vault storage files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vault-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own vault storage files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'vault-files' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'vault-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own vault storage files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'vault-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own share storage files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'share-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own share storage files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'share-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own share storage files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'share-files' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'share-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own share storage files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'share-files' AND auth.uid()::text = (storage.foldername(name))[1]);