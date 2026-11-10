// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from './proxy'

const db = vi.hoisted(() => ({ sessions: [] as { token: string; createdAt: string }[] }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: (_: string, key: string) => ({ single: async () => ({ data: key === 'session_tokens' ? { value: JSON.stringify(db.sessions), updated_at: new Date().toISOString() } : null, error: null }) }) }) }) } }))
vi.mock('next/headers', () => ({ cookies: async () => { throw new Error('Proxy must pass request token explicitly') } }))

function request(path: string, token?: string, headers: Record<string, string> = {}) {
  return new NextRequest(`https://example.test${path}`, { headers: { ...headers, ...(token ? { cookie: `whatsflow_session=${token}` } : {}) } })
}

beforeEach(() => {
  vi.stubEnv('MASTER_PASSWORD', 'test-password')
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('WHATSFLOW_API_KEY', 'test-api-key')
  vi.stubEnv('WHATSFLOW_ADMIN_KEY', 'test-admin-key')
  db.sessions = [{ token: 'valid-session-token', createdAt: new Date().toISOString() }]
})
afterEach(() => vi.unstubAllEnvs())

describe('dashboard access boundary', () => {
  it.each(['/api/contacts', '/api/flows', '/api/flows/endpoint/keys', '/api/installer/bootstrap', '/api/webhook/info'])('rejects forged cookie for %s', async path => {
    expect((await proxy(request(path, 'forged-session-token'))).status).toBe(401)
  })
  it.each(['/flows', '/forms', '/dashboard', '/install'])('redirects forged page session for %s', async path => {
    const response = await proxy(request(path, 'forged-session-token'))
    expect(response.status).toBe(307)
    expect(new URL(response.headers.get('location')!).pathname).toBe('/login')
  })
  it('rejects expired sessions', async () => {
    db.sessions[0].createdAt = '2020-01-01T00:00:00Z'
    expect((await proxy(request('/api/contacts', 'valid-session-token'))).status).toBe(401)
  })
  it('accepts stored live session', async () => {
    expect((await proxy(request('/api/flows', 'valid-session-token'))).headers.get('x-middleware-next')).toBe('1')
  })
  it('accepts internal API key and preserves admin restriction', async () => {
    expect((await proxy(request('/api/contacts', undefined, { authorization: 'Bearer test-api-key' }))).status).toBe(200)
    expect((await proxy(request('/api/vercel/info', 'valid-session-token'))).status).toBe(401)
  })
  it.each(['/api/campaign/dispatch', '/api/campaign/workflow'])('rejects fabricated QStash signature at %s', async path => {
    expect((await proxy(request(path, undefined, { 'upstash-signature': 'forged' }))).status).toBe(401)
  })
  it.each(['/api/auth/login', '/api/auth/status', '/api/public/lead-forms/demo', '/api/webhook', '/api/flows/endpoint', '/f/demo'])('preserves public callback or form %s', async path => {
    expect((await proxy(request(path))).headers.get('x-middleware-next')).toBe('1')
  })
})
