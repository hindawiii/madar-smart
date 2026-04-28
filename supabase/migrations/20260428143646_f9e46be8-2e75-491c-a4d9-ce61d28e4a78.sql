DROP POLICY IF EXISTS "Anyone can retrieve shared file metadata by code" ON public.share_files;

CREATE OR REPLACE FUNCTION public.get_shared_file_by_code(_code TEXT)
RETURNS TABLE (
  file_name TEXT,
  file_size BIGINT,
  file_type TEXT,
  metadata JSONB,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sf.file_name, sf.file_size, sf.file_type, sf.metadata, sf.expires_at
  FROM public.share_files sf
  WHERE sf.retrieval_code = _code
    AND (sf.expires_at IS NULL OR sf.expires_at > now())
  ORDER BY sf.created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_file_by_code(TEXT) TO anon, authenticated;