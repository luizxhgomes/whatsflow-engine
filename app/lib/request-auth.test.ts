// @vitest-environment node
import { beforeEach, afterEach, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'
import { getLocalWorkflowHeaders } from './request-auth'
const state = vi.hoisted(() => ({ token: undefined as string | undefined }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => state.token ? { value: state.token } : undefined }) }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: (_: string, key: string) => ({ single: async () => ({ data: key === 'session_tokens' ? { value: JSON.stringify([{ token: 'valid-session-token', createdAt: new Date(Date.now() - 1000).toISOString() }]) } : null, error: null }) }) }) }) } }))
const destination = 'http://localhost:3217/api/campaign/workflow'
beforeEach(() => { state.token = undefined; vi.stubEnv('MASTER_PASSWORD', 'test-password'); vi.stubEnv('WHATSFLOW_API_KEY', ''); vi.stubEnv('WHATSFLOW_ADMIN_KEY', '') })
afterEach(() => vi.unstubAllEnvs())
it('authenticates a local workflow call with the server API key', async () => {
  vi.stubEnv('WHATSFLOW_API_KEY', 'test-api-key')
  const headers = await getLocalWorkflowHeaders(destination)
  expect((await proxy(new NextRequest(destination, { method: 'POST', headers }))).headers.get('x-middleware-next')).toBe('1')
})
it('authenticates a local workflow call with a verified session when no key exists', async () => {
  state.token = 'valid-session-token'
  const headers = await getLocalWorkflowHeaders(destination)
  expect((await proxy(new NextRequest(destination, { method: 'POST', headers }))).headers.get('x-middleware-next')).toBe('1')
})
it('fails closed without a server key or verified session', async () => {
  state.token = 'forged-session-token'
  await expect(getLocalWorkflowHeaders(destination)).rejects.toThrow()
})
it('never forwards server credentials to a hostname containing localhost', async () => {
  vi.stubEnv('WHATSFLOW_API_KEY', 'test-api-key')
  await expect(getLocalWorkflowHeaders('https://localhost.attacker.test/api/campaign/workflow')).rejects.toThrow()
})
