import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { createSignedMediaUrl, verifySignedMediaUrl, uploadPrivateMedia } from './media-storage'
const mocks = vi.hoisted(() => ({ put: vi.fn() }))
vi.mock('@vercel/blob', () => ({ put: mocks.put }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-10T18:00:00Z'))
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://whatsflow.example.test')
  vi.stubEnv('WHATSFLOW_MEDIA_SIGNING_SECRET', 'synthetic-media-signing-secret')
})
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers() })

describe('private media URLs', () => {
  it('authorizes only the signed pathname before its expiry', () => {
    const signed = createSignedMediaUrl('templates/example/preview.png', 60)
    expect(verifySignedMediaUrl(new URL(signed.url))).toBe('templates/example/preview.png')
    vi.advanceTimersByTime(60_000)
    expect(verifySignedMediaUrl(new URL(signed.url))).toBeNull()
  })
  it('rejects altered paths and expiration values', () => {
    const { url } = createSignedMediaUrl('templates/example/preview.png', 60)
    const altered = new URL(url)
    altered.searchParams.set('path', 'templates/other/private.png')
    expect(verifySignedMediaUrl(altered)).toBeNull()
    const extended = new URL(url)
    extended.searchParams.set('expires', String(Math.floor(Date.now() / 1000) + 600))
    expect(verifySignedMediaUrl(extended)).toBeNull()
  })
  it('does not sign external URLs, traversal paths or unsupported content', () => {
    for (const path of ['https://attacker.test/file.png', 'templates/../private.png', 'templates/file.html']) {
      expect(() => createSignedMediaUrl(path)).toThrow()
    }
  })
  it('fails closed without a signing secret', () => {
    const signed = createSignedMediaUrl('templates/example/preview.png')
    vi.stubEnv('WHATSFLOW_MEDIA_SIGNING_SECRET', '')
    expect(verifySignedMediaUrl(new URL(signed.url))).toBeNull()
    expect(() => createSignedMediaUrl('templates/example/preview.png')).toThrow()
  })
  it('rejects excessive lifetimes', () => {
    expect(() => createSignedMediaUrl('templates/example/preview.png', 604801)).toThrow()
  })
})

describe('private media upload', () => {
  it('stores private media and returns an expiring application URL', async () => {
    mocks.put.mockResolvedValue({ pathname: 'templates/example/preview.png' })
    const data = Buffer.from([137, 80, 78, 71])
    const result = await uploadPrivateMedia('templates/example/preview.png', data, 'image/png')
    expect(mocks.put).toHaveBeenCalledWith('templates/example/preview.png', data, expect.objectContaining({ access: 'private', contentType: 'image/png', addRandomSuffix: false }))
    expect(result.mode).toBe('signed')
    expect(new URL(result.url).origin).toBe('https://whatsflow.example.test')
    expect(verifySignedMediaUrl(new URL(result.url))).toBe(result.path)
  })
  it('rejects unsafe MIME and oversized media before upload', async () => {
    await expect(uploadPrivateMedia('templates/example/preview.png', Buffer.from('x'), 'text/html')).rejects.toThrow()
    await expect(uploadPrivateMedia('templates/example/preview.png', Buffer.alloc(26 * 1024 * 1024), 'image/png')).rejects.toThrow()
    expect(mocks.put).not.toHaveBeenCalled()
  })
})

it('normalizes the legacy image/jpg MIME accepted by template previews', async () => {
  const data = Buffer.from('synthetic jpeg')
  await uploadPrivateMedia('templates/example/preview.jpg', data, 'image/jpg')
  expect(mocks.put).toHaveBeenCalledWith('templates/example/preview.jpg', data, expect.objectContaining({ contentType: 'image/jpeg' }))
})
