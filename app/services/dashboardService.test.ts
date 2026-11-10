import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./campaignService', () => ({
  campaignService: {
    getAll: vi.fn(),
    list: vi.fn(),
  },
}))

import { campaignService } from './campaignService'
import { dashboardService } from './dashboardService'

function createMockFetchResponse(data: unknown, options: Partial<Response> = {}) {
  return { ok: true, status: 200, json: async () => data, ...options }
}
function setupFetchMock() {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('dashboardService', () => {
  const mockFetch = setupFetchMock()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('getStats deve combinar stats e campanhas', async () => {
    mockFetch.mockResolvedValueOnce(createMockFetchResponse({
      totalSent: 10,
      totalDelivered: 8,
      totalRead: 5,
      totalFailed: 2,
      activeCampaigns: 1,
      deliveryRate: 80,
    }))

    ;(campaignService.getAll as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        id: 'c1',
        name: 'Campanha',
        status: 'Enviando',
        recipients: 10,
        sent: 10,
        delivered: 8,
        read: 5,
        skipped: 0,
        failed: 2,
        createdAt: new Date().toISOString(),
        templateName: 't',
      },
    ])

    const result = await dashboardService.getStats()

    expect(result.sent24h).toBe('10')
    expect(result.deliveryRate).toBe('80%')
    expect(result.chartData).toHaveLength(30)
  })

  it.each([401, 500])('getStats propaga HTTP %s sem inventar zeros', async status => {
    mockFetch.mockResolvedValueOnce(createMockFetchResponse({}, { ok: false, status }))
    vi.mocked(campaignService.getAll).mockResolvedValueOnce([])
    await expect(dashboardService.getStats()).rejects.toThrow(String(status))
  })

  it('getStats propaga falha da consulta de campanhas', async () => {
    mockFetch.mockResolvedValueOnce(createMockFetchResponse({ totalSent: 10 }))
    vi.mocked(campaignService.getAll).mockRejectedValueOnce(new Error('500: Falha nas campanhas'))
    await expect(dashboardService.getStats()).rejects.toThrow('500')
  })

  it('getRecentCampaigns deve retornar lista', async () => {
    ;(campaignService.list as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: [{ id: 'c1' }],
    })

    const result = await dashboardService.getRecentCampaigns()

    expect(result).toHaveLength(1)
  })

  it('getRecentCampaigns propaga erro sem apagar o histórico', async () => {
    vi.mocked(campaignService.list).mockRejectedValueOnce(new Error('401: Sessão expirada'))
    await expect(dashboardService.getRecentCampaigns()).rejects.toThrow('401')
  })
})
