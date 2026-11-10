// @vitest-environment node
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { exportJWK, exportPKCS8, generateKeyPair, importJWK, jwtVerify, type JWK } from 'jose'
import { getNeonDataApiClient } from './neon-data-api'
import { getSupabaseAdmin, getSupabaseBrowser, isSupabaseConfigured, supabase } from './supabase'

let privateKey: string
let publicJwk: JWK
let calls: { url: URL; init: RequestInit }[]
let response: Response
let queuedResponses: Response[]

beforeAll(async () => {
  const keys = await generateKeyPair('RS256', { extractable: true })
  privateKey = btoa(await exportPKCS8(keys.privateKey))
  publicJwk = await exportJWK(keys.publicKey)
})
beforeEach(() => {
  vi.stubEnv('NEON_DATA_API_URL', 'https://data.example.test/project/rest/v1')
  vi.stubEnv('NEON_DATA_API_PRIVATE_KEY', privateKey)
  vi.stubEnv('NEON_DATA_API_PUBLIC_JWK', JSON.stringify(publicJwk))
  for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']) vi.stubEnv(key, '')
  calls = []
  queuedResponses = []
  response = new Response(JSON.stringify([{ id: 'contact-1', conversations: [{ id: 'thread-1' }] }]), {
    headers: { 'content-type': 'application/json', 'content-range': '0-0/17' },
  })
  vi.stubGlobal('fetch', async (input: string | URL | Request, init: RequestInit) => {
    calls.push({ url: new URL(input instanceof Request ? input.url : input), init })
    return queuedResponses.shift() ?? response
  })
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('Neon database facade', () => {
  it('queries Neon without Supabase credentials and signs a short server JWT', async () => {
    expect(isSupabaseConfigured()).toBe(true)
    const result = await supabase.from('contacts').select('id,conversations(id)', { count: 'exact' }).eq('status', 'active').range(0, 9)
    expect(result.data).toEqual([{ id: 'contact-1', conversations: [{ id: 'thread-1' }] }])
    expect(result.count).toBe(17)
    expect(calls[0].url.pathname).toBe('/project/rest/v1/contacts')
    expect(calls[0].url.searchParams.get('select')).toBe('id,conversations(id)')
    expect(calls[0].url.searchParams.get('status')).toBe('eq.active')
    const headers = new Headers(calls[0].init.headers)
    expect(headers.get('prefer')).toContain('count=exact')
    expect(headers.has('apikey')).toBe(false)
    const jwt = headers.get('authorization')!.replace('Bearer ', '')
    const { payload, protectedHeader } = await jwtVerify(jwt, await importJWK(publicJwk, 'RS256'), { audience: 'whatsflow-data', algorithms: ['RS256'] })
    expect(payload.sub).toBe('whatsflow')
    expect(payload.role).toBe('service_role')
    expect(protectedHeader.kid).toBe('whatsflow-data-v1')
    expect(payload.exp! - payload.iat!).toBeGreaterThan(0)
    expect(payload.exp! - payload.iat!).toBeLessThanOrEqual(300)
    expect(calls[0].init.redirect).toBe('error')
  })

  it('preserves upsert conflict handling and RPC payloads', async () => {
    await supabase.from('settings').upsert({ key: 'example', value: 'saved' }, { onConflict: 'key' }).select()
    expect(calls[0].url.searchParams.get('on_conflict')).toBe('key')
    expect(new Headers(calls[0].init.headers).get('prefer')).toContain('resolution=merge-duplicates')
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ key: 'example', value: 'saved' })
    response = new Response('7', { headers: { 'content-type': 'application/json' } })
    expect((await supabase.rpc('increment_counter', { counter_id: 'counter-1' })).data).toBe(7)
    expect(calls[1].url.pathname).toBe('/project/rest/v1/rpc/increment_counter')
    expect(calls[1].init.method).toBe('POST')
    expect(JSON.parse(calls[1].init.body as string)).toEqual({ counter_id: 'counter-1' })
  })

  it('preserves database error codes and HTTP status', async () => {
    response = new Response(JSON.stringify({ code: '23505', message: 'duplicate key', details: 'Already exists', hint: null }), { status: 409, headers: { 'content-type': 'application/json' } })
    const result = await supabase.from('settings').insert({ key: 'duplicate' })
    expect(result).toMatchObject({ data: null, status: 409, error: { code: '23505', message: 'duplicate key', details: 'Already exists' } })
  })

  it('never returns an admin client in the browser, even with server env values', () => {
    vi.stubGlobal('window', {})
    expect(getSupabaseAdmin()).toBeNull()
    expect(getSupabaseBrowser()).toBeNull()
    expect(() => supabase.from('settings')).toThrow()
    expect(calls).toHaveLength(0)
  })

  it.each(['NEON_DATA_API_PRIVATE_KEY', 'NEON_DATA_API_URL'])('fails closed with partial Neon config (%s missing)', missing => {
    vi.stubEnv(missing, '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://legacy.example.test')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'legacy-service-key')
    expect(isSupabaseConfigured()).toBe(false)
    expect(getSupabaseAdmin()).toBeNull()
    expect(() => supabase.from('settings')).toThrow()
    expect(calls).toHaveLength(0)
  })

  it('does not send requests with an invalid private key', async () => {
    vi.stubEnv('NEON_DATA_API_PRIVATE_KEY', btoa('invalid secret material'))
    const result = await supabase.from('settings').select()
    expect(result.error).toBeTruthy()
    expect(JSON.stringify(result.error)).not.toContain('invalid secret material')
    expect(calls).toHaveLength(0)
  })
})


