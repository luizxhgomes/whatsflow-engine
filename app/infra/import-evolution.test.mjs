import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import pg from 'pg';
import { buildImportPlan, loadBackup, importEvolution } from './import-evolution.mjs';

const phone = '5511999990001@s.whatsapp.net';
function fixture() {
  const contact = (id, jid, name) => ({ id, instanceId: 'instance-test', remoteJid: jid, pushName: name, createdAt: '2025-01-01T00:00:00', updatedAt: '2025-01-02T00:00:00' });
  const message = (id, jid, waId, timestamp, extra = {}) => ({ id, instanceId: 'instance-test', key: { id: waId, remoteJid: jid, fromMe: false }, message: { conversation: 'Synthetic history' }, messageType: 'conversation', messageTimestamp: timestamp, status: 'READ', ...extra });
  return { formatVersion: 1, exportedAt: '2026-11-10T12:00:00Z', instances: [{ id: 'instance-test', name: 'Synthetic' }], tables: {
    Contact: [contact('c1', phone, 'Synthetic name'), contact('c2', 'lid-a@lid', 'Synthetic alias'), contact('c3', 'group@g.us', 'Group'), contact('c4', 'unknown@lid', 'Unknown')],
    Chat: [], Label: [], Media: [], IsOnWhatsapp: [], MessageUpdate: [],
    Message: [message('m1', phone, 'wa-1', 1735776000), message('m2', 'lid-a@lid', 'wa-1', 1735776010, { key: { id: 'wa-1', remoteJid: 'lid-a@lid', remoteJidAlt: phone, fromMe: false } }), message('m3', phone, 'wa-2', 1735776020, { messageType: 'imageMessage', message: { imageMessage: { caption: 'Original caption', url: 'https://example.invalid/encrypted.enc' } }, status: 'DELIVERY_ACK' }), message('m4', 'group@g.us', 'wa-3', 1735776030), message('m5', 'unknown@lid', 'wa-4', 1735776040)],
  } };
}
const options = { snapshotSha256: 'a'.repeat(64) };

test('maps only proven phone aliases, merges contacts and preserves excluded counts', () => {
  const plan = buildImportPlan(fixture(), options);
  assert.equal(plan.contacts.length, 1);
  assert.equal(plan.contacts[0].phone, '+5511999990001');
  assert.equal(plan.contacts[0].status, 'Desconhecido');
  assert.equal(plan.stats.eligibleSourceMessages, 3);
  assert.equal(plan.stats.duplicateMessages, 1);
  assert.equal(plan.stats.groupMessages, 1);
  assert.equal(plan.stats.unresolvedLidMessages, 1);
  assert.equal(plan.messages.length, 2);
  assert.equal(plan.conversations.length, 1);
  assert.deepEqual(plan.contacts[0].custom_fields.evolution_import.source_contact_ids, ['c1', 'c2']);
});

test('deduplication retains source records, original timestamp, media limits and closed human history', () => {
  const plan = buildImportPlan(fixture(), options);
  const message = plan.messages.find(m => m.whatsapp_message_id === 'wa-1');
  assert.equal(message.created_at, '2025-01-02T00:00:00.000Z');
  assert.equal(message.payload.evolution_import.source_records.length, 2);
  const media = plan.messages.find(m => m.whatsapp_message_id === 'wa-2');
  assert.equal(media.content, 'Original caption');
  assert.equal(media.message_type, 'image');
  assert.equal(media.media_url, null);
  assert.equal(media.delivery_status, 'delivered');
  const conversation = plan.conversations[0];
  assert.equal(conversation.status, 'closed');
  assert.equal(conversation.mode, 'human');
  assert.equal(conversation.unread_count, 0);
  assert.equal(conversation.ai_agent_id, null);
  assert.equal(conversation.total_messages, 2);
  assert.equal(conversation.source, 'manual');
  assert.ok(plan.messages.every(m => m.conversation_id === conversation.id));
});

