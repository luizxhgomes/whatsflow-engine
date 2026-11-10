import { PostgrestClient } from '@supabase/postgrest-js'
import { importPKCS8, SignJWT } from 'jose'

// Keep this module browser-compatible: supabase.ts is also imported by UI hooks.
// Administrative operations are available only in the server runtime.
export type DatabaseClient = Pick<PostgrestClient<any>, 'from' | 'rpc'>

const KEY_ID = 'whatsflow-data-v1'
let signingKey: { source: string; key: ReturnType<typeof importPKCS8> } | undefined

export function hasNeonDataApiConfiguration(): boolean {
  return !!(process.env.WHATSFLOW_POSTGREST_URL || process.env.NEON_DATA_API_URL || process.env.NEON_DATA_API_PRIVATE_KEY || process.env.NEON_DATA_API_PUBLIC_JWK)
}

export function isNeonDataApiConfigured(): boolean {
  return typeof window === 'undefined' && !!((process.env.WHATSFLOW_POSTGREST_URL || process.env.NEON_DATA_API_URL) && process.env.NEON_DATA_API_PRIVATE_KEY)
}

async function signAccessToken(source: string): Promise<string> {
  if (typeof window !== 'undefined') throw new Error('Acesso ao banco restrito ao servidor')
  try {
    if (signingKey?.source !== source) {
      const pem = source.includes('-----BEGIN PRIVATE KEY-----') ? source : atob(source)
      signingKey = { source, key: importPKCS8(pem, 'RS256') }
    }
    return await new SignJWT({ role: 'service_role' })
      .setProtectedHeader({ alg: 'RS256', kid: KEY_ID })
      .setSubject('whatsflow')
      .setAudience('whatsflow-data')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(await signingKey.key)
  } catch {
    throw new Error('Chave de acesso ao Neon inválida')
  }
}

export function getNeonDataApiClient(): DatabaseClient | null {
  if (!isNeonDataApiConfigured()) return null
  let base: URL
  try {
    base = new URL(process.env.WHATSFLOW_POSTGREST_URL || process.env.NEON_DATA_API_URL!)
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) throw new Error()
  } catch {
    throw new Error('URL da Data API Neon inválida')
  }
  const privateKey = process.env.NEON_DATA_API_PRIVATE_KEY!
  const baseUrl = base.href.replace(/\/$/, '')
  return new PostgrestClient(baseUrl, {
    // Disable broad SDK retries; only the pre-SQL JWK cache miss is retried below.
    retry: false,
    fetch: async (input, init) => {
      if (typeof window !== 'undefined') throw new Error('Acesso ao banco restrito ao servidor')
      const target = new URL(input instanceof Request ? input.url : input.toString())
      if (target.origin !== base.origin || !target.pathname.startsWith(`${base.pathname.replace(/\/$/, '')}/`)) {
        throw new Error('Destino da Data API Neon inválido')
      }
      const headers = new Headers(init?.headers)
      headers.set('Authorization', `Bearer ${await signAccessToken(privateKey)}`)
      const callerSignal = init?.signal === undefined && input instanceof Request ? input.signal : init?.signal
      const requestInit: RequestInit = {
        ...init, headers, redirect: 'error', cache: 'no-store',
        // Next memoizes GET responses during SSR even with no-store; retries must reach the network.
        signal: callerSignal ?? new AbortController().signal,
      }
      // PostgREST sends serialized strings. Streams and Request bodies cannot be replayed safely.
      const replayable = !(input instanceof Request) && (init?.body == null || typeof init.body === 'string')
      for (let attempt = 0; ; attempt += 1) {
        const response = await fetch(input, requestInit)
        if (!replayable || response.status !== 400 || attempt === 2) return response
        const error = await response.clone().json().catch(() => null)
        // Neon rejects this exact cache miss before SQL; SQL/PostgREST error codes must not retry.
        if (error?.message !== 'jwk not found' || error?.code !== null) return response
        await new Promise(resolve => setTimeout(resolve, attempt === 0 ? 100 : 250))
      }
    },
  })
}

/** Public verification material only, even if an operator supplied a private JWK. */
export function getNeonPublicJwks() {
  try {
    const key = JSON.parse(process.env.NEON_DATA_API_PUBLIC_JWK || '')
    if (key.kty !== 'RSA' || typeof key.n !== 'string' || typeof key.e !== 'string' ||
      !/^[A-Za-z0-9_-]+$/.test(key.n) || !/^[A-Za-z0-9_-]+$/.test(key.e)) throw new Error()
    return { keys: [{ kty: 'RSA', n: key.n, e: key.e, alg: 'RS256', use: 'sig', kid: KEY_ID }] }
  } catch {
    throw new Error('Chave pública da Data API Neon não configurada')
  }
}
