// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getContactsInitialData } from '../contacts/actions'
import { getSubmissionsInitialData } from '../submissions/actions'
import { getFormsInitialData } from '../forms/actions'
import { getInboxInitialData } from '../inbox/actions'
import { getCampaignsInitialData } from '../campaigns/actions'
import { getDashboardData } from './dashboard'

const state = vi.hoisted(() => ({ headers: new Headers() }))
vi.mock('next/headers', () => ({ headers: async () => state.headers, cookies: async () => ({ get: () => undefined }) }))
let requests: string[]
beforeEach(() => {
  state.headers = new Headers()
  requests = []
  for (const key of ['NEON_DATA_API_URL', 'NEON_DATA_API_PRIVATE_KEY', 'NEON_DATA_API_PUBLIC_JWK']) vi.stubEnv(key, '')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://legacy.example.test')
  vi.stubEnv('SUPABASE_SECRET_KEY', 'synthetic-server-key')
  vi.stubEnv('WHATSFLOW_API_KEY', 'synthetic-api-key')
  vi.stubGlobal('fetch', async (input: string | URL) => {
    requests.push(input.toString())
    return new Response('[]', { headers: { 'content-type': 'application/json', 'content-range': '*/0' } })
  })
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('dashboard server actions', () => {
  it.each([
    ['contacts', () => getContactsInitialData()],
    ['submissions', () => getSubmissionsInitialData({})],
    ['forms', () => getFormsInitialData()],
    ['inbox', () => getInboxInitialData()],
    ['campaigns', () => getCampaignsInitialData()],
    ['dashboard', () => getDashboardData()],
  ] as const)('rejects direct unauthenticated %s access before querying data', async (_, action) => {
    await expect(action()).rejects.toThrow(/autorizad|authorized/i)
    expect(requests).toHaveLength(0)
  })

  it('preserves contacts data for an authenticated caller', async () => {
    state.headers.set('authorization', 'Bearer synthetic-api-key')
    expect(await getContactsInitialData()).toMatchObject({ contacts: [], total: 0, tags: [] })
    expect(requests.some(url => new URL(url).pathname === '/rest/v1/contacts')).toBe(true)
  })

  it('preserves submissions data for an authenticated caller', async () => {
    state.headers.set('authorization', 'Bearer synthetic-api-key')
    expect(await getSubmissionsInitialData({ flowId: 'flow-1' })).toMatchObject({ submissions: [], total: 0 })
    expect(new URL(requests[0]).searchParams.get('flow_id')).toBe('eq.flow-1')
  })
})
