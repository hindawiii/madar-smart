ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS custom_tones TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS idx_profiles_custom_tones ON public.profiles USING GIN (custom_tones);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url, custom_tones)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url',
    ARRAY[]::TEXT[]
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_credits (user_id, credits, trials_used)
  VALUES (NEW.id, 3, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;