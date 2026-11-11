import { beforeEach, afterEach, it, expect, vi } from 'vitest'
import { createSignedMediaUrl } from '@/lib/media-storage'
import { GET, HEAD } from './route'
import { BlobError } from '@vercel/blob'
const mocks = vi.hoisted(() => ({ get: vi.fn(), head: vi.fn() }))
vi.mock('@vercel/blob', () => ({ ...mocks, put: vi.fn(), BlobNotFoundError: class extends Error {}, BlobError: class extends Error {} }))
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://whatsflow.example.test')
  vi.stubEnv('WHATSFLOW_MEDIA_SIGNING_SECRET', 'synthetic-signing-key')
})
afterEach(() => vi.unstubAllEnvs())
it('rejects unsigned and altered media before contacting storage', async () => {
  const missing = await GET(new Request('https://whatsflow.example.test/api/media?path=templates/test/image.png'))
  expect(missing.status).toBe(403)
  const url = new URL(createSignedMediaUrl('templates/test/image.png').url)
  url.searchParams.set('path', 'templates/private/other.png')
  expect((await GET(new Request(url))).status).toBe(403)
  expect(mocks.get).not.toHaveBeenCalled()
})
it('streams a signed range without exposing storage credentials', async () => {
  mocks.get.mockResolvedValue({ statusCode: 200, stream: new Response('abc').body, headers: new Headers({ 'Content-Length': '3', 'Content-Range': 'bytes 0-2/9' }), blob: { contentType: 'image/png', etag: 'fixture-etag' } })
  const url = createSignedMediaUrl('templates/test/image.png').url
  const response = await GET(new Request(url, { headers: { Range: 'bytes=0-2', Authorization: 'Bearer must-not-forward' } }))
  expect(response.status).toBe(206)
  expect(await response.text()).toBe('abc')
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(response.headers.get('content-range')).toBe('bytes 0-2/9')
  expect(mocks.get).toHaveBeenCalledWith('templates/test/image.png', expect.objectContaining({ access: 'private', headers: { Range: 'bytes=0-2' } }))
})
it('supports signed HEAD without downloading content', async () => {
  mocks.head.mockResolvedValue({ contentType: 'image/png', size: 42 })
  const response = await HEAD(new Request(createSignedMediaUrl('templates/test/image.png').url, { method: 'HEAD' }))
  expect(response.status).toBe(200)
  expect(response.headers.get('content-length')).toBe('42')
  expect(await response.text()).toBe('')
  expect(mocks.get).not.toHaveBeenCalled()
})
it('keeps storage failures opaque and reports missing objects', async () => {
  const url = createSignedMediaUrl('templates/test/image.png').url
  mocks.get.mockResolvedValue(null)
  expect((await GET(new Request(url))).status).toBe(404)
  mocks.get.mockRejectedValue(new Error('private-storage-secret-value'))
  const failure = await GET(new Request(url))
  expect(failure.status).toBe(502)
  expect(await failure.text()).not.toContain('private-storage-secret-value')
})

it('preserves unsatisfiable range status and total object size', async () => {
  mocks.get.mockRejectedValue(new BlobError('Failed to fetch blob: 416 Range Not Satisfiable'))
  mocks.head.mockResolvedValue({ contentType: 'image/png', size: 9 })
  const response = await GET(new Request(createSignedMediaUrl('templates/test/image.png').url, { headers: { Range: 'bytes=99-' } }))
  expect(response.status).toBe(416)
  expect(response.headers.get('content-range')).toBe('bytes */9')
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(await response.text()).toBe('')
})
