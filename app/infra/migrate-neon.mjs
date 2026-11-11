import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import pg from 'pg';

const app = fileURLToPath(new URL('../', import.meta.url));
const publicationTables = {
  '00000000000000_init.sql': [
    'campaigns', 'campaign_contacts', 'inbox_conversations', 'inbox_messages',
    'contacts', 'templates', 'flows', 'account_alerts', 'template_project_items',
    'template_projects', 'flow_submissions',
  ],
  '20260319000004_add_webhook_events_and_template_quality.sql': ['public.webhook_events'],
};
const digest = (sql) => createHash('sha256').update(sql).digest('hex');

export function adaptMigration(name, sql) {
  const expected = publicationTables[name] ?? [];
  const removed = [];
  // Only these known, single-line Supabase publications are omitted. PostgreSQL parses all SQL.
  const adapted = sql.replace(/^ALTER PUBLICATION supabase_realtime ADD TABLE ([a-z_.]+);\r?$/gm,
    (statement, table) => {
      removed.push(table);
      return '-- Neon: Supabase Realtime publication omitted; UI uses authenticated polling.';
    });
  if (JSON.stringify(removed) !== JSON.stringify(expected) || /ALTER PUBLICATION supabase_realtime/.test(adapted)) {
    throw new Error(`Unexpected Supabase publication in ${name}`);
  }
  return adapted;
}

export function directConnection(connectionString) {
  let url;
  try { url = new URL(connectionString); } catch { throw new Error('A direct DATABASE_URL_UNPOOLED is required'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname.includes('-pooler.')) {
    throw new Error('Migrations require a direct PostgreSQL connection');
  }
  url.searchParams.set('sslmode', 'verify-full');
  return url.toString();
}

export async function migrateNeon({ connectionString = process.env.DATABASE_URL_UNPOOLED, dryRun = false } = {}) {
  const client = new pg.Client({ connectionString: directConnection(connectionString), connectionTimeoutMillis: 15000 });
  const applied = [];
  const skipped = [];
  let step = 'connection';
  try {
    await client.connect();
    await client.query('BEGIN');
    await client.query(`SET LOCAL lock_timeout = '5s'; SET LOCAL statement_timeout = '60s'; SET LOCAL search_path = public, extensions`);
    const lock = await client.query("SELECT pg_try_advisory_xact_lock(hashtext('whatsflow:neon:migrate')) AS locked");
    if (!lock.rows[0].locked) throw Object.assign(new Error('Another migration is running'), { code: 'MIGRATION_LOCKED' });
    step = 'migration ledger';
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS whatsflow_migrations;
      REVOKE ALL ON SCHEMA whatsflow_migrations FROM PUBLIC;
      CREATE TABLE IF NOT EXISTS whatsflow_migrations.history (
        name text PRIMARY KEY,
        source_sha256 text NOT NULL,
        applied_sha256 text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
      REVOKE ALL ON ALL TABLES IN SCHEMA whatsflow_migrations FROM PUBLIC;
    `);
    const record = async (name, source, sql) => client.query(`
      INSERT INTO whatsflow_migrations.history (name, source_sha256, applied_sha256)
      VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE
      SET source_sha256 = EXCLUDED.source_sha256, applied_sha256 = EXCLUDED.applied_sha256, applied_at = now()
    `, [name, digest(source), digest(sql)]);
    const repeat = async (name) => {
      step = name;
      const sql = await readFile(resolve(app, name), 'utf8');
      await client.query(sql);
      await record(name, sql, sql);
    };
    await repeat('neon/schema-bootstrap.sql');
    const files = (await readdir(resolve(app, 'supabase/migrations')))
      .filter((name) => /^\d{14}_.+\.sql$/.test(name)).sort();
    if (!files.length) throw new Error('No migrations found');
    for (const name of files) {
      step = name;
      const source = await readFile(resolve(app, 'supabase/migrations', name), 'utf8');
      const sql = adaptMigration(name, source);
      const { rows } = await client.query('SELECT source_sha256, applied_sha256 FROM whatsflow_migrations.history WHERE name = $1', [name]);
      if (rows.length) {
        if (rows[0].source_sha256 !== digest(source) || rows[0].applied_sha256 !== digest(sql)) {
          throw Object.assign(new Error('Applied migration checksum differs'), { code: 'MIGRATION_CHECKSUM_MISMATCH' });
        }
        skipped.push(name);
        continue;
      }
      await client.query(sql);
      await record(name, source, sql);
      applied.push(name);
    }
    await repeat('neon/schema-access.sql');
    step = 'transaction completion';
    await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
    return { dryRun, applied, skipped };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    // SQL errors can contain data or credentials. Report only stage and a SQLSTATE/code.
    const failure = new Error(`Neon migration failed at ${step} (${error.code ?? 'validation'}); transaction rolled back.`);
    failure.code = error.code;
    throw failure;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--dry-run')) {
    console.error('Usage: node --env-file=.env.local infra/migrate-neon.mjs [--dry-run]');
    process.exitCode = 1;
  } else {
    migrateNeon({ dryRun: args.includes('--dry-run') })
      .then((result) => console.log(JSON.stringify(result)))
      .catch((error) => { console.error(error.message); process.exitCode = 1; });
  }
}
