import { cookies } from 'next/headers'
import { type AuthResult, unauthorizedResponse, verifyApiKey } from '@/lib/auth'
import { validateSession } from '@/lib/user-auth'

/**
 * Require either:
 * - a valid browser session (whatsflow_session cookie), OR
 * - a valid API key (Authorization: Bearer ... / X-API-Key)
 *
 * Security goal: defense-in-depth for critical endpoints (PII, destructive actions),
 * even if Proxy rules change or a route is accidentally exposed.
 */
export async function requireSessionOrApiKey(request: Request) {
  const hasApiKeyHeader =
    !!request.headers.get('authorization') || !!request.headers.get('x-api-key')

  if (hasApiKeyHeader) {
    const auth: AuthResult = await verifyApiKey(request)
    if (!auth.valid) return unauthorizedResponse(auth.error)
    return null
  }

  // Fall back to session-based access for browser UI.
  const ok = await validateSession()
  if (!ok) return unauthorizedResponse('Missing session or API key')
  return null
}


/** Local workflow calls keep authentication without forwarding arbitrary request headers. */
export async function getLocalWorkflowHeaders(destination: string): Promise<Record<string, string>> {
  const url = new URL(destination)
  if (!['http:', 'https:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Destino do workflow local inválido')
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const apiKey = process.env.WHATSFLOW_API_KEY || process.env.WHATSFLOW_ADMIN_KEY
  if (apiKey) return { ...headers, Authorization: `Bearer ${apiKey}` }
  const token = (await cookies()).get('whatsflow_session')?.value
  if (token && await validateSession(token)) {
    return { ...headers, Cookie: `whatsflow_session=${encodeURIComponent(token)}` }
  }
  throw new Error('Workflow local requer uma chave de API ou sessão válida')
}
