import { getNeonPublicJwks } from '@/lib/neon-data-api'

export const dynamic = 'force-dynamic'

export function GET() {
  try {
    return Response.json(getNeonPublicJwks(), {
      headers: { 'Cache-Control': 'public, max-age=300' },
    })
  } catch {
    return Response.json({ error: 'Chave pública indisponível' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}