const jwkError = { message: 'jwk not found', code: null, detail: null, hint: null }
const dataUrl = 'https://data.example.test/project/rest/v1/settings'

function transport() {
  // Exercise the exact custom fetch installed in the real PostgREST client.
  return (getNeonDataApiClient() as unknown as { fetch: typeof fetch }).fetch
}

function jwkResponse() {
  return Response.json(jwkError, { status: 400 })
}

describe('Neon JWK cache recovery', () => {
  it('retries GET at most twice with 100/250 ms waits and the same signed request', async () => {
    const timer = vi.spyOn(globalThis, 'setTimeout')
    queuedResponses = [jwkResponse(), jwkResponse()]
    const result = await supabase.from('settings').select('key').eq('key', 'example')
    expect(result.error).toBeNull()
    expect(result.data).toEqual([{ id: 'contact-1', conversations: [{ id: 'thread-1' }] }])
    expect(calls).toHaveLength(3)
    expect(timer.mock.calls.map(call => call[1])).toEqual([100, 250])
    for (const call of calls) {
      expect(call.url.href).toBe(calls[0].url.href)
      expect(call.init).toBe(calls[0].init)
      expect(call.init).toMatchObject({ method: 'GET', cache: 'no-store', redirect: 'error' })
      expect(new Headers(call.init.headers).get('authorization')).toMatch(/^Bearer /)
    }
  })

  it('replays a serialized mutation only after the pre-SQL authentication error', async () => {
    queuedResponses = [jwkResponse()]
    response = Response.json(7)
    const result = await supabase.rpc('increment_counter', { counter_id: 'counter-1' })
    expect(result.data).toBe(7)
    expect(calls).toHaveLength(2)
    expect(calls[0].init.method).toBe('POST')
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ counter_id: 'counter-1' })
    expect(calls[1].init).toBe(calls[0].init)
    expect(calls[1].url.href).toBe(calls[0].url.href)
  })

  it('returns the last original 400 response unchanged after three attempts', async () => {
    const lastResponse = jwkResponse()
    queuedResponses = [jwkResponse(), jwkResponse(), lastResponse]
    const result = await transport()(dataUrl)
    expect(calls).toHaveLength(3)
    expect(result).toBe(lastResponse)
    expect(result.status).toBe(400)
    expect(await result.json()).toEqual(jwkError)
  })

  it.each([401, 403, 408, 409, 429, 500, 502, 503, 504])('never retries HTTP %i even with the JWK message', async status => {
    response = Response.json(jwkError, { status })
    const result = await supabase.from('settings').select()
    expect(calls).toHaveLength(1)
    expect(result.status).toBe(status)
    expect(result.error).toMatchObject(jwkError)
  })

  it.each([
    { message: 'jwk not found', code: 'P0001' },
    { message: 'jwk not found', code: 'PGRST301' },
    { message: 'jwk not found' },
    { message: 'Jwk not found', code: null },
    { message: 'jwk not found ', code: null },
    { message: 'other error', code: null },
    { message: 400, code: null },
    null,
    [],
  ])('does not retry other 400 payloads: %j', async payload => {
    response = Response.json(payload, { status: 400 })
    const result = await transport()(dataUrl)
    expect(calls).toHaveLength(1)
    expect(result).toBe(response)
    expect(await result.json()).toEqual(payload)
  })

  it('preserves an unreadable/non-JSON 400 response without retrying', async () => {
    response = new Response('jwk not found', { status: 400 })
    const result = await transport()(dataUrl)
    expect(calls).toHaveLength(1)
    expect(result).toBe(response)
    expect(await result.text()).toBe('jwk not found')
  })

  it.each([
    () => new ReadableStream(),
    () => new FormData(),
    () => new Blob(['body']),
    () => new URLSearchParams('key=value'),
  ])('does not replay a body that is not a serialized string (%#)', async body => {
    response = jwkResponse()
    const result = await transport()(dataUrl, { method: 'POST', body: body() })
    expect(calls).toHaveLength(1)
    expect(result).toBe(response)
  })

  it('does not replay a Request carrying a body', async () => {
    response = jwkResponse()
    const request = new Request(dataUrl, { method: 'POST', body: 'body' })
    const result = await transport()(request)
    expect(calls).toHaveLength(1)
    expect(result).toBe(response)
  })

  it('does not retry network exceptions', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('network unavailable'))
    vi.stubGlobal('fetch', fetchMock)
    await expect(transport()(dataUrl)).rejects.toThrow('network unavailable')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each([
    'https://other.example.test/project/rest/v1/settings',
    'https://data.example.test/project/rest/v10/settings',
  ])('rejects targets outside the configured origin and path: %s', async target => {
    await expect(transport()(target)).rejects.toThrow('Destino da Data API Neon inválido')
    expect(calls).toHaveLength(0)
  })
})
