REVOKE EXECUTE ON FUNCTION public.get_shared_file_by_code(TEXT) FROM anon, authenticated;
DROP POLICY IF EXISTS "Anyone with a valid share code can read cloud shared files" ON storage.objects;