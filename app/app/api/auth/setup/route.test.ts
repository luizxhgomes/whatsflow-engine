// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { completeSetup } from '@/lib/user-auth'

const state = vi.hoisted(() => ({
  settings: new Map<string, { value: string; updated_at: string }>(),
  writes: [] as string[],
  cookies: [] as { name: string; value: string }[],
}))
// Persist writes in memory; keep completeSetup and session creation real.
vi.mock('@/lib/supabase', () => ({ supabase: { from: (table: string) => {
  if (table !== 'settings') throw new Error('Unexpected table')
  return {
    select: () => ({ eq: (_: string, key: string) => ({ single: async () => ({ data: state.settings.get(key) ?? null, error: null }) }) }),
    upsert: async (row: { key: string; value: string; updated_at: string }) => {
      state.writes.push(row.key)
      state.settings.set(row.key, { value: row.value, updated_at: row.updated_at })
      return { error: null }
    },
  }
} } }))
vi.mock('next/headers', () => ({ cookies: async () => ({
  set: (name: string, value: string) => state.cookies.push({ name, value }),
}) }))

const body = { companyName: 'Fixture Company', companyAdmin: 'Fixture Admin', email: 'admin@example.test', phone: '+5511999999999' }
function request(headers: Record<string, string> = {}) {
  return new NextRequest('https://example.test/api/auth/setup', {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
  })
}
function expectNoWritesOrSession() {
  expect(state.writes).toEqual([])
  expect(state.settings.size).toBe(0)
  expect(state.cookies).toEqual([])
}
beforeEach(() => {
  state.settings.clear(); state.writes = []; state.cookies = []
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('MASTER_PASSWORD', '')
  vi.stubEnv('SETUP_COMPLETE', '')
  vi.stubEnv('INSTALLER_ENABLED', 'true')
  vi.stubEnv('WHATSFLOW_ADMIN_KEY', 'synthetic-admin-key')
  vi.stubEnv('WHATSFLOW_API_KEY', 'synthetic-api-key')
})
afterEach(() => vi.unstubAllEnvs())

describe('setup authorization at the handler and mutation boundary', () => {
  it.each(['', 'configured-password'])('denies anonymous setup with MASTER_PASSWORD=%s without mutations', async password => {
    vi.stubEnv('MASTER_PASSWORD', password)
    expect((await POST(request())).status).toBe(401)
    expectNoWritesOrSession()
  })
  it.each([
    { authorization: 'Bearer forged-key' },
    { authorization: 'Bearer synthetic-api-key' },
    { cookie: 'whatsflow_session=forged-session' },
  ])('rejects non-admin credentials without mutations', async headers => {
    expect((await POST(request(headers))).status).toBe(401)
    expectNoWritesOrSession()
  })
  it('denies setup when disabled even with an authorized admin key', async () => {
    vi.stubEnv('INSTALLER_ENABLED', 'false')
    expect((await POST(request({ authorization: 'Bearer synthetic-admin-key' }))).status).toBe(403)
    expectNoWritesOrSession()
  })
  it('allows an authorized admin to complete setup and creates a stored session', async () => {
    const response = await POST(request({ authorization: 'Bearer synthetic-admin-key' }))
    expect(response.status).toBe(200)
    expect(state.settings.get('company_name')?.value).toBe('Fixture Company')
    const sessions = JSON.parse(state.settings.get('session_tokens')!.value)
    expect(sessions).toHaveLength(1)
    expect(state.cookies).toEqual([{ name: 'whatsflow_session', value: sessions[0].token }])
  })
  it('denies a direct completeSetup call without authentication proof', async () => {
    const result = await completeSetup(body.companyName, body.companyAdmin, body.email, body.phone)
    expect(result.success).toBe(false)
    expectNoWritesOrSession()
  })
  it('denies a direct completeSetup call with a forged proof', async () => {
    const result = await completeSetup(body.companyName, body.companyAdmin, body.email, body.phone, request({ authorization: 'Bearer forged-key' }))
    expect(result.success).toBe(false)
    expectNoWritesOrSession()
  })
  it('enforces the disabled installer at the direct mutation boundary too', async () => {
    vi.stubEnv('INSTALLER_ENABLED', 'false')
    const result = await completeSetup(body.companyName, body.companyAdmin, body.email, body.phone, request({ authorization: 'Bearer synthetic-admin-key' }))
    expect(result.success).toBe(false)
    expectNoWritesOrSession()
  })
})
