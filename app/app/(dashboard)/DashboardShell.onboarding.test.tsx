import React from 'react'
import Module from 'node:module'
import { JSDOM } from 'jsdom'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HealthStatus } from '@/lib/health-check'

const mocks = vi.hoisted(() => ({ save: vi.fn(), saveMeta: vi.fn(), markComplete: vi.fn(), fetch: vi.fn(), push: vi.fn(), onboardingCompleted: false, pathname: '/' }))
vi.mock('next/navigation', () => {
  const router = { push: mocks.push, refresh: vi.fn() }
  return {
    usePathname: () => mocks.pathname,
    useRouter: () => router,
    useSearchParams: () => new URLSearchParams('redirect=%2Finbox'),
  }
})
vi.mock('next/image', () => ({ default: () => null }))
vi.mock('../(auth)/login/LoginScene', () => ({ default: () => null }))
vi.mock('@/hooks/useUnreadCount', () => ({ useUnreadCount: () => ({ count: 0 }) }))
vi.mock('@/hooks/useAccountAlerts', () => ({ useAccountAlerts: () => ({ alerts: [] }) }))
vi.mock('@/hooks/useOnboardingStatus', () => ({ useOnboardingStatus: () => ({ isCompleted: mocks.onboardingCompleted, isLoading: false, markComplete: mocks.markComplete, refetch: vi.fn() }) }))
vi.mock('@/components/providers/DevModeProvider', () => ({ useDevMode: () => ({ isDevMode: false }) }))
vi.mock('@/components/layout/DashboardSidebar', () => ({ DashboardSidebar: () => null }))
vi.mock('@/components/ui/AccountAlertBanner', () => ({ AccountAlertBanner: () => null }))
vi.mock('@/components/shared/WebhookAlertBanner', () => ({ WebhookAlertBanner: () => null }))
vi.mock('@/components/ui/theme-toggle', () => ({ ThemeToggle: () => null }))
vi.mock('@/components/ui/dev-mode-toggle', () => ({ DevModeToggle: () => null }))
vi.mock('@/services/settingsService', () => ({ settingsService: { save: mocks.save, saveMetaAppConfig: mocks.saveMeta } }))
vi.mock('@/components/features/setup', () => ({
  SuccessBanner: () => null, CredentialsModal: () => null, GuidedTour: () => null,
  useGuidedTour: () => ({ shouldShow: false, markAsCompleted: vi.fn() }),
}))
vi.mock('@/components/features/onboarding', async () => ({
  ...(await import('@/components/features/onboarding/OnboardingModal')),
  ...(await import('@/components/features/onboarding/TutorialsSheet')),
  ...(await import('@/components/features/onboarding/hooks/useOnboardingProgress')),
  OnboardingChecklist: () => null, ChecklistMiniBadge: () => null, OnboardingOverlay: () => <div>Configuração da infraestrutura</div>,
}))

import LoginPage from '../(auth)/login/page'
import { DashboardShell } from './DashboardShell'

