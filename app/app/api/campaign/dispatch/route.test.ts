// @vitest-environment node
import { expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'forged-session' }) }) }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }) } }))
vi.mock('@/lib/supabase-db', () => ({ templateDb: {} }))
vi.mock('@/lib/whatsapp-credentials', () => ({ getWhatsAppCredentials: vi.fn() }))
vi.mock('@/lib/whatsapp-adaptive-throttle', () => ({ getAdaptiveThrottleConfigWithSource: vi.fn() }))
vi.mock('@/lib/whatsapp/template-contract', () => ({ precheckContactForTemplate: vi.fn() }))
vi.mock('@/lib/phone-suppressions', () => ({ getActiveSuppressionsByPhone: vi.fn() }))
vi.mock('@/lib/server-http', () => ({ fetchWithTimeout: vi.fn(), safeJson: vi.fn() }))
it.each([{}, { 'upstash-signature': 'forged' }, { cookie: 'whatsflow_session=forged-session' }])('rejects unauthorized dispatch directly', async headers => {
  const response = await POST(new NextRequest('https://example.test/api/campaign/dispatch', { method: 'POST', body: '{}', headers }))
  expect(response.status).toBe(401)
})
