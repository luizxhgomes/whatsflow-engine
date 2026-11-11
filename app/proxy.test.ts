// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy, config } from './proxy'
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'

const db = vi.hoisted(() => ({ sessions: [] as { token: string; createdAt: string }[] }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: (_: string, key: string) => ({ single: async () => ({ data: key === 'session_tokens' ? { value: JSON.stringify(db.sessions), updated_at: new Date().toISOString() } : null, error: null }) }) }) }) } }))
vi.mock('next/headers', () => ({ cookies: async () => { throw new Error('Proxy must pass request token explicitly') } }))

function request(path: string, token?: string, headers: Record<string, string> = {}) {
  return new NextRequest(`https://example.test${path}`, { headers: { ...headers, ...(token ? { cookie: `whatsflow_session=${token}` } : {}) } })
}

beforeEach(() => {
  vi.stubEnv('MASTER_PASSWORD', 'test-password')
  vi.stubEnv('INSTALLER_ENABLED', 'true')
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

describe('public JWKS boundary', () => {
  it.each(['', 'configured-password'])('allows the exact JWKS URL with or without setup (%s)', async password => {
    vi.stubEnv('MASTER_PASSWORD', password)
    expect((await proxy(request('/.well-known/jwks.json'))).headers.get('x-middleware-next')).toBe('1')
  })
  it.each(['/.well-known/jwks.json/private', '/.well-known/jwksXjson', '/.well-known/other'])('protects %s', async path => {
    expect((await proxy(request(path))).status).toBe(307)
  })
})

describe('proxy matcher boundaries', () => {
  it.each(['/faviconXico', '/manifest.json/private', '/openapi.yaml/private', '/_next/imagefake', '/api/contacts/export.png', '/_next/staticfake'])('protects %s', path => {
    expect(unstable_doesMiddlewareMatch({ config, url: `https://example.test${path}` })).toBe(true)
  })
  it.each(['/favicon.ico', '/manifest.json', '/sw.js', '/openapi.yaml', '/nexus.mp3', '/icons/icon-192.png', '/screenshots/mobile.png', '/_next/image', '/_next/static/chunks/app.js'])('allows only known static resource %s', path => {
    expect(unstable_doesMiddlewareMatch({ config, url: `https://example.test${path}` })).toBe(false)
  })
})

describe('signed private-media callback boundary', () => {
  it.each(['GET', 'HEAD'])('lets %s reach the exact signed-media handler without dashboard auth', async method => {
    const response = await proxy(new NextRequest('https://example.test/api/media?token=synthetic', { method }))
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })
  it.each([
    ['/api/media', 'POST'],
    ['/api/media', 'DELETE'],
    ['/api/media/private', 'GET'],
    ['/api/media/', 'HEAD'],
  ])('protects %s with %s', async (path, method) => {
    const response = await proxy(new NextRequest(`https://example.test${path}`, { method }))
    expect(response.status).toBe(401)
  })
})

describe('setup bootstrap boundary', () => {
  it.each(['', 'configured-password'])('requires admin proof for setup with MASTER_PASSWORD=%s', async password => {
    vi.stubEnv('MASTER_PASSWORD', password)
    expect((await proxy(request('/api/auth/setup'))).status).toBe(401)
    expect((await proxy(request('/api/auth/setup', 'valid-session-token'))).status).toBe(401)
    expect((await proxy(request('/api/auth/setup', undefined, { authorization: 'Bearer test-api-key' }))).status).toBe(401)
    expect((await proxy(request('/api/auth/setup', undefined, { authorization: 'Bearer test-admin-key' }))).headers.get('x-middleware-next')).toBe('1')
  })
  it('blocks setup when installer is disabled, while keeping bootstrap JWKS public', async () => {
    vi.stubEnv('MASTER_PASSWORD', '')
    vi.stubEnv('INSTALLER_ENABLED', 'false')
    expect((await proxy(request('/api/auth/setup', undefined, { authorization: 'Bearer test-admin-key' }))).status).toBe(403)
    expect((await proxy(request('/.well-known/jwks.json'))).headers.get('x-middleware-next')).toBe('1')
  })
})

describe('disabled installer boundary', () => {
  it.each(['', 'configured-password'])('blocks installer APIs with MASTER_PASSWORD=%s', async password => {
    vi.stubEnv('MASTER_PASSWORD', password)
    vi.stubEnv('INSTALLER_ENABLED', 'false')
    for (const path of ['/api/installer/bootstrap', '/api/installer/redis/validate', '/api/installer/qstash/validate']) {
      expect((await proxy(request(path, 'valid-session-token', { authorization: 'Bearer test-admin-key' }))).status).toBe(403)
    }
    expect((await proxy(request('/.well-known/jwks.json'))).status).toBe(200)
  })
  it('preserves the enabled initial installer before a password exists', async () => {
    vi.stubEnv('MASTER_PASSWORD', '')
    expect((await proxy(request('/api/installer/bootstrap'))).status).toBe(200)
  })
})
