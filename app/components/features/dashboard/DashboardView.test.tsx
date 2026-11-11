import React from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { DashboardStats } from '@/services/dashboardService'
import { DashboardView } from './DashboardView'
import { DashboardClientWrapper } from '@/app/(dashboard)/DashboardClientWrapper'

const state = vi.hoisted(() => ({ result: {} as any, retry: vi.fn() }))
vi.mock('@/hooks/useDashboard', () => ({ useDashboardController: () => state.result }))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ prefetchQuery: vi.fn() }) }))
vi.mock('@/components/ui/PrefetchLink', () => ({ PrefetchLink: ({ children, href }: any) => <a href={href}>{children}</a> }))
vi.mock('@/components/ui/lazy-charts', () => ({ AreaChart: () => null, Area: () => null, XAxis: () => null, YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null, ResponsiveContainer: () => null }))

const stats: DashboardStats = {
  sent24h: '0', deliveryRate: '0%', activeCampaigns: '0', failedMessages: '0', chartData: [],
  overview: {
    contacts: 0, templates: { total: 0, approved: 0, drafts: 0 }, campaigns: { total: 0, completed: 0, active: 0 },
    inbox: { conversations: 27, messages: 5269, outbound: 3073, inbound: 2196, delivered: 1893, read: 376, pending: 8, failed: 0, firstMessageAt: '2025-10-21T01:00:00Z', lastMessageAt: '2026-02-19T23:59:00Z' },
  },
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  state.result = { stats, recentCampaigns: [], isLoading: false, isError: false, refetch: state.retry }
})
afterEach(() => { cleanup(); vi.useRealTimers() })

it('labels the Inbox history separately from campaign metrics and displays the real period', () => {
  render(<DashboardView stats={stats} recentCampaigns={[]} isLoading={false} />)
  const overview = within(screen.getByRole('region', { name: 'Visão operacional' }))
  for (const text of ['Contatos', 'Templates', 'Campanhas', 'Mensagens do Inbox', 'Saída', 'Entrada', '5.269', '3.073', '2.196', '1.893', '376', '8']) expect(overview.getByText(text)).toBeTruthy()
  expect(overview.getByText(/21\/10\/2025 a 19\/02\/2026/)).toBeTruthy()
  expect(overview.getByText(/27 conversas/)).toBeTruthy()
  expect(screen.getByText('Enviadas por campanhas')).toBeTruthy()
  expect(overview.getByText(/histórico do Inbox não representa disparos de campanhas/i)).toBeTruthy()
})

it('shows unavailable for an older DTO without overview instead of zero counts', () => {
  render(<DashboardView stats={{ ...stats, overview: undefined }} recentCampaigns={[]} isLoading={false} />)
  const overview = within(screen.getByRole('region', { name: 'Visão operacional' }))
  expect(overview.getByText('Resumo operacional indisponível.')).toBeTruthy()
  expect(overview.queryByText('0')).toBeNull()
})

it('shows an initial query failure with retry instead of fabricated zero metrics', () => {
  state.result = { ...state.result, stats: undefined, isError: true }
  render(<DashboardClientWrapper />)
  expect(screen.getByRole('alert').textContent).toContain('Não foi possível carregar os indicadores')
  expect(screen.queryByText('0')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(state.retry).toHaveBeenCalledOnce()
})

it('keeps prior totals visible when a polling refresh fails', () => {
  state.result = { ...state.result, isError: true }
  render(<DashboardClientWrapper />)
  expect(screen.getByText('5.269')).toBeTruthy()
  expect(screen.getByRole('status').textContent).toContain('últimos dados disponíveis')
})
