// @vitest-environment node
import { beforeAll, beforeEach, afterEach, it, expect, vi } from 'vitest'
import { generateKeyPairSync } from 'node:crypto'
import { NextRequest } from 'next/server'
import { GET as diagnose } from './route'
import { POST as receive } from '../route'
const state = vi.hoisted(() => ({ values: {} as Record<string, string> }))
vi.mock('@/lib/supabase-db', () => ({ settingsDb: { get: async (key: string) => state.values[key] || null } }))
vi.mock('@/lib/whatsapp/flow-endpoint-handlers', () => ({ handleFlowAction: vi.fn() }))
vi.mock('@/lib/whatsapp-credentials', () => ({ getWhatsAppCredentials: vi.fn() }))
vi.mock('@/lib/meta-flows-api', () => ({ metaSetEncryptionPublicKey: vi.fn() }))
beforeAll(() => {
  const pair = generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } })
  state.values = { whatsapp_flow_public_key: pair.publicKey, whatsapp_flow_private_key: pair.privateKey }
})
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://example.test')
  vi.stubEnv('VERCEL_URL', '')
  vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', '')
  vi.stubEnv('WHATSFLOW_API_KEY', 'test-internal-api-key')
  vi.stubEnv('META_APP_SECRET', 'test-real-meta-secret')
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => receive(new NextRequest(url, init)))
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
function request(key = 'test-internal-api-key') { return new Request('https://example.test/api/flows/endpoint/test', { headers: { authorization: `Bearer ${key}` } }) }
it('completes a signed encrypted ping against the real Flow callback', async () => {
  const response = await diagnose(request())
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ ok: true, status: 200 })
})
it('denies an untrusted diagnostic caller', async () => {
  expect((await diagnose(request('forged'))).status).toBe(401)
})
it('fails closed when the Meta secret is missing', async () => {
  vi.stubEnv('META_APP_SECRET', '')
  expect((await diagnose(request())).status).toBe(503)
})
