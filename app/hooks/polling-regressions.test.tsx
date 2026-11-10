import React from 'react'
import { act, cleanup, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ contacts: vi.fn(), stats: vi.fn(), tags: vi.fn(), templates: vi.fn(), drafts: vi.fn(), flows: vi.fn(), flow: vi.fn() }))
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/services', () => ({ contactService: { list: mocks.contacts, getStats: mocks.stats, getTags: mocks.tags } }))
vi.mock('@/services/customFieldService', () => ({ customFieldService: { getAll: async () => [] } }))
vi.mock('@/services/templateService', () => ({ templateService: { getAll: mocks.templates } }))
vi.mock('@/services/manualDraftsService', () => ({ manualDraftsService: { list: mocks.drafts } }))
vi.mock('@/services/flowsService', () => ({ flowsService: { list: mocks.flows, get: mocks.flow } }))

import { useContactsController } from './useContacts'
import { useTemplatesController } from './useTemplates'
import { useFlowsBuilderController } from './useFlowsBuilder'
import { useFlowEditorController } from './useFlowEditor'
import { useRealtimeQuery } from './useRealtimeQuery'
import { campaignService } from '@/services/campaignService'
import { dashboardService } from '@/services/dashboardService'
import { contactService } from '@/services/contactService'

let client: QueryClient
function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
async function tick(ms = 1) { await act(async () => { await vi.advanceTimersByTimeAsync(ms) }) }
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  focusManager.setFocused(true)
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, refetchOnWindowFocus: false } } })
  mocks.contacts.mockResolvedValue({ data: [{ id: 'initial' }], total: 1 })
  mocks.stats.mockResolvedValue({ total: 1, optIn: 1, optOut: 0 })
  mocks.tags.mockResolvedValue(['initial'])
  mocks.templates.mockResolvedValue([{ id: 't1', name: 'initial', status: 'APPROVED', category: 'MARKETING' }])
  mocks.drafts.mockResolvedValue([])
  mocks.flows.mockResolvedValue([{ id: 'f1', name: 'Initial' }])
  mocks.flow.mockResolvedValue({ id: 'f1', name: 'Initial', spec: {} })
})
afterEach(() => {
  cleanup()
  client.clear()
  focusManager.setFocused(undefined)
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('atualiza lista, estatísticas e tags de contatos a cada 10s visíveis', async () => {
  const { result, unmount } = renderHook(() => useContactsController(), { wrapper })
  await tick()
  mocks.contacts.mockResolvedValue({ data: [{ id: 'external' }], total: 2 })
  mocks.stats.mockResolvedValue({ total: 2, optIn: 2, optOut: 0 })
  mocks.tags.mockResolvedValue(['external'])
  await tick(10001)
  expect(result.current.contacts.map(c => c.id)).toEqual(['external'])
  expect(result.current.stats.total).toBe(2)
  expect(result.current.tags).toEqual(['external'])
  for (const query of [mocks.contacts, mocks.stats, mocks.tags]) expect(query).toHaveBeenCalledTimes(2)
  act(() => focusManager.setFocused(false))
  await tick(60000)
  for (const query of [mocks.contacts, mocks.stats, mocks.tags]) expect(query).toHaveBeenCalledTimes(2)
  act(() => focusManager.setFocused(true))
  await tick(10001)
  for (const query of [mocks.contacts, mocks.stats, mocks.tags]) expect(query).toHaveBeenCalledTimes(3)
  unmount()
  await tick(60000)
  expect(mocks.contacts).toHaveBeenCalledTimes(3)
})

it('atualiza templates e identificação dos rascunhos sem esperar sincronização manual', async () => {
  const { result } = renderHook(() => useTemplatesController(), { wrapper })
  await tick()
  mocks.templates.mockResolvedValue([{ id: 't2', name: 'external', status: 'APPROVED', category: 'MARKETING' }])
  mocks.drafts.mockResolvedValue([{ id: 'd2', name: 'draft' }])
  await tick(10001)
  expect(result.current.templates.map(t => t.id)).toEqual(['t2'])
  expect(result.current.manualDraftIds.has('d2')).toBe(true)
  act(() => focusManager.setFocused(false))
  await tick(60000)
  expect(mocks.templates).toHaveBeenCalledTimes(2)
  expect(mocks.drafts).toHaveBeenCalledTimes(2)
})

it('atualiza lista e detalhe de MiniApps, preservando editor desabilitado', async () => {
  const list = renderHook(() => useFlowsBuilderController(), { wrapper })
  const detail = renderHook(() => useFlowEditorController('f1'), { wrapper })
  renderHook(() => useFlowEditorController(''), { wrapper })
  await tick()
  mocks.flows.mockResolvedValue([{ id: 'f1', name: 'External' }])
  mocks.flow.mockResolvedValue({ id: 'f1', name: 'External', spec: {} })
  await tick(10001)
  expect(list.result.current.flows[0].name).toBe('External')
  expect(detail.result.current.flow?.name).toBe('External')
  expect(mocks.flow).toHaveBeenCalledTimes(2)
  expect(mocks.flow).toHaveBeenCalledWith('f1')
  act(() => focusManager.setFocused(false))
  await tick(60000)
  expect(mocks.flows).toHaveBeenCalledTimes(2)
  expect(mocks.flow).toHaveBeenCalledTimes(2)
})

const queries: Array<[string, () => Promise<unknown>, number]> = [
  ['campaign-list', () => campaignService.list({ limit: 20, offset: 0 }), 10_000],
  ['campaign-all', campaignService.getAll, 10_000],
  ['campaign-detail', () => campaignService.getById('c1'), 10_000],
  ['campaign-messages', () => campaignService.getMessages('c1'), 10_000],
  ['campaign-metrics', () => campaignService.getMetrics('c1'), 10_000],
  ['dashboard-stats', dashboardService.getStats, 30_000],
  ['dashboard-recent', dashboardService.getRecentCampaigns, 30_000],
  ['contact-stats', contactService.getStats, 10_000],
]
const campaign = { id: 'c1', name: 'Existing', status: 'Enviando', sent: 7, recipients: 7, createdAt: new Date().toISOString() }
const responses: Record<string, unknown> = {
  '/api/campaigns': [campaign],
  '/api/campaigns?limit=20&offset=0': { data: [campaign], total: 1 },
  '/api/campaigns?limit=5&offset=0': { data: [campaign], total: 1 },
  '/api/campaigns/c1': campaign,
  '/api/campaigns/c1/messages': { messages: [{ id: 'm1' }], stats: { total: 1 }, pagination: { total: 1 } },
  '/api/campaigns/c1/metrics': { sent: 7 },
  '/api/dashboard/stats': { totalSent: 7, totalDelivered: 5, totalRead: 1, totalFailed: 1, activeCampaigns: 2, deliveryRate: 71 },
  '/api/contacts/stats': { total: 7, optIn: 5, optOut: 2 },
}
it.each(queries)('%s preserva o último dado válido e expõe HTTP 401/500 no polling', async (name, queryFn, interval) => {
  let failure: number | null = null
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: failure === null, status: failure || 200, json: async () => responses[url] })))
  const { result } = renderHook(() => useRealtimeQuery({ queryKey: [name], queryFn, table: 'campaigns', refetchInterval: interval }), { wrapper })
  await tick()
  expect(result.current.isSuccess).toBe(true)
  const previous = result.current.data
  for (const status of [401, 500]) {
    failure = status
    await tick(interval + 1)
    expect(result.current.isError).toBe(true)
    expect(result.current.error?.message).toContain(String(status))
    expect(result.current.data).toEqual(previous)
  }
})
