import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import { directConnection } from './migrate-neon.mjs';

const tables = ['Contact', 'Chat', 'Message', 'MessageUpdate', 'Label', 'Media', 'IsOnWhatsapp'];
const sha = value => createHash('sha256').update(value).digest('hex');
const stable = (...parts) => sha(JSON.stringify(['whatsflow-evolution-v1', ...parts]));
const phoneFromJid = jid => typeof jid === 'string' && /^[1-9]\d{7,14}@s\.whatsapp\.net$/.test(jid) ? `+${jid.split('@')[0]}` : null;
const uuid = (...parts) => {
  const bytes = Buffer.from(stable(...parts).slice(0, 32), 'hex');
  bytes[6] = (bytes[6] & 15) | 128; bytes[8] = (bytes[8] & 63) | 128;
  const h = bytes.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
function timestamp(value, fallback) {
  if (value == null || value === '') { if (fallback) return fallback; throw new Error('missing timestamp'); }
  const input = typeof value === 'number' ? value * 1000 : /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`;
  const date = new Date(input);
  if (!Number.isFinite(date.valueOf())) throw new Error('invalid timestamp');
  return date.toISOString();
}
function validateSnapshot(snapshot) {
  if (snapshot.formatVersion !== 1 || snapshot.instances?.length !== 1 || !snapshot.instances[0].id) throw new Error('invalid snapshot identity');
  if ('token' in snapshot.instances[0]) throw new Error('credential in snapshot');
  if (!snapshot.tables || Object.keys(snapshot.tables).some(t => !tables.includes(t))) throw new Error('table boundary violated');
  for (const table of tables) {
    if (!Array.isArray(snapshot.tables[table])) throw new Error('invalid snapshot table');
    const ids = new Set();
    for (const row of snapshot.tables[table]) {
      if (typeof row.id !== 'string' || !row.id || ids.has(row.id)) throw new Error('duplicate or missing source record ID');
      ids.add(row.id);
      if (table !== 'IsOnWhatsapp' && row.instanceId !== snapshot.instances[0].id) throw new Error('instance boundary violated');
      if (table === 'Message' && 'webhookUrl' in row) throw new Error('credential-bearing field in snapshot');
    }
  }
}
export async function loadBackup(directory) {
  const paths = ['manifest.json', 'snapshot.json'].map(name => resolve(directory, name));
  for (const path of paths) if (((await stat(path)).mode & 0o077) !== 0) throw new Error('backup permissions must be private');
  const manifest = JSON.parse(await readFile(paths[0], 'utf8'));
  const raw = await readFile(paths[1]);
  if (manifest.formatVersion !== 1 || manifest.snapshotFile !== 'snapshot.json' || sha(raw) !== manifest.sha256) throw new Error('backup checksum mismatch');
  const snapshot = JSON.parse(raw);
  validateSnapshot(snapshot);
  for (const table of tables) if (snapshot.tables[table].length !== manifest.counts?.[table]) throw new Error('backup count mismatch');
  return { snapshot, manifest };
}
function messageBody(message, type) {
  let body = message;
  for (let i = 0; i < 6; i++) {
    const nested = body?.ephemeralMessage?.message ?? body?.viewOnceMessage?.message ?? body?.viewOnceMessageV2?.message ?? body?.editedMessage?.message;
    if (!nested) break;
    body = nested;
  }
  const text = body?.conversation ?? body?.extendedTextMessage?.text ?? body?.imageMessage?.caption ?? body?.videoMessage?.caption ?? body?.documentMessage?.caption ?? body?.reactionMessage?.text;
  if (typeof text === 'string' && text.length) return text;
  if (['imageMessage', 'audioMessage', 'videoMessage', 'documentMessage', 'stickerMessage', 'viewOnceMessageV2'].includes(type)) return `[Mídia histórica: ${type}; arquivo não copiado]`;
  return `[Evento histórico: ${type}]`;
}
const messageTypes = { conversation: 'text', extendedTextMessage: 'text', imageMessage: 'image', audioMessage: 'audio', videoMessage: 'video', documentMessage: 'document', templateMessage: 'template' };
const delivery = { READ: 'read', PLAYED: 'read', DELIVERY_ACK: 'delivered', SERVER_ACK: 'sent', PENDING: 'pending', ERROR: 'failed', FAILED: 'failed' };

export function buildImportPlan(snapshot, { snapshotSha256 } = {}) {
  validateSnapshot(snapshot);
  if (!/^[a-f0-9]{64}$/.test(snapshotSha256 ?? '')) throw new Error('verified snapshot checksum required');
  const instanceId = snapshot.instances[0].id;
  const exportedAt = timestamp(snapshot.exportedAt);
  const aliases = new Map();
  for (const row of snapshot.tables.Message) {
    const jid = row.key?.remoteJid; const phone = phoneFromJid(row.key?.remoteJidAlt);
    if (typeof jid === 'string' && jid.endsWith('@lid') && phone) {
      if (aliases.has(jid) && aliases.get(jid) !== phone) throw new Error('conflicting alias mapping');
      aliases.set(jid, phone);
    }
  }
  const resolvePhone = jid => phoneFromJid(jid) ?? aliases.get(jid) ?? null;
  const contactGroups = new Map();
  for (const row of snapshot.tables.Contact) {
    const phone = resolvePhone(row.remoteJid);
    if (phone) contactGroups.set(phone, [...(contactGroups.get(phone) ?? []), row]);
  }
  const stats = { sourceContacts: snapshot.tables.Contact.length, sourceMessages: snapshot.tables.Message.length, eligibleSourceMessages: 0, duplicateMessages: 0, groupMessages: 0, unresolvedLidMessages: 0, systemMessages: 0, otherExcludedMessages: 0, aliasMappings: aliases.size };
  const messageGroups = new Map();
  for (const row of snapshot.tables.Message) {
    if (typeof row.key?.id !== 'string' || typeof row.key?.fromMe !== 'boolean' || !Number.isInteger(row.messageTimestamp)) throw new Error('invalid message identity or timestamp');
    timestamp(row.messageTimestamp);
    const phone = resolvePhone(row.key.remoteJid);
    if (!phone) {
      if (row.key.remoteJid === '0@s.whatsapp.net') stats.systemMessages++;
      else if (row.key.remoteJid?.endsWith('@g.us')) stats.groupMessages++;
      else if (row.key.remoteJid?.endsWith('@lid')) stats.unresolvedLidMessages++;
      else stats.otherExcludedMessages++;
      continue;
    }
    stats.eligibleSourceMessages++;
    const identity = JSON.stringify([phone, row.key.id, row.key.fromMe]);
    messageGroups.set(identity, [...(messageGroups.get(identity) ?? []), row]);
    if (!contactGroups.has(phone)) contactGroups.set(phone, []);
  }
  const contacts = [...contactGroups].sort(([a], [b]) => a.localeCompare(b)).map(([phone, source]) => {
    source.sort((a, b) => (timestamp(b.updatedAt ?? b.createdAt, exportedAt).localeCompare(timestamp(a.updatedAt ?? a.createdAt, exportedAt))) || a.id.localeCompare(b.id));
    const created = source.map(r => timestamp(r.createdAt, exportedAt)).sort();
    const updated = source.map(r => timestamp(r.updatedAt ?? r.createdAt, exportedAt)).sort();
    return { id: `ct_evo_${stable(instanceId, 'contact', phone).slice(0, 32)}`, name: source.find(r => typeof r.pushName === 'string' && r.pushName.trim())?.pushName ?? '', phone, status: 'Desconhecido', tags: [], custom_fields: { evolution_import: { version: 1, source: 'evolution', instance_id: instanceId, source_contact_ids: source.map(r => r.id).sort(), source_jids: source.map(r => r.remoteJid).sort(), snapshot_sha256: snapshotSha256 } }, created_at: created[0] ?? exportedAt, updated_at: updated.at(-1) ?? exportedAt };
  });
  const byPhone = new Map(contacts.map(c => [c.phone, c]));
  const messages = [...messageGroups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([identity, records]) => {
    records.sort((a, b) => a.messageTimestamp - b.messageTimestamp || a.id.localeCompare(b.id));
    const first = records[0]; const phone = resolvePhone(first.key.remoteJid);
    stats.duplicateMessages += records.length - 1;
    // Preserve every original duplicate in payload and in the immutable backup.
    return { id: uuid(instanceId, 'message', identity), conversation_id: uuid(instanceId, 'conversation', phone), direction: first.key.fromMe ? 'outbound' : 'inbound', content: messageBody(first.message, first.messageType), message_type: messageTypes[first.messageType] ?? 'text', media_url: null, whatsapp_message_id: first.key.id, delivery_status: delivery[first.status] ?? 'pending', payload: { evolution_import: { version: 1, source: 'evolution', instance_id: instanceId, snapshot_sha256: snapshotSha256, source_records: records } }, created_at: timestamp(first.messageTimestamp) };
  });
  const conversations = [...new Set([...messageGroups.values()].map(rows => resolvePhone(rows[0].key.remoteJid)))].sort().map(phone => {
    const id = uuid(instanceId, 'conversation', phone);
    const history = messages.filter(m => m.conversation_id === id).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
    const last = history.at(-1);
    return { id, contact_id: byPhone.get(phone).id, phone, status: 'closed', mode: 'human', priority: 'normal', unread_count: 0, total_messages: history.length, last_message_at: last.created_at, last_message_preview: last.content.slice(0, 140), ai_agent_id: null, source: 'manual', reply_status: last.direction === 'outbound' ? 'replied' : 'unreplied', created_at: history[0].created_at, updated_at: last.created_at };
  });
  return { version: 1, instanceId, snapshotSha256, stats, contacts, conversations, messages };
}

const definitions = {
  contacts: 'id text,name text,phone text,status text,tags jsonb,custom_fields jsonb,created_at timestamptz,updated_at timestamptz',
  inbox_conversations: 'id uuid,contact_id text,phone text,status text,mode text,priority text,unread_count integer,total_messages integer,last_message_at timestamptz,last_message_preview text,ai_agent_id uuid,source text,reply_status text,created_at timestamptz,updated_at timestamptz',
  inbox_messages: 'id uuid,conversation_id uuid,direction text,content text,message_type text,media_url text,whatsapp_message_id text,delivery_status text,payload jsonb,created_at timestamptz',
};
const columns = table => definitions[table].split(',').map(field => field.split(' ')[0]);
async function insertRows(client, table, rows) {
  let count = 0;
  for (let offset = 0; offset < rows.length; offset += 250) {
    const names = columns(table).join(',');
    const result = await client.query(`INSERT INTO public.${table} (${names}) SELECT ${names} FROM jsonb_to_recordset($1::jsonb) AS x(${definitions[table]}) ON CONFLICT (id) DO NOTHING`, [JSON.stringify(rows.slice(offset, offset + 250))]);
    count += result.rowCount;
  }
  return count;
}
async function verifyRows(client, table, rows) {
  for (let offset = 0; offset < rows.length; offset += 250) {
    const names = columns(table);
    const { rows: result } = await client.query(`WITH expected AS (SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(${definitions[table]})) SELECT count(*)::integer AS mismatches FROM expected e LEFT JOIN public.${table} a ON a.id=e.id WHERE a.id IS NULL OR ROW(${names.map(n => `a.${n}`).join(',')}) IS DISTINCT FROM ROW(${names.map(n => `e.${n}`).join(',')})`, [JSON.stringify(rows.slice(offset, offset + 250))]);
    if (result[0].mismatches) throw new Error('imported row verification failed');
  }
}
async function protectedFingerprint(client) {
  const names = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('contacts','inbox_conversations','inbox_messages') ORDER BY tablename")).rows.map(r => r.tablename);
  const result = {};
  for (const name of names) {
    const identifier = `"${name.replaceAll('"', '""')}"`;
    result[name] = (await client.query(`SELECT md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY md5(to_jsonb(t)::text)),'')) AS hash FROM public.${identifier} t`)).rows[0].hash;
  }
  return JSON.stringify(result);
}
export async function importEvolution({ connectionString, plan, dryRun = true }) {
  const client = new pg.Client({ connectionString: directConnection(connectionString), connectionTimeoutMillis: 15000 });
  let stage = 'connection';
  try {
    await client.connect();
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    await client.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s'; SET LOCAL TIME ZONE 'UTC'; SET LOCAL ROLE service_role");
    stage = 'preflight';
    const lock = (await client.query("SELECT pg_try_advisory_xact_lock(hashtext($1)) AS locked", [`evolution-import:${plan.instanceId}`])).rows[0];
    if (!lock?.locked) throw new Error('import already running');
    await client.query('LOCK TABLE public.contacts,public.inbox_conversations,public.inbox_messages IN SHARE ROW EXCLUSIVE MODE');
    const triggers = (await client.query("SELECT count(*)::integer AS count FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('contacts','inbox_conversations','inbox_messages') AND NOT t.tgisinternal AND t.tgenabled <> 'D' AND (t.tgtype & 4) <> 0")).rows[0].count;
    if (triggers) throw new Error('insert triggers require review');
    const before = await protectedFingerprint(client);
    const digits = plan.contacts.map(c => c.phone.slice(1));
    const existing = (await client.query("SELECT id,phone,md5(to_jsonb(c)::text) AS hash FROM public.contacts c WHERE regexp_replace(phone,'[^0-9]','','g')=ANY($1::text[])", [digits])).rows;
    const existingByPhone = new Map();
    for (const row of existing) {
      const key = `+${row.phone.replace(/\D/g, '')}`;
      if (existingByPhone.has(key)) throw new Error('ambiguous existing phone');
      existingByPhone.set(key, row);
    }
    const newContacts = plan.contacts.filter(c => !existingByPhone.has(c.phone));
    const conversations = plan.conversations.map(c => ({ ...c, contact_id: existingByPhone.get(c.phone)?.id ?? c.contact_id, phone: existingByPhone.get(c.phone)?.phone ?? c.phone }));
    stage = 'inserting contacts and history';
    const inserted = { contacts: await insertRows(client, 'contacts', newContacts), conversations: await insertRows(client, 'inbox_conversations', conversations), messages: await insertRows(client, 'inbox_messages', plan.messages) };
    stage = 'verification';
    await verifyRows(client, 'contacts', newContacts);
    await verifyRows(client, 'inbox_conversations', conversations);
    await verifyRows(client, 'inbox_messages', plan.messages);
    const unchanged = (await client.query("SELECT id,md5(to_jsonb(c)::text) AS hash FROM public.contacts c WHERE id=ANY($1::text[])", [existing.map(c => c.id)])).rows;
    if (unchanged.length !== existing.length || unchanged.some(c => existing.find(e => e.id === c.id)?.hash !== c.hash)) throw new Error('existing contact changed');
    const counters = (await client.query("SELECT count(*)::integer AS mismatches FROM public.inbox_conversations c LEFT JOIN public.contacts ct ON ct.id=c.contact_id WHERE c.id=ANY($1::uuid[]) AND (ct.id IS NULL OR c.total_messages<>(SELECT count(*) FROM public.inbox_messages m WHERE m.conversation_id=c.id) OR c.last_message_at IS DISTINCT FROM (SELECT max(created_at) FROM public.inbox_messages m WHERE m.conversation_id=c.id))", [conversations.map(c => c.id)])).rows[0].mismatches;
    if (counters) throw new Error('foreign key or conversation counter mismatch');
    const protectedDataUnchanged = before === await protectedFingerprint(client);
    if (!protectedDataUnchanged) throw new Error('protected data changed');
    await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
    return { dryRun, inserted, totals: { contacts: plan.contacts.length, conversations: conversations.length, messages: plan.messages.length }, source: plan.stats, verified: true, protectedDataUnchanged, existingContactsPreserved: existing.length };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    // PostgreSQL details and rows can contain PII. Only safe stage and SQLSTATE escape.
    const failure = new Error(`Evolution import failed at ${stage} (${error.code ?? 'validation'}); transaction rolled back.`);
    failure.code = error.code;
    throw failure;
  } finally { await client.end(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const directory = args[0];
  const apply = args[1] === '--apply';
  if (!directory || args.length > 2 || (args[1] && !apply)) {
    console.error('Usage: NEON_IMPORT_DATABASE_URL=<in memory> node infra/import-evolution.mjs <private-backup-directory> [--apply]');
    process.exitCode = 1;
  } else {
    try {
      const backup = await loadBackup(directory);
      const plan = buildImportPlan(backup.snapshot, { snapshotSha256: backup.manifest.sha256 });
      console.log(JSON.stringify(await importEvolution({ connectionString: process.env.NEON_IMPORT_DATABASE_URL, plan, dryRun: !apply })));
    } catch (error) { console.error(error.code ? `Evolution import failed (${error.code}); details suppressed.` : 'Evolution import validation failed; no row data logged.'); process.exitCode = 1; }
  }
}
