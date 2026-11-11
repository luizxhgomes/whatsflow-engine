-- Provision Neon Data API before this schema; Neon owns anonymous/authenticated.
-- Run only through infra/migrate-neon.mjs, inside its transaction.
-- Rollback before COMMIT restores all bootstrap and migration changes.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

DO $$
DECLARE
  role_name text;
BEGIN
  IF (SELECT count(*) FROM pg_roles WHERE rolname IN ('anonymous', 'authenticated')) <> 2 THEN
    RAISE EXCEPTION 'Provision Neon Data API before migrating: anonymous/authenticated roles are required';
  END IF;
  FOREACH role_name IN ARRAY ARRAY['anon', 'service_role'] LOOP
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