test('IDs and output are deterministic regardless of source array order', () => {
  const a = fixture(); const b = structuredClone(a);
  b.tables.Message.reverse(); b.tables.Contact.reverse();
  const first = buildImportPlan(a, options); const second = buildImportPlan(b, options);
  assert.deepEqual(first, second);
  assert.match(first.conversations[0].id, /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('the technical zero JID is preserved in backup counts and never becomes a phone', () => {
  const source = fixture();
  source.tables.Message.push({ ...source.tables.Message[0], id: 'system', key: { id: 'system-wa', remoteJid: '0@s.whatsapp.net', fromMe: false } });
  const plan = buildImportPlan(source, options);
  assert.equal(plan.stats.systemMessages, 1);
  assert.equal(plan.contacts.length, 1);
  assert.equal(plan.conversations.length, 1);
});

test('conflicting aliases and cross-instance records fail closed', () => {
  const a = fixture();
  a.tables.Message.push({ ...a.tables.Message[1], id: 'conflict', key: { ...a.tables.Message[1].key, remoteJidAlt: '5511999990002@s.whatsapp.net' } });
  assert.throws(() => buildImportPlan(a, options), /conflicting alias/);
  const b = fixture(); b.tables.Contact[0].instanceId = 'other';
  assert.throws(() => buildImportPlan(b, options), /instance boundary/);
});

test('credentials, invalid dates and unsupported snapshot structures fail closed', () => {
  const a = fixture(); a.instances[0].token = 'synthetic-secret';
  assert.throws(() => buildImportPlan(a, options), /credential/);
  const b = fixture(); b.tables.Message[0].messageTimestamp = 'not-a-date';
  assert.throws(() => buildImportPlan(b, options), /timestamp/);
  const c = fixture(); c.tables.Setting = [{ token: 'synthetic' }];
  assert.throws(() => buildImportPlan(c, options), /table boundary/);
});

test('backup loader verifies hash, counts and restrictive file permissions', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'whatsflow-import-test-'));
  const data = JSON.stringify(fixture());
  const manifest = { formatVersion: 1, snapshotFile: 'snapshot.json', sha256: createHash('sha256').update(data).digest('hex'), counts: Object.fromEntries(Object.entries(fixture().tables).map(([k, v]) => [k, v.length])) };
  await writeFile(join(dir, 'snapshot.json'), data, { mode: 0o600 });
  await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest), { mode: 0o600 });
  assert.equal((await loadBackup(dir)).snapshot.tables.Contact.length, 4);
  await chmod(join(dir, 'snapshot.json'), 0o644);
  await assert.rejects(loadBackup(dir), /permissions/);
  await chmod(join(dir, 'snapshot.json'), 0o600);
  await writeFile(join(dir, 'snapshot.json'), data + ' ');
  await assert.rejects(loadBackup(dir), /checksum/);
});

test('database errors roll back and never expose row contents or connection values', async (t) => {
  const queries = [];
  t.mock.method(pg.Client.prototype, 'connect', async () => {});
  t.mock.method(pg.Client.prototype, 'end', async () => {});
  t.mock.method(pg.Client.prototype, 'query', async (sql) => {
    queries.push(sql);
    if (sql.includes('pg_try_advisory')) throw Object.assign(new Error('private-value'), { code: '42501' });
    return { rows: [] };
  });
  await assert.rejects(importEvolution({ connectionString: 'postgres://test:fake@ep-test.example/neondb', plan: buildImportPlan(fixture(), options) }), e => e.code === '42501' && !e.message.includes('private-value'));
  assert.equal(queries.at(-1), 'ROLLBACK');
  assert.ok(!queries.includes('COMMIT'));
});

test('real isolated Neon: rollback, import, rerun, FK, dates, counters and protected data', {
  skip: !process.env.NEON_IMPORT_TEST_DATABASE_URL || !process.env.EVOLUTION_IMPORT_BACKUP_DIR,
  timeout: 180000,
}, async () => {
  const backup = await loadBackup(process.env.EVOLUTION_IMPORT_BACKUP_DIR);
  const plan = buildImportPlan(backup.snapshot, { snapshotSha256: backup.manifest.sha256 });
  const options = { connectionString: process.env.NEON_IMPORT_TEST_DATABASE_URL, plan };
  const preview = await importEvolution(options);
  assert.equal(preview.dryRun, true);
  assert.equal(preview.protectedDataUnchanged, true);
  const applied = await importEvolution({ ...options, dryRun: false });
  assert.equal(applied.verified, true);
  assert.equal(applied.protectedDataUnchanged, true);
  const rerun = await importEvolution({ ...options, dryRun: false });
  assert.deepEqual(rerun.inserted, { contacts: 0, conversations: 0, messages: 0 });
  assert.equal(rerun.verified, true);
  assert.equal(rerun.protectedDataUnchanged, true);
});
