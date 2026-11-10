// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST, DELETE } from './route'
const state = vi.hoisted(() => ({ values: {} as Record<string, string>, token: undefined as string | undefined }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => state.token ? { value: state.token } : undefined }) }))
vi.mock('@/lib/supabase', () => ({ isSupabaseConfigured: () => true, supabase: { from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }) } }))
vi.mock('@/lib/supabase-db', () => ({ settingsDb: { get: async (key: string) => state.values[key] || null, set: async (key: string, value: string) => { state.values[key] = value } } }))
vi.mock('@/lib/whatsapp-credentials', () => ({ getWhatsAppCredentials: async () => null }))
vi.mock('@/lib/meta-flows-api', () => ({ metaSetEncryptionPublicKey: vi.fn() }))
beforeEach(() => { state.values = { whatsapp_flow_private_key: 'private-key-original', whatsapp_flow_public_key: 'public-key-original' }; state.token = undefined })
describe('RSA management requires authentication even without the proxy', () => {
  it.each([['GET', GET], ['POST', POST], ['DELETE', DELETE]] as const)('denies anonymous %s and preserves stored keys', async (method, handler) => {
    const response = await handler(new Request('https://example.test/api/flows/endpoint/keys', { method }))
    expect(response.status).toBe(401)
    expect(state.values.whatsapp_flow_private_key).toBe('private-key-original')
    expect(state.values.whatsapp_flow_public_key).toBe('public-key-original')
  })
})
