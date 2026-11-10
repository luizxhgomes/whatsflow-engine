// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), from: vi.fn(), select: vi.fn(), order: vi.fn(), range: vi.fn(), all: vi.fn(), list: vi.fn() }))
vi.mock('@/lib/request-auth', () => ({ requireSessionOrApiKey: mocks.auth }))
vi.mock('@/lib/supabase', () => ({ getSupabaseAdmin: () => ({ from: mocks.from }) }))
vi.mock('@/lib/supabase-db', () => ({ campaignDb: { getAll: mocks.all, list: mocks.list }, campaignContactDb: {} }))
import { GET } from './route'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth.mockResolvedValue(null)
  mocks.from.mockReturnValue({ select: mocks.select })
  mocks.select.mockReturnValue({ order: mocks.order })
  mocks.order.mockReturnValue({ range: mocks.range })
  mocks.range.mockReset().mockResolvedValue({ data: [], error: null })
})
const request = () => new Request('http://localhost/api/campaigns?statusOnly=true')

describe('estados de campanhas para notificações', () => {
  it('retorna além de 1000 campanhas em faixas com ordem estável', async () => {
    const page = Array.from({ length: 1000 }, (_, id) => ({ id: String(id), name: 'Teste', status: 'Enviando', completed_at: null }))
    mocks.range.mockResolvedValueOnce({ data: page, error: null })
      .mockResolvedValueOnce({ data: [{ ...page[0], id: 'last' }], error: null })
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toHaveLength(1001)
    expect(mocks.select).toHaveBeenCalledWith('id,name,status,completed_at')
    expect(mocks.order).toHaveBeenCalledWith('id')
    expect(mocks.range.mock.calls).toEqual([[0, 999], [1000, 1999]])
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('nega acesso antes de ler estados', async () => {
    mocks.auth.mockResolvedValue(new Response(null, { status: 401 }))
    expect((await GET(request())).status).toBe(401)
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it.each([{ data: null, error: new Error('database unavailable') }, { data: null, error: null }])('retorna erro em vez de baseline vazia', async result => {
    mocks.range.mockResolvedValue(result)
    const response = await GET(request())
    expect(response.status).toBe(500)
    expect(await response.json()).toHaveProperty('error')
  })

  it('preserva GET completo e GET paginado existentes', async () => {
    mocks.all.mockResolvedValue([{ id: 'c1', recipients: 20 }])
    mocks.list.mockResolvedValue({ data: [], total: 0 })
    expect(await (await GET(new Request('http://localhost/api/campaigns'))).json()).toEqual([{ id: 'c1', recipients: 20 }])
    expect((await GET(new Request('http://localhost/api/campaigns?limit=20&offset=20'))).status).toBe(200)
    expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ limit: 20, offset: 20 }))
    expect(mocks.from).not.toHaveBeenCalled()
  })
})
