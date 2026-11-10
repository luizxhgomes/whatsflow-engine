import React from 'react'
import { act, cleanup, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CampaignStatus } from '@/types'

const mocks = vi.hoisted(() => ({
  messages: vi.fn(), unread: vi.fn(), campaign: vi.fn(), statuses: vi.fn(),
  metrics: vi.fn(), campaignMessages: vi.fn(),
  success: vi.fn(), error: vi.fn(),
}))
vi.mock('@/services/inboxService', () => ({ inboxService: {
  listMessages: mocks.messages, getUnreadCount: mocks.unread,
} }))
vi.mock('@/services/campaignService', () => ({ campaignService: { getStatuses: mocks.statuses } }))
vi.mock('@/services', () => ({ campaignService: {
  getById: mocks.campaign,
  getMetrics: mocks.metrics,
  getMessages: mocks.campaignMessages,
} }))
vi.mock('@/lib/navigation', () => ({ useParams: () => ({ id: 'c1' }), useNavigate: () => vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error } }))
vi.mock('@/lib/supabase', () => ({ getSupabaseBrowser: () => null }))
vi.mock('@/lib/supabase-realtime', () => ({ createRealtimeChannel: () => null }))

import { useRealtimeQuery } from './useRealtimeQuery'
import { useMessages } from './useConversation'
import { useUnreadCount } from './useUnreadCount'
import { useCampaignDetailsController } from './useCampaignDetails'
import { useRealtimeNotifications } from './useRealtimeNotifications'

let client: QueryClient
function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
async function tick(ms = 1) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms) })
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  mocks.metrics.mockResolvedValue(null)
  mocks.campaignMessages.mockResolvedValue({ messages: [], stats: {}, pagination: { total: 0 } })
  focusManager.setFocused(true)
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
})
afterEach(() => {
  cleanup()
  client.clear()
  focusManager.setFocused(undefined)
  vi.useRealTimers()
})

describe('atualizações autenticadas sem Realtime', () => {
  it('atualiza o inbox a cada 3s e pausa quando a página está oculta', async () => {
    const fetchList = vi.fn().mockResolvedValue({ total: 2 })
    renderHook(() => useRealtimeQuery({ queryKey: ['inbox'], queryFn: fetchList, table: 'inbox_conversations' }), { wrapper })
    await tick()
    expect(fetchList).toHaveBeenCalledTimes(1)
    await tick(3000)
    expect(fetchList).toHaveBeenCalledTimes(2)
    act(() => focusManager.setFocused(false))
    await tick(9000)
    expect(fetchList).toHaveBeenCalledTimes(2)
  })

  it('recebe mensagens novas sem recarregar a conversa', async () => {
    mocks.messages.mockResolvedValueOnce({ messages: [{ id: 'm1' }], hasMore: false })
      .mockResolvedValue({ messages: [{ id: 'm1' }, { id: 'm2' }], hasMore: false })
    const { result } = renderHook(() => useMessages('inbox1'), { wrapper })
    await tick()
    expect(result.current.messages.map(m => m.id)).toEqual(['m1'])
    await tick(3001)
    expect(result.current.messages.map(m => m.id)).toEqual(['m1', 'm2'])
  })

  it('atualiza lista de campanhas a cada 10s', async () => {
    const fetchList = vi.fn().mockResolvedValue([])
    renderHook(() => useRealtimeQuery({ queryKey: ['campaigns'], queryFn: fetchList, table: 'campaigns' }), { wrapper })
    await tick()
    expect(fetchList).toHaveBeenCalledTimes(1)
    await tick(10001)
    expect(fetchList).toHaveBeenCalledTimes(2)
  })

  it('atualiza métricas e mensagens de campanha grande a cada 10s', async () => {
    mocks.campaign.mockResolvedValue({ id: 'c1', status: CampaignStatus.SENDING, recipients: 40000 })
    renderHook(() => useCampaignDetailsController(), { wrapper })
    await tick()
    await tick(10001)
    expect(mocks.metrics).toHaveBeenCalledTimes(2)
    expect(mocks.campaignMessages).toHaveBeenCalledTimes(2)
  })

  it('mantém status de campanha atualizado depois dos primeiros 30s', async () => {
    mocks.campaign.mockResolvedValue({ id: 'c1', status: CampaignStatus.DRAFT, recipients: 2 })
    const { result } = renderHook(() => useCampaignDetailsController(), { wrapper })
    await tick()
    await tick(40000)
    mocks.campaign.mockResolvedValue({ id: 'c1', status: CampaignStatus.COMPLETED, recipients: 2 })
    await tick(10001)
    expect(mocks.campaign.mock.calls.length).toBeGreaterThan(4)
    expect(result.current.campaign?.status).toBe(CampaignStatus.COMPLETED)
    expect(result.current.isRealtimeConnected).toBe(false)
  })

  it('não transforma erro de autenticação em contagem zero', async () => {
    mocks.unread.mockRejectedValue(new Error('401: Unauthorized'))
    const { result } = renderHook(() => useUnreadCount(), { wrapper })
    await tick()
    expect(result.current.count).toBeUndefined()
    expect(result.current.error?.message).toContain('401')
  })

  it('consulta contagem global e mantém o último valor se o servidor falhar', async () => {
    mocks.unread.mockResolvedValueOnce(151).mockRejectedValue(new Error('500: Falha'))
    const { result } = renderHook(() => useUnreadCount(), { wrapper })
    await tick()
    expect(result.current.count).toBe(151)
    await tick(3001)
    expect(result.current.count).toBe(151)
    expect(result.current.error).toBeTruthy()
  })

  it('notifica somente transições novas e não repete após erro ou novo fetch', async () => {
    const old = { id: 'old', name: 'Antiga', status: 'Concluído', completed_at: '2026-11-01' }
    const sending = { id: 'new', name: 'Nova', status: 'Enviando', completed_at: null }
    mocks.statuses.mockResolvedValue([old, sending])
    renderHook(() => useRealtimeNotifications(), { wrapper })
    await tick()
    expect(mocks.success).not.toHaveBeenCalled()
    mocks.statuses.mockRejectedValueOnce(new Error('401'))
    await tick(10001)
    mocks.statuses.mockResolvedValue([old, { ...sending, status: 'Concluído', completed_at: '2026-11-10' }])
    await tick(10001)
    expect(mocks.success).toHaveBeenCalledTimes(1)
    await tick(20001)
    expect(mocks.success).toHaveBeenCalledTimes(1)
    mocks.statuses.mockResolvedValue([old, { ...sending, status: 'Falhou' }])
    await tick(10001)
    expect(mocks.error).toHaveBeenCalledTimes(1)
    await tick(10001)
    expect(mocks.error).toHaveBeenCalledTimes(1)
  })
})
