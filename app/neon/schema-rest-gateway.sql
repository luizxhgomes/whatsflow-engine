-- Gateway PostgREST 16.5, execução autorizada pelo Luiz em 2026-11-10.
-- Aplicado em 2026-11-10 na branch de teste e em production, após prova isolada.
-- PostgreSQL 18.6: 43 tabelas com RLS, 44 relações e 25 RPCs preservadas.
-- Credencial configurada separadamente em memória, nunca neste arquivo.
-- Provas: TLSv1.3/verify-full; login/anon sem dados; serviço autorizado.
-- Arquivo independente: não faz parte de infra/migrate-neon.mjs.
-- O padrão é ROLLBACK. Somente após aval, ensaio isolado e revisão,
-- a execução aprovada poderá encerrar a transação com COMMIT.
-- Não cria senha, não altera authenticator do Neon e não concede acesso público.
--
-- Configuração proposta para Gage, com valores injetados em memória:
-- PGRST_DB_URI = postgresql://whatsflow_rest@${NEON_DIRECT_HOST}:5432/neondb?sslmode=verify-full
-- PGSSLROOTCERT = ${SYSTEM_CA_BUNDLE_PATH}  (arquivo CA montado e legível no container)
-- PGPASSWORD = ${WHATSFLOW_POSTGREST_PASSWORD}  (segredo canônico, via fluxo chaves)
-- PGRST_JWT_SECRET = ${NEON_DATA_API_PUBLIC_JWK}  (JSON inline, somente chave pública)
-- PGRST_JWT_SECRET_IS_BASE64 = false
-- PGRST_JWT_AUD = whatsflow-data
-- PGRST_JWT_ROLE_CLAIM_KEY = $.role  (variável de ambiente, não interpolar no shell)
-- PGRST_DB_ANON_ROLE = anon
-- PGRST_DB_SCHEMAS = public
-- PGRST_DB_EXTRA_SEARCH_PATH = public,extensions
-- PGRST_DB_CONFIG = false
-- PGRST_DB_POOL = 5
-- PGRST_DB_CHANNEL_ENABLED = false
-- PGRST_DB_POOL_MAX_IDLETIME = 30
-- Com LISTEN desativado, reiniciar o gateway após mudanças de schema.
-- PGRST_DB_MAX_ROWS = 1000
-- PGRST_DB_AGGREGATES_ENABLED = true  (compatibilidade com a Data API atual)
-- PGRST_DB_PLAN_ENABLED = false
-- PGRST_OPENAPI_MODE = disabled
-- PGRST_LOG_LEVEL = error
-- PGRST_LOG_QUERY = false
-- Listener HTTP somente na rede privada do proxy TLS; sem porta pública direta.
-- O proxy não deve armazenar respostas nem registrar Authorization/cookies.
-- A fachada mantém suas queries; somente a URL muda após os testes aprovados.
--
-- Fontes:
-- https://github.com/PostgREST/postgrest/releases/tag/v16.5
-- https://docs.postgrest.org/en/stable/references/auth.html
-- https://docs.postgrest.org/en/stable/references/configuration.html
-- https://www.postgresql.org/docs/18/sql-grant.html
-- https://www.postgresql.org/docs/18/libpq-ssl.html

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $preflight$
BEGIN
  IF current_database() <> 'neondb'
     OR current_setting('server_version_num')::integer < 180000 THEN
    RAISE EXCEPTION 'Gateway proposal requires the reviewed neondb PostgreSQL 18 database';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'whatsflow_rest') THEN
    RAISE EXCEPTION 'whatsflow_rest already exists; inspect it instead of altering its credentials or grants';
  END IF;
  IF (SELECT count(*) FROM pg_roles
      WHERE rolname IN ('service_role', 'anon')
        AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls
        AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication) <> 2 THEN
    RAISE EXCEPTION 'Expected restricted service_role and anon roles';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member
    WHERE r.rolname IN ('service_role', 'anon')
  ) THEN
    RAISE EXCEPTION 'Unexpected inherited role path; review before granting SET';
  END IF;
  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity) <> 43
     OR EXISTS (
       SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
     ) THEN
    RAISE EXCEPTION 'Expected all 43 reviewed public tables protected by RLS';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND roles && ARRAY['public', 'anon', 'anonymous', 'authenticated']::name[]
  ) OR EXISTS (
    SELECT 1 FROM pg_roles r
    WHERE r.rolname IN ('anon', 'anonymous', 'authenticated')
      AND has_schema_privilege(r.oid, 'public', 'USAGE,CREATE')
  ) THEN
    RAISE EXCEPTION 'Public access has drifted; restore the reviewed baseline before provisioning';
  END IF;
END;
$preflight$;

CREATE ROLE whatsflow_rest LOGIN NOINHERIT NOSUPERUSER NOCREATEDB
  NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 8 PASSWORD NULL;

-- NOINHERIT alone is not enough for an existing membership on PostgreSQL 18.
-- SET is explicit; the gateway cannot administer or automatically inherit roles.
GRANT service_role, anon TO whatsflow_rest
  WITH ADMIN FALSE, INHERIT FALSE, SET TRUE;

-- No table, function, sequence or schema grants are added. Existing RLS/RPCs stay.
-- CONNECT/TEMP already come from PUBLIC in the reviewed database; they do not
-- grant access to public schema data. This proposal does not change global ACLs.
-- Readback must show exactly two memberships, both SET=true/INHERIT=false/ADMIN=false.
SELECT parent.rolname AS granted_role, child.rolname AS member,
       m.admin_option, m.inherit_option, m.set_option
FROM pg_auth_members m
JOIN pg_roles parent ON parent.oid = m.roleid
JOIN pg_roles child ON child.oid = m.member
WHERE child.rolname = 'whatsflow_rest'
ORDER BY parent.rolname;

-- Before COMMIT, any failure and this default end restore the original state.
ROLLBACK;
-- After an approved deployment, reversal preserves the role and all data:
-- restore the previous application endpoint and stop the gateway; then, only
-- under a separate approved transaction, disable LOGIN and revoke its two
-- memberships. Do not DROP roles, tables or the managed Neon Data API.
