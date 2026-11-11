// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createHmac } from 'node:crypto'
import { NextRequest } from 'next/server'
import { verifyMetaWebhookSignature } from './webhook-signature'
vi.mock('@/lib/supabase-db', () => ({ settingsDb: { get: async () => null } }))
afterEach(() => vi.unstubAllEnvs())
const rawBody = '{"message":"Olá"}'
const secret = 'test-meta-app-secret'
const signature = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`
function check(header: string, body = rawBody) {
  return verifyMetaWebhookSignature({ request: new NextRequest('https://example.test/api/webhook', { headers: { 'x-hub-signature-256': header } }), rawBody: body })
}
describe('Meta callback authentication', () => {
  it('accepts the real HMAC over raw bytes', async () => {
    vi.stubEnv('META_APP_SECRET', secret)
    expect(await check(signature)).toEqual({ valid: true, mode: 'verified' })
  })
  it.each(['', 'fake', 'sha256=' + '0'.repeat(64)])('rejects absent or forged signature %s', async header => {
    vi.stubEnv('META_APP_SECRET', secret)
    expect((await check(header)).valid).toBe(false)
  })
  it('rejects a changed body', async () => {
    vi.stubEnv('META_APP_SECRET', secret)
    expect((await check(signature, '{}')).valid).toBe(false)
  })
  it('fails closed in production even if unsigned development flag is set', async () => {
    vi.stubEnv('META_APP_SECRET', '')
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('WEBHOOK_ALLOW_UNSIGNED', 'true')
    expect(await check('')).toEqual({ valid: false, reason: 'missing_secret' })
  })
})
