import { get, head, BlobError, BlobNotFoundError } from '@vercel/blob'
import { verifySignedMediaUrl } from '@/lib/media-storage'

export const dynamic = 'force-dynamic'

async function serve(request: Request, metadataOnly: boolean) {
  const path = verifySignedMediaUrl(new URL(request.url))
  if (!path) return Response.json({ error: 'URL de mídia inválida ou expirada' }, { status: 403 })
  try {
    const headers = new Headers({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' })
    if (metadataOnly) {
      const blob = await head(path)
      headers.set('Content-Type', blob.contentType)
      headers.set('Content-Length', String(blob.size))
      return new Response(null, { headers })
    }
    const range = request.headers.get('range')
    const result = await get(path, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') || undefined,
      headers: range ? { Range: range } : undefined,
    })
    if (!result) return Response.json({ error: 'Mídia não encontrada' }, { status: 404 })
    headers.set('ETag', result.blob.etag)
    if (result.statusCode === 304) return new Response(null, { status: 304, headers })
    headers.set('Content-Type', result.blob.contentType)
    for (const name of ['content-length', 'content-range', 'accept-ranges']) {
      const value = result.headers.get(name)
      if (value) headers.set(name, value)
    }
    return new Response(result.stream, { status: headers.has('content-range') ? 206 : 200, headers })
  } catch (error) {
    // SDK 2.9 exposes failed GET status only in BlobError.message.
    if (error instanceof BlobError && /Failed to fetch blob: 416(?: |$)/.test(error.message)) {
      const metadata = await head(path).catch(() => null)
      if (metadata) return new Response(null, { status: 416, headers: {
        'Content-Range': `bytes */${metadata.size}`, 'Cache-Control': 'private, no-store',
      } })
    }
    return Response.json({ error: 'Não foi possível carregar a mídia' }, { status: error instanceof BlobNotFoundError ? 404 : 502 })
  }
}

export function GET(request: Request) { return serve(request, false) }
export function HEAD(request: Request) { return serve(request, true) }
