import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import pg from 'pg';
import { adaptMigration, directConnection, migrateNeon } from './migrate-neon.mjs';

const sourceDir = new URL('../supabase/migrations/', import.meta.url);

test('the adapter preserves all SQL except the 12 known Realtime statements', async () => {
  let removed = 0;
  for (const name of (await readdir(sourceDir)).filter((name) => name.endsWith('.sql'))) {
    const source = await readFile(new URL(name, sourceDir), 'utf8');
    const lines = source.split('\n');
    const adapted = adaptMigration(name, source).split('\n');
    assert.equal(adapted.length, lines.length);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] !== adapted[i]) {
        assert.match(lines[i], /^ALTER PUBLICATION supabase_realtime ADD TABLE /);
        assert.match(adapted[i], /^-- Neon: /);
        removed++;
      }
    }
  }
  assert.equal(removed, 12);
});

test('an unexpected or missing publication fails closed', () => {
  assert.throws(() => adaptMigration('new.sql', 'ALTER PUBLICATION supabase_realtime ADD TABLE secret;'));
  assert.throws(() => adaptMigration('00000000000000_init.sql', 'SELECT 1;'));
  assert.throws(() => adaptMigration('new.sql', 'ALTER PUBLICATION supabase_realtime\nADD TABLE secret;'));
});

test('migrations reject pooled/invalid URLs and keep TLS certificate verification', () => {
  assert.throws(() => directConnection('postgres://user:fake@ep-test-pooler.example/db'));
  assert.throws(() => directConnection(undefined));
  assert.throws(() => directConnection('https://example.com'));
  const url = new URL(directConnection('postgres://user:fake@ep-test.example/db?sslmode=require'));
  assert.equal(url.searchParams.get('sslmode'), 'verify-full');
});

test('a database error rolls back instead of being treated as already applied', async (t) => {
  const queries = [];
  t.mock.method(pg.Client.prototype, 'connect', async () => {});
  t.mock.method(pg.Client.prototype, 'end', async () => {});
  t.mock.method(pg.Client.prototype, 'query', async (sql) => {
      queries.push(sql);
      if (sql.includes('pg_try_advisory_xact_lock')) return { rows: [{ locked: true }] };
      if (sql.includes('CREATE TABLE IF NOT EXISTS whatsflow_migrations.history')) {
        const error = new Error('already exists: secret-value');
        error.code = '42P07';
        throw error;
      }
      return { rows: [] };
  });
  await assert.rejects(migrateNeon({ connectionString: 'postgres://user:fake@ep-test.example/db' }),
    (error) => error.code === '42P07' && !error.message.includes('secret-value'));
  assert.equal(queries.at(-1), 'ROLLBACK');
  assert.ok(!queries.includes('COMMIT'));
});

test('changed checksums refuse to replay an applied migration', async (t) => {
  const queries = [];
  t.mock.method(pg.Client.prototype, 'connect', async () => {});
  t.mock.method(pg.Client.prototype, 'end', async () => {});
  t.mock.method(pg.Client.prototype, 'query', async (sql) => {
    queries.push(sql);
    if (sql.includes('pg_try_advisory_xact_lock')) return { rows: [{ locked: true }] };
    if (sql.startsWith('SELECT source_sha256')) return { rows: [{ source_sha256: 'changed', applied_sha256: 'changed' }] };
    return { rows: [] };
  });
  await assert.rejects(migrateNeon({ connectionString: 'postgres://user:fake@ep-test.example/db' }), { code: 'MIGRATION_CHECKSUM_MISMATCH' });
  assert.equal(queries.at(-1), 'ROLLBACK');
  assert.ok(!queries.some((sql) => sql.includes('CREATE TABLE public.contacts')));
});

