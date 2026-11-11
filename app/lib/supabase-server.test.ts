// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient } from './supabase-server'

const requestState = vi.hoisted(() => ({ headers: new Headers(), validSession: false }))
vi.mock('next/headers', () => ({ headers: async () => requestState.headers, cookies: async () => ({ getAll: () => [] }) }))
vi.mock('@/lib/user-auth', () => ({ validateSession: async () => requestState.validSession }))

beforeEach(() => {
  requestState.headers = new Headers()
  requestState.validSession = false
  vi.stubEnv('WHATSFLOW_API_KEY', 'test-api-key')
  vi.stubEnv('NEON_DATA_API_URL', 'https://data.example.test/rest/v1')
  vi.stubEnv('NEON_DATA_API_PRIVATE_KEY', 'configured-key')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://legacy.example.test')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'legacy-public-key')
})
afterEach(() => vi.unstubAllEnvs())

describe('dashboard server client authorization', () => {
  it('rejects unauthenticated direct server action access', async () => {
    await expect(createClient()).rejects.toThrow(/autorizad|authorized/i)
  })
  it('provides the database client for a validated session without Supabase env', async () => {
    requestState.validSession = true
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '')
    const client = await createClient()
    expect(typeof client.from).toBe('function')
    expect(typeof client.rpc).toBe('function')
    expect('auth' in client).toBe(false)
  })
  it('accepts a real internal API key without a browser session', async () => {
    requestState.headers.set('authorization', 'Bearer test-api-key')
    expect(await createClient()).toBeTruthy()
  })
  it('does not let a valid session override an explicit invalid API key', async () => {
    requestState.validSession = true
    requestState.headers.set('authorization', 'Bearer invalid')
    await expect(createClient()).rejects.toThrow(/autorizad|authorized/i)
  })
})
