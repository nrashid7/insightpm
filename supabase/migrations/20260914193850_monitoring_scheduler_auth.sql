CREATE OR REPLACE FUNCTION public.verify_monitoring_token(p_token text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT length(COALESCE(p_token,'')) >= 32 AND EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name='insightpm_monitoring_token'
      AND extensions.digest(decrypted_secret,'sha256') = extensions.digest(p_token,'sha256')
  );
$$;
REVOKE ALL ON FUNCTION public.verify_monitoring_token(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.verify_monitoring_token(text) TO service_role;
