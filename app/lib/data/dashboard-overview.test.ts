// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PostgrestClient } from '@supabase/postgrest-js'
import { loadDashboardOverview } from './dashboard-overview'

const state = vi.hoisted(() => ({ client: null as any }))
vi.mock('@/lib/supabase', () => ({ get supabase() { return state.client } }))
vi.mock('@/lib/supabase-server', () => ({ createClient: async () => state.client }))
vi.mock('@/services/campaignService', () => ({ campaignService: { getAll: async () => [] } }))
import { GET } from '@/app/api/dashboard/stats/route'
import { getDashboardData } from '@/app/(dashboard)/actions/dashboard'
import { dashboardService } from '@/services/dashboardService'

let fixtures: Record<string, any>
let calls: { table: string; select: string | null; method: string | undefined }[]
let failure: string | undefined
beforeEach(() => {
  failure = undefined
  calls = []
  fixtures = {
    contacts: 0, inbox_conversations: 27, templates: [], campaigns: [],
    messages: [
      { direction: 'outbound', delivery_status: 'sent', total: 1172 },
      { direction: 'outbound', delivery_status: 'delivered', total: 1517 },
      { direction: 'outbound', delivery_status: 'read', total: 376 },
      { direction: 'outbound', delivery_status: 'pending', total: 8 },
      { direction: 'inbound', delivery_status: 'delivered', total: 1200 },
      { direction: 'inbound', delivery_status: 'read', total: 900 },
      { direction: 'inbound', delivery_status: 'sent', total: 96 },
    ],
    period: [{ first: '2025-10-21T01:00:00+00:00', last: '2026-02-19T23:59:00+00:00' }],
  }
  state.client = new PostgrestClient('https://database.example.test/rest/v1', { retry: false, fetch: async (input, init) => {
    const url = new URL(String(input))
    const table = url.pathname.split('/').at(-1)!
    const select = url.searchParams.get('select')
    calls.push({ table, select, method: init?.method })
    if (failure === table || (failure === 'period' && select?.includes('.min()'))) return Response.json({ message: 'Synthetic database failure', code: 'XX000' }, { status: 500 })
    if (init?.method === 'HEAD') return new Response(null, { headers: fixtures[table] === null ? {} : { 'content-range': `*/${fixtures[table]}` } })
    if (table === 'inbox_messages') return Response.json(select?.includes('.min()') ? fixtures.period : fixtures.messages)
    if (table === 'campaign_stats_summary') return Response.json({ total_sent: 10, total_delivered: 8, total_read: 5, total_failed: 2, active_campaigns: 1, scheduled_campaigns: 0 })
    return Response.json(select === 'status,total:count()' ? fixtures[table] : [])
  } })
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('real dashboard overview aggregation', () => {
  it('counts every message and includes read in delivered only for outbound messages', async () => {
    const result = await loadDashboardOverview(state.client)
    expect(result.contacts).toBe(0)
    expect(result.templates).toEqual({ total: 0, approved: 0, drafts: 0 })
    expect(result.campaigns).toEqual({ total: 0, completed: 0, active: 0 })
    expect(result.inbox).toEqual({ conversations: 27, messages: 5269, outbound: 3073, inbound: 2196, delivered: 1893, read: 376, pending: 8, failed: 0, firstMessageAt: fixtures.period[0].first, lastMessageAt: fixtures.period[0].last })
    expect(calls).toHaveLength(6)
    expect(calls.filter(call => call.method === 'HEAD').map(call => call.table)).toEqual(['contacts', 'inbox_conversations'])
    expect(calls.map(call => call.select)).toContain('direction,delivery_status,total:count()')
  })

  it('totals all template/campaign statuses and normalizes the supported status variants', async () => {
    fixtures.templates = [{ status: 'APPROVED', total: 2 }, { status: 'draft', total: 3 }, { status: 'PENDING', total: 4 }, { status: null, total: 1 }]
    fixtures.campaigns = [{ status: 'Concluído', total: 2 }, { status: 'COMPLETED', total: 3 }, { status: 'concluida', total: 1 }, { status: 'Enviando', total: 4 }, { status: 'scheduled', total: 5 }, { status: 'Rascunho', total: 6 }, { status: 'Cancelado', total: 7 }]
    const result = await loadDashboardOverview(state.client)
    expect(result.templates).toEqual({ total: 10, approved: 2, drafts: 3 })
    expect(result.campaigns).toEqual({ total: 28, completed: 6, active: 9 })
  })

  it('represents an actually empty Inbox without inventing a period', async () => {
    fixtures.messages = []
    fixtures.inbox_conversations = 0
    fixtures.period = [{ first: null, last: null }]
    expect((await loadDashboardOverview(state.client)).inbox).toMatchObject({ messages: 0, conversations: 0, firstMessageAt: null, lastMessageAt: null })
  })

  it.each(['contacts', 'inbox_conversations', 'templates', 'campaigns', 'inbox_messages', 'period'])('rejects failed %s queries instead of returning fake zeroes', async table => {
    failure = table
    await expect(loadDashboardOverview(state.client)).rejects.toThrow()
  })

  it.each(['missing count', 'invalid aggregate', 'invalid period'])('rejects incomplete data: %s', async scenario => {
    if (scenario === 'missing count') fixtures.contacts = null
    if (scenario === 'invalid aggregate') fixtures.messages = [{ direction: 'outbound', delivery_status: 'sent', total: 'invalid' }]
    if (scenario === 'invalid period') fixtures.period = [{ first: null, last: 'not-a-date' }]
    await expect(loadDashboardOverview(state.client)).rejects.toThrow()
  })

  it('exposes the same overview through the API, SSR and browser DTO', async () => {
    const expected = await loadDashboardOverview(state.client)
    const apiResponse = await GET()
    expect(apiResponse.status).toBe(200)
    const dto = await apiResponse.json()
    expect(dto).toMatchObject({ totalSent: 10, deliveryRate: 80, overview: expected })
    expect((await getDashboardData()).stats.overview).toEqual(expected)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(dto)))
    const browser = await dashboardService.getStats()
    expect(browser.overview).toEqual(expected)
    expect(browser.sent24h).toBe('10')
  })

  it('propagates an overview failure through API and SSR', async () => {
    failure = 'inbox_messages'
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await GET()).status).toBe(500)
    await expect(getDashboardData()).rejects.toThrow()
  })
})
