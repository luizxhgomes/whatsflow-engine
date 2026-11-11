-- Repeat after enabling the Data API, which creates authenticator.
-- Only the backend receives service_role JWTs; public API roles have no access.
REVOKE ALL ON SCHEMA public, extensions FROM PUBLIC, anon, anonymous, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, anonymous, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, anonymous, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, anonymous, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, anonymous, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, anonymous, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, anonymous, authenticated;

GRANT USAGE ON SCHEMA public, extensions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

DO $$
DECLARE
  item record;
BEGIN
  -- Remove the imported anonymous policies as well as their grants.
  FOR item IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND roles && ARRAY['public', 'anon', 'anonymous', 'authenticated']::name[]
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', item.policyname, item.tablename);
  END LOOP;
  FOR item IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', item.tablename);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public'
        AND tablename = item.tablename AND policyname = 'whatsflow_service_access'
    ) THEN
      EXECUTE format(
        'CREATE POLICY whatsflow_service_access ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        item.tablename
      );
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    GRANT service_role TO authenticator WITH INHERIT FALSE, SET TRUE;
  END IF;
END;
$$;

-- Both imported RPCs use pgvector operators, which live in extensions.
ALTER FUNCTION public.search_embeddings(extensions.vector, double precision, integer, uuid)
  SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.search_embeddings(extensions.vector, uuid, integer, double precision, integer)
  SET search_path = public, extensions, pg_temp;
