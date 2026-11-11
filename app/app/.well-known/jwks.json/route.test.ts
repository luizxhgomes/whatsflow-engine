// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLocalJWKSet, exportJWK, generateKeyPair, jwtVerify, SignJWT } from 'jose'
import { GET } from './route'

afterEach(() => vi.unstubAllEnvs())

describe('Neon public JWKS', () => {
  it('exposes a verifiable public key but never private JWK fields', async () => {
    const { privateKey } = await generateKeyPair('RS256', { extractable: true })
    const privateJwk = await exportJWK(privateKey)
    vi.stubEnv('NEON_DATA_API_PUBLIC_JWK', JSON.stringify({ ...privateJwk, unexpected: 'private operator note' }))
    const response = GET()
    expect(response.status).toBe(200)
    const jwks = await response.json()
    expect(Object.keys(jwks.keys[0]).sort()).toEqual(['alg', 'e', 'kid', 'kty', 'n', 'use'])
    const token = await new SignJWT({ role: 'service_role' }).setProtectedHeader({ alg: 'RS256', kid: 'whatsflow-data-v1' }).setAudience('whatsflow-data').setExpirationTime('5m').sign(privateKey)
    expect((await jwtVerify(token, createLocalJWKSet(jwks), { audience: 'whatsflow-data' })).payload.role).toBe('service_role')
    expect(response.headers.get('cache-control')).toContain('max-age=300')
  })

  it.each(['', '{invalid', JSON.stringify({ kty: 'oct', k: 'private-secret' }), JSON.stringify({ kty: 'RSA', n: '', e: 'AQAB' })])('fails safely for absent or invalid public key', async value => {
    vi.stubEnv('NEON_DATA_API_PUBLIC_JWK', value)
    const response = GET()
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain('private-secret')
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
})
