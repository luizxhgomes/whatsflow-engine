// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), gt: vi.fn(), list: vi.fn() }))
vi.mock('@/lib/request-auth', () => ({ requireSessionOrApiKey: mocks.auth }))
vi.mock('@/lib/supabase', () => ({ getSupabaseAdmin: () => ({ from: mocks.from }) }))
vi.mock('@/lib/inbox/inbox-service', () => ({ listConversations: mocks.list }))
import { GET } from './route'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth.mockResolvedValue(null)
  mocks.from.mockReturnValue({ select: mocks.select })
  mocks.select.mockReturnValue({ eq: mocks.eq })
  mocks.eq.mockReturnValue({ gt: mocks.gt })
  mocks.gt.mockResolvedValue({ count: 151, error: null })
})
const request = () => new NextRequest('http://localhost/api/inbox/conversations?unreadCountOnly=true&page=2&limit=1&status=closed')

describe('contagem global de conversas não lidas', () => {
  it('conta todas as abertas sem aplicar paginação ou filtros da lista', async () => {
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ count: 151 })
    expect(mocks.from).toHaveBeenCalledWith('inbox_conversations')
    expect(mocks.select).toHaveBeenCalledWith('id', { count: 'exact', head: true })
    expect(mocks.eq).toHaveBeenCalledWith('status', 'open')
    expect(mocks.gt).toHaveBeenCalledWith('unread_count', 0)
    expect(mocks.list).not.toHaveBeenCalled()
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('nega acesso antes de consultar o banco', async () => {
    mocks.auth.mockResolvedValue(new Response(null, { status: 401 }))
    expect((await GET(request())).status).toBe(401)
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it.each([
    { count: null, error: new Error('database unavailable') },
    { count: null, error: null },
  ])('não inventa zero quando a contagem falha', async result => {
    mocks.gt.mockResolvedValue(result)
    const response = await GET(request())
    expect(response.status).toBe(500)
    expect(await response.json()).not.toHaveProperty('count')
  })

  it('preserva a rota existente da listagem', async () => {
    mocks.list.mockResolvedValue({ conversations: [], total: 0, page: 2, totalPages: 0 })
    const response = await GET(new NextRequest('http://localhost/api/inbox/conversations?page=2'))
    expect(response.status).toBe(200)
    expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }))
    expect(mocks.from).not.toHaveBeenCalled()
  })
})
