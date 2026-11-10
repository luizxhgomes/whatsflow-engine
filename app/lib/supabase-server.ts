import { headers } from 'next/headers'
import { verifyApiKey } from '@/lib/auth'
import { validateSession } from '@/lib/user-auth'
import { getSupabaseAdmin, type DatabaseClient } from '@/lib/supabase'

/** Database access for dashboard actions and authenticated API handlers. */
export async function createClient(): Promise<DatabaseClient> {
  const requestHeaders = await headers()
  const hasApiKey = !!requestHeaders.get('authorization') || !!requestHeaders.get('x-api-key')
  const authorized = hasApiKey
    ? (await verifyApiKey({ headers: requestHeaders })).valid
    : await validateSession()
  if (!authorized) throw new Error('Acesso não autorizado')

  const client = getSupabaseAdmin()
  if (!client) throw new Error('Banco de dados não configurado')
  return client
}
