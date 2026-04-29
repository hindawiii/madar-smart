CREATE INDEX IF NOT EXISTS idx_share_files_retrieval_code_expires_at
ON public.share_files (retrieval_code, expires_at);

DROP POLICY IF EXISTS "Authenticated users can retrieve non-expired shared files by code" ON public.share_files;

CREATE POLICY "Authenticated users can retrieve non-expired shared files by code"
ON public.share_files
FOR SELECT
TO authenticated
USING (
  retrieval_code IS NOT NULL
  AND (expires_at IS NULL OR expires_at > now())
);