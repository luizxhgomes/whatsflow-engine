// @vitest-environment node
import { expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
vi.mock('@/lib/supabase-db', () => ({ settingsDb: { get: async () => null } }))
vi.mock('@/lib/whatsapp/flow-endpoint-handlers', () => ({ handleFlowAction: vi.fn() }))
vi.mock('@/lib/whatsapp-credentials', () => ({ getWhatsAppCredentials: vi.fn() }))
vi.mock('@/lib/meta-flows-api', () => ({ metaSetEncryptionPublicKey: vi.fn() }))
it('rejects an unsigned Meta flow request before body handling or key rotation', async () => {
  vi.stubEnv('META_APP_SECRET', 'test-meta-secret')
  const response = await POST(new NextRequest('https://example.test/api/flows/endpoint', { method: 'POST', body: '{}' }))
  vi.unstubAllEnvs()
  expect(response.status).toBe(401)
})