const storageKey = 'whatsflow_onboarding_progress_v2'
const initialProgress = { currentStep: 'welcome', path: null, completedSteps: [], isChecklistMinimized: false, isChecklistDismissed: false, startedAt: null }
const health: HealthStatus = {
  overall: 'degraded', timestamp: '2026-11-10T00:00:00Z',
  services: {
    database: { status: 'ok', provider: 'supabase' }, qstash: { status: 'ok' },
    whatsapp: { status: 'not_configured' }, webhook: { status: 'not_configured' },
  },
}
const clients: QueryClient[] = []
function renderShell(client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })) {
  clients.push(client)
  return render(<QueryClientProvider client={client}>
    <DashboardShell initialAuthStatus={{ isAuthenticated: true }} initialHealthStatus={health}>
      <button>Usar o painel</button>
    </DashboardShell>
  </QueryClientProvider>)
}
function expectNoConnectionChanges() {
  expect(mocks.save).not.toHaveBeenCalled()
  expect(mocks.saveMeta).not.toHaveBeenCalled()
  expect(mocks.markComplete).not.toHaveBeenCalled()
  expect(mocks.fetch).not.toHaveBeenCalled()
  expect(health.services.whatsapp.status).toBe('not_configured')
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.fetch.mockReset()
  mocks.onboardingCompleted = false
  mocks.pathname = '/'
  vi.stubGlobal('localStorage', new JSDOM('', { url: 'https://dashboard.example.test' }).window.localStorage)
  vi.stubGlobal('fetch', mocks.fetch)
  vi.stubGlobal('React', React)
  // DashboardShell loads this unrelated notification hook through a runtime require.
  const originalRequire = Module.prototype.require
  vi.spyOn(Module.prototype, 'require').mockImplementation(function (this: NodeJS.Module, id: string) {
    if (id === '@/hooks/useRealtimeNotifications') return { useRealtimeNotifications: () => undefined }
    return originalRequire.call(this, id)
  })
})
afterEach(() => {
  cleanup()
  for (const client of clients.splice(0)) client.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('keeps the shell mounted as infrastructure health changes', async () => {
  localStorage.setItem(storageKey, JSON.stringify({ ...initialProgress, isChecklistDismissed: true }))
  const client = new QueryClient()
  renderShell(client)
  expect(screen.getByRole('button', { name: 'Usar o painel' })).toBeTruthy()

  await act(async () => {
    client.setQueryData(['healthStatus'], {
      ...health,
      services: { ...health.services, database: { status: 'error', provider: 'supabase' } },
    })
  })
  await screen.findByText('Configuração da infraestrutura')

  await act(async () => {
    client.setQueryData(['healthStatus'], health)
  })
  await screen.findByRole('button', { name: 'Usar o painel' })
})

describe('optional WhatsApp onboarding', () => {
  it.each(['explore', 'close', 'escape'])('dismisses via %s and preserves the preference without completing setup', async action => {
    const view = renderShell()
    await screen.findByRole('dialog', { name: 'Bem-vindo ao WhatsFlow!' })
    expect(screen.getByText('Para enviar e receber mensagens, conclua a conexão do WhatsApp em Configurações.')).toBeTruthy()
    if (action === 'escape') fireEvent.keyDown(document, { key: 'Escape' })
    else fireEvent.click(screen.getByRole('button', { name: action === 'explore' ? 'Explorar o painel' : 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('button', { name: 'Usar o painel' })).toBeTruthy()
    expect(document.body.style.pointerEvents).not.toBe('none')
    await waitFor(() => expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual({ ...initialProgress, isChecklistDismissed: true }))
    expectNoConnectionChanges()
    view.unmount()
    renderShell()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Usar o painel' })).toBeTruthy()
    expectNoConnectionChanges()
  })

  it('reopens and closes the real tutorial menu after a persisted dismissal', async () => {
    localStorage.setItem(storageKey, JSON.stringify({ ...initialProgress, isChecklistDismissed: true }))
    renderShell()
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Tutoriais de Configuração' }))
    fireEvent.click(await screen.findByRole('button', { name: /Requisitos Conta Meta Business/ }))
    await screen.findByRole('dialog', { name: 'Tutorial de Configuração' })
    expect(screen.getByText('O que você vai precisar')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual({ ...initialProgress, isChecklistDismissed: true })
    expectNoConnectionChanges()
  })
})

it('offers the optional connection on a new successful login, even when opening Inbox directly', async () => {
  localStorage.setItem(storageKey, JSON.stringify({ ...initialProgress, isChecklistDismissed: true }))
  mocks.fetch.mockImplementation(async (url: string) =>
    url === '/api/auth/status'
      ? Response.json({ isConfigured: true, isSetup: true, isAuthenticated: false })
      : Response.json({ success: true }),
  )

  const login = render(<LoginPage />)
  fireEvent.change(screen.getByLabelText('Senha de acesso'), { target: { value: 'test-password' } })
  fireEvent.click(screen.getByRole('button', { name: 'Entrar', exact: true }))
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/inbox'))
  login.unmount()

  // A previous onboarding completion can outlive the Meta credentials.
  mocks.onboardingCompleted = true
  mocks.pathname = '/inbox'
  renderShell()

  await screen.findByRole('dialog', { name: 'Bem-vindo ao WhatsFlow!' })
  fireEvent.click(screen.getByRole('button', { name: 'Explorar o painel' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(screen.getByRole('button', { name: 'Usar o painel' })).toBeTruthy()
  expect(mocks.save).not.toHaveBeenCalled()
  expect(mocks.saveMeta).not.toHaveBeenCalled()
  expect(mocks.markComplete).not.toHaveBeenCalled()
})

it('keeps the current onboarding choice when authentication fails', async () => {
  const previous = JSON.stringify({ ...initialProgress, isChecklistDismissed: true })
  localStorage.setItem(storageKey, previous)
  mocks.fetch.mockImplementation(async (url: string) =>
    url === '/api/auth/status'
      ? Response.json({ isConfigured: true, isSetup: true, isAuthenticated: false })
      : Response.json({ error: 'Senha inválida' }, { status: 401 }),
  )

  render(<LoginPage />)
  fireEvent.change(screen.getByLabelText('Senha de acesso'), { target: { value: 'invalid' } })
  fireEvent.click(screen.getByRole('button', { name: 'Entrar', exact: true }))
  await screen.findByText('Senha inválida')

  expect(localStorage.getItem(storageKey)).toBe(previous)
  expect(mocks.push).not.toHaveBeenCalled()
})
