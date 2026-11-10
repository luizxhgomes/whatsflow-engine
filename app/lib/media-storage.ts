import { createHmac, timingSafeEqual } from 'node:crypto'
import { put } from '@vercel/blob'

const MAX_TTL = 7 * 24 * 60 * 60
const MAX_BYTES = 25 * 1024 * 1024
const MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'application/pdf'])

function validPath(path: string): boolean {
  return path.length <= 512 && !path.includes('..') && /^(templates|uploads)\/[A-Za-z0-9_/-]+\.(jpg|jpeg|png|webp|gif|mp4|mov|pdf|bin)$/.test(path)
}

function signature(path: string, expires: number): string {
  const secret = process.env.WHATSFLOW_MEDIA_SIGNING_SECRET
  if (!secret) throw new Error('Assinatura de mídia não configurada')
  return createHmac('sha256', secret).update(`${path}\n${expires}`).digest('hex')
}

export function createSignedMediaUrl(path: string, ttlSeconds = 86400): { url: string; expiresAt: string } {
  if (!validPath(path) || !Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > MAX_TTL) {
    throw new Error('Caminho ou prazo de mídia inválido')
  }
  const base = new URL(process.env.NEXT_PUBLIC_APP_URL || '')
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
  if (base.protocol !== 'https:' && !(local && process.env.NODE_ENV !== 'production' && base.protocol === 'http:')) {
    throw new Error('Origem de mídia inválida')
  }
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds
  const url = new URL('/api/media', base)
  url.searchParams.set('path', path)
  url.searchParams.set('expires', String(expires))
  url.searchParams.set('signature', signature(path, expires))
  return { url: url.href, expiresAt: new Date(expires * 1000).toISOString() }
}

export function verifySignedMediaUrl(url: URL): string | null {
  try {
    const path = url.searchParams.get('path') || ''
    const expires = Number(url.searchParams.get('expires'))
    const supplied = url.searchParams.get('signature') || ''
    const now = Math.floor(Date.now() / 1000)
    if (url.pathname !== '/api/media' || !validPath(path) || !Number.isSafeInteger(expires) ||
      expires <= now || expires > now + MAX_TTL || !/^[a-f0-9]{64}$/.test(supplied)) return null
    return timingSafeEqual(Buffer.from(supplied, 'hex'), Buffer.from(signature(path, expires), 'hex')) ? path : null
  } catch {
    return null
  }
}

export async function uploadPrivateMedia(path: string, data: Buffer, contentType: string) {
  if (!validPath(path) || !MIME_TYPES.has(contentType) || data.byteLength === 0 || data.byteLength > MAX_BYTES) {
    throw new Error('Arquivo de mídia inválido ou acima do limite')
  }
  const expiresIn = Number(process.env.MEDIA_SIGNED_URL_TTL_SECONDS || 86400)
  // Validate configuration before writing a file that would otherwise be unreachable.
  const signed = createSignedMediaUrl(path, expiresIn)
  await put(path, data, {
    access: 'private', contentType, addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 3600,
  })
  return { ...signed, path, mode: 'signed' as const, expiresIn }
}
