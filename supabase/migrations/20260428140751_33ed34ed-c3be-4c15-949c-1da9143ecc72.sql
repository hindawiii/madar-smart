CREATE TABLE IF NOT EXISTS public.vault_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  thumbnail TEXT,
  hidden BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vault_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own vault files"
ON public.vault_files
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vault files"
ON public.vault_files
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vault files"
ON public.vault_files
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vault files"
ON public.vault_files
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_vault_files_user_id ON public.vault_files(user_id);

CREATE TRIGGER update_vault_files_updated_at
BEFORE UPDATE ON public.vault_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();