test('real Neon: dry-run, apply, rerun, CRUD, RPC, constraints and role isolation', {
  skip: !process.env.NEON_TEST_DATABASE_URL,
  timeout: 120000,
}, async (t) => {
  // Use an explicitly supplied test branch. All smoke data is rolled back.
  const connectionString = process.env.NEON_TEST_DATABASE_URL;
  const client = new pg.Client({ connectionString: directConnection(connectionString) });
  await client.connect();
  const schemaCount = async () => Number((await client.query("SELECT count(*) FROM pg_tables WHERE schemaname = 'public'")).rows[0].count);
  try {
    const before = await schemaCount();
    await migrateNeon({ connectionString, dryRun: true });
    assert.equal(await schemaCount(), before, 'dry-run must not leave tables behind');
    await migrateNeon({ connectionString });
    const rerun = await migrateNeon({ connectionString });
    assert.equal(rerun.applied.length, 0);
    assert.equal(rerun.skipped.length, 11);
    assert.equal(await schemaCount(), 43);
    assert.equal(Number((await client.query("SELECT count(*) FROM whatsflow_migrations.history")).rows[0].count), 13);
    const coverage = (await client.query(`
      SELECT count(*) FILTER (WHERE NOT c.relrowsecurity) AS missing_rls,
        count(*) FILTER (WHERE NOT EXISTS (
          SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid AND p.polname = 'whatsflow_service_access'
        )) AS missing_policy
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
    `)).rows[0];
    assert.deepEqual(coverage, { missing_rls: '0', missing_policy: '0' });
    const serviceRole = (await client.query("SELECT rolcanlogin, rolbypassrls, rolsuper FROM pg_roles WHERE rolname = 'service_role'")).rows[0];
    assert.deepEqual(serviceRole, { rolcanlogin: false, rolbypassrls: false, rolsuper: false });
    const functions = Number((await client.query("SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public'")).rows[0].count);
    const foreignKeys = Number((await client.query("SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE n.nspname = 'public' AND contype = 'f'")).rows[0].count);
    assert.equal(functions, 25);
    assert.equal(foreignKeys, 30);
    for (const role of ['anon', 'anonymous', 'authenticated']) {
      const access = (await client.query(`
        SELECT
          (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v')
              AND has_table_privilege($1, c.oid, 'SELECT,INSERT,UPDATE,DELETE')) AS tables,
          (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND has_function_privilege($1, p.oid, 'EXECUTE')) AS functions
      `, [role])).rows[0];
      assert.deepEqual(access, { tables: '0', functions: '0' });
    }
    const marker = `migration-smoke-${randomUUID()}`;
    await client.query('BEGIN');
    try {
      // The Data API grants SET for its roles; only our local roles need temporary impersonation.
      await client.query('GRANT service_role, anon TO CURRENT_USER WITH SET TRUE');
      await client.query('SET LOCAL ROLE service_role');
      const contact = (await client.query('INSERT INTO public.contacts (name, phone) VALUES ($1, $2) RETURNING id', [marker, marker])).rows[0];
      assert.match(contact.id, /^ct_/);
      assert.equal((await client.query('SELECT name FROM public.contacts WHERE id = $1', [contact.id])).rows[0].name, marker);
      assert.equal((await client.query("UPDATE public.contacts SET notes = 'smoke' WHERE id = $1 RETURNING notes", [contact.id])).rows[0].notes, 'smoke');
      assert.equal((await client.query('SELECT public.bulk_update_contact_tags($1, $2, $3) AS count', [[contact.id], [marker], []])).rows[0].count, 1);
      assert.deepEqual((await client.query('SELECT tags FROM public.contacts WHERE id = $1', [contact.id])).rows[0].tags, [marker]);
      assert.ok((await client.query('SELECT public.get_contact_tags() AS tags')).rows[0].tags.includes(marker));
      assert.equal((await client.query('SELECT count FROM public.get_contact_tag_counts() WHERE tag = $1', [marker])).rows[0].count, '1');
      assert.ok((await client.query('SELECT public.get_contact_stats() AS stats')).rows[0].stats.total >= 1);
      const inbound = (await client.query('SELECT public.process_inbound_message($1, $2, $3) AS data', [marker, 'Synthetic migration validation', marker])).rows[0].data;
      assert.equal(inbound.is_new_conversation, true);
      assert.equal((await client.query('SELECT contact_id FROM public.inbox_conversations WHERE id = $1', [inbound.conversation_id])).rows[0].contact_id, contact.id);
      assert.equal((await client.query('SELECT total_messages FROM public.increment_conversation_counters($1)', [inbound.conversation_id])).rows[0].total_messages, 2);
      assert.equal((await client.query('SELECT unread_count FROM public.reset_unread_count($1)', [inbound.conversation_id])).rows[0].unread_count, 0);
      assert.equal((await client.query('SELECT count(*) FROM public.inbox_messages WHERE conversation_id = $1', [inbound.conversation_id])).rows[0].count, '1');
      const campaign = (await client.query('INSERT INTO public.campaigns (name) VALUES ($1) RETURNING id', [marker])).rows[0];
      await client.query("SELECT public.increment_campaign_stat($1::text, 'sent'::text)", [campaign.id]);
      assert.equal((await client.query('SELECT sent FROM public.campaigns WHERE id = $1', [campaign.id])).rows[0].sent, 1);
      const agent = (await client.query('INSERT INTO public.ai_agents (name, system_prompt) VALUES ($1, $1) RETURNING id', [marker])).rows[0];
      const vector = JSON.stringify(Array.from({ length: 768 }, (_, i) => i === 0 ? 1 : 0));
      await client.query('INSERT INTO public.ai_embeddings (agent_id, content, embedding, dimensions) VALUES ($1, $2, $3::extensions.vector, 768)', [agent.id, marker, vector]);
      const matches = (await client.query('SELECT * FROM public.search_embeddings($1::extensions.vector, $2::uuid, 768, 0.5, 5)', [vector, agent.id])).rows;
      assert.equal(matches[0]?.content, marker);
      assert.equal(matches[0]?.similarity, 1);
      const legacy = (await client.query('SELECT * FROM public.search_embeddings($1::extensions.vector, 0.5::double precision, 5, $2::uuid)', [vector, agent.id])).rows;
      assert.equal(legacy[0]?.content, marker);
      await client.query('SAVEPOINT invalid_fk');
      await assert.rejects(client.query('INSERT INTO public.contact_tags (contact_id, tag_id) VALUES ($1, $2)', [contact.id, randomUUID()]), { code: '23503' });
      await client.query('ROLLBACK TO SAVEPOINT invalid_fk');
      assert.equal((await client.query('DELETE FROM public.contacts WHERE id = $1 RETURNING id', [contact.id])).rowCount, 1);
      assert.equal((await client.query('SELECT contact_id FROM public.inbox_conversations WHERE id = $1', [inbound.conversation_id])).rows[0].contact_id, null);
      await client.query('RESET ROLE');
      for (const role of ['anon', 'anonymous', 'authenticated']) {
        await client.query(`SET LOCAL ROLE ${role}`);
        for (const sql of ['SELECT * FROM public.contacts', 'SELECT * FROM public.settings', 'SELECT public.get_contact_stats()']) {
          await client.query('SAVEPOINT denied');
          await assert.rejects(client.query(sql), { code: '42501' });
          await client.query('ROLLBACK TO SAVEPOINT denied');
        }
        await client.query('RESET ROLE');
      }
      t.diagnostic(`43 tables, ${functions} functions, ${foreignKeys} foreign keys; CRUD, RPCs, vector and public-role denials passed`);
    } finally {
      await client.query('ROLLBACK');
    }
    assert.equal((await client.query('SELECT count(*) FROM public.contacts WHERE name = $1', [marker])).rows[0].count, '0');
  } finally {
    await client.end();
  }
});
