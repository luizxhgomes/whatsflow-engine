import type { DatabaseClient } from '@/lib/supabase'

export interface DashboardOverview {
  contacts: number
  templates: { total: number; approved: number; drafts: number }
  campaigns: { total: number; completed: number; active: number }
  inbox: {
    conversations: number
    messages: number
    outbound: number
    inbound: number
    delivered: number
    read: number
    pending: number
    failed: number
    firstMessageAt: string | null
    lastMessageAt: string | null
  }
}

function count(value: unknown): number {
  const parsed = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value
  if (typeof parsed !== 'number' || !Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error('Contagem operacional indisponível')
  }
  return parsed
}

function status(value: unknown): string {
  return String(value ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/** Aggregates records already stored in this app, without inferring campaign history from Inbox. */
export async function loadDashboardOverview(client: DatabaseClient): Promise<DashboardOverview> {
  const [contacts, conversations, templates, campaigns, messages, period] = await Promise.all([
    client.from('contacts').select('id', { count: 'exact', head: true }),
    client.from('inbox_conversations').select('id', { count: 'exact', head: true }),
    client.from('templates').select('status,total:count()'),
    client.from('campaigns').select('status,total:count()'),
    client.from('inbox_messages').select('direction,delivery_status,total:count()'),
    client.from('inbox_messages').select('first:created_at.min(),last:created_at.max()'),
  ])
  if ([contacts, conversations, templates, campaigns, messages, period].some(result => result.error)) {
    throw new Error('Falha ao carregar o resumo operacional')
  }
  if (![templates.data, campaigns.data, messages.data, period.data].every(Array.isArray) || period.data!.length !== 1) {
    throw new Error('Resumo operacional incompleto')
  }

  const range = period.data![0]
  const first = range.first
  const last = range.last
  if ((first !== null && (typeof first !== 'string' || !Number.isFinite(Date.parse(first)))) ||
      (last !== null && (typeof last !== 'string' || !Number.isFinite(Date.parse(last)))) ||
      (first === null) !== (last === null) || (first && last && Date.parse(first) > Date.parse(last))) {
    throw new Error('Período do histórico indisponível')
  }

  const overview: DashboardOverview = {
    contacts: count(contacts.count),
    templates: { total: 0, approved: 0, drafts: 0 },
    campaigns: { total: 0, completed: 0, active: 0 },
    inbox: {
      conversations: count(conversations.count), messages: 0, outbound: 0, inbound: 0,
      delivered: 0, read: 0, pending: 0, failed: 0, firstMessageAt: first, lastMessageAt: last,
    },
  }
  for (const row of templates.data!) {
    const total = count(row.total)
    const normalized = status(row.status)
    overview.templates.total += total
    if (normalized === 'approved') overview.templates.approved += total
    if (normalized === 'draft') overview.templates.drafts += total
  }
  for (const row of campaigns.data!) {
    const total = count(row.total)
    const normalized = status(row.status)
    overview.campaigns.total += total
    if (['completed', 'concluido', 'concluida'].includes(normalized)) overview.campaigns.completed += total
    if (['sending', 'scheduled', 'enviando', 'agendado'].includes(normalized)) overview.campaigns.active += total
  }
  for (const row of messages.data!) {
    const total = count(row.total)
    if (row.direction !== 'outbound' && row.direction !== 'inbound') throw new Error('Direção das mensagens indisponível')
    overview.inbox.messages += total
    overview.inbox[row.direction as 'outbound' | 'inbound'] += total
    if (row.direction !== 'outbound') continue
    const delivery = status(row.delivery_status)
    if (delivery === 'delivered' || delivery === 'read') overview.inbox.delivered += total
    if (delivery === 'read') overview.inbox.read += total
    if (delivery === 'pending') overview.inbox.pending += total
    if (delivery === 'failed') overview.inbox.failed += total
  }
  if (overview.inbox.messages > 0 && first === null) throw new Error('Período do histórico indisponível')
  return overview
}
