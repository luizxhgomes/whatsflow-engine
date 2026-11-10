-- Run only through infra/migrate-neon.mjs, inside its transaction.
-- Rollback before COMMIT restores all bootstrap and migration changes.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

DO $$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'anonymous', 'authenticated', 'service_role'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN', role_name);
    END IF;
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'service_role' AND (rolcanlogin OR rolbypassrls OR rolsuper)
  ) THEN
    RAISE EXCEPTION 'service_role must be NOLOGIN, NOSUPERUSER and NOBYPASSRLS';
  END IF;
END;
$$;
