CREATE OR REPLACE FUNCTION public.get_shared_file_by_code(_code TEXT)
RETURNS TABLE (
  file_name TEXT,
  file_size BIGINT,
  file_type TEXT,
  metadata JSONB,
  expires_at TIMESTAMPTZ,
  storage_path TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sf.file_name, sf.file_size, sf.file_type, sf.metadata, sf.expires_at, sf.storage_path
  FROM public.share_files sf
  WHERE sf.retrieval_code = _code
    AND (sf.expires_at IS NULL OR sf.expires_at > now())
  ORDER BY sf.created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_file_by_code(TEXT) TO anon, authenticated;

CREATE POLICY "Anyone with a valid share code can read cloud shared files"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'share-files'
  AND EXISTS (
    SELECT 1
    FROM public.share_files sf
    WHERE sf.storage_path = storage.objects.name
      AND (sf.expires_at IS NULL OR sf.expires_at > now())
  )
);