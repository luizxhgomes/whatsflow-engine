// @vitest-environment node
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')
const origin = 'https://dashboard.example.test'
let handlers: Record<string, (event: any) => void>
let cache: { addAll: ReturnType<typeof vi.fn>; match: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> }
let caches: { open: ReturnType<typeof vi.fn>; match: ReturnType<typeof vi.fn>; keys: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> }
let network: ReturnType<typeof vi.fn>
let self: any

beforeEach(() => {
  handlers = {}
  cache = { addAll: vi.fn().mockResolvedValue(undefined), match: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined) }
  caches = {
    open: vi.fn().mockResolvedValue(cache), match: vi.fn().mockResolvedValue(new Response('legacy HTML')),
    keys: vi.fn().mockResolvedValue(['whatsflow-v1-static', 'whatsflow-v1-dynamic', 'whatsflow-v2-static', 'other-app-cache']),
    delete: vi.fn().mockResolvedValue(true),
  }
  network = vi.fn().mockResolvedValue(new Response('current asset', { headers: { 'Content-Type': 'application/javascript' } }))
  self = {
    location: { origin }, addEventListener: (name: string, handler: (event: any) => void) => { handlers[name] = handler },
    skipWaiting: vi.fn().mockResolvedValue(undefined),
    clients: { claim: vi.fn().mockResolvedValue(undefined), matchAll: vi.fn().mockResolvedValue([]), openWindow: vi.fn().mockResolvedValue(undefined) },
    registration: { showNotification: vi.fn().mockResolvedValue(undefined) },
  }
  runInNewContext(source, { self, clients: self.clients, caches, fetch: network, URL, Response, console: { log: vi.fn(), error: vi.fn() } })
})
function request(path: string, init: RequestInit = {}) { return new Request(new URL(path, origin), init) }
function dispatchFetch(req: Request) {
  const respondWith = vi.fn()
  handlers.fetch({ request: req, respondWith })
  return respondWith
}
async function lifecycle(name: string, extra = {}) {
  const tasks: Promise<unknown>[] = []
  handlers[name]({ ...extra, waitUntil: (task: Promise<unknown>) => tasks.push(task) })
  await Promise.all(tasks)
}

describe('public static cache only', () => {
  it.each([
    ['/', {}], ['/atendimento', {}], ['/contacts', {}], ['/private.js', {}],
    ['/api/contacts', {}], ['/api/export.js', {}], ['/_next/static/app.js', { method: 'POST', body: 'private' }],
    ['/_next/static/app.js', { method: 'HEAD' }], ['https://cdn.example.test/_next/static/app.js', {}],
    ['/_next/static/app.js', { headers: { accept: 'text/html' } }],
    ['/_next/static/app.js', { headers: { RSC: '1' } }],
    ['/_next/static/app.js', { headers: { accept: 'text/x-component' } }],
    ['/_next/static/app.js?_rsc=payload', {}], ['/manifest.json/private', {}],
  ] as [string, RequestInit][])('leaves %s to the network without consulting any cache', (path, init) => {
    expect(dispatchFetch(request(path, init))).not.toHaveBeenCalled()
    expect(caches.open).not.toHaveBeenCalled()
    expect(caches.match).not.toHaveBeenCalled()
    expect(network).not.toHaveBeenCalled()
  })

  it('never serves a navigation from legacy HTML cache, even at an asset path', () => {
    const req = request('/icons/icon-192.png')
    Object.defineProperty(req, 'mode', { value: 'navigate' })
    expect(dispatchFetch(req)).not.toHaveBeenCalled()
    expect(caches.match).not.toHaveBeenCalled()
  })

  it.each(['/_next/static/chunk.js', '/icons/icon-192.png', '/manifest.json', '/fonts/app.woff2'])('caches a same-origin public GET: %s', async path => {
    const req = request(path)
    const respond = dispatchFetch(req)
    expect(respond).toHaveBeenCalledTimes(1)
    const result = await respond.mock.calls[0][0]
    expect(await result.text()).toBe('current asset')
    expect(network).toHaveBeenCalledWith(req)
    expect(cache.put).toHaveBeenCalledTimes(1)
    expect(caches.open).toHaveBeenCalledWith('whatsflow-v2-static')
    expect(caches.match).not.toHaveBeenCalled()
  })

  it('reads a hit only from the current static cache', async () => {
    cache.match.mockResolvedValue(new Response('current cached chunk'))
    const respond = dispatchFetch(request('/_next/static/chunk.js'))
    expect(await (await respond.mock.calls[0][0]).text()).toBe('current cached chunk')
    expect(network).not.toHaveBeenCalled()
    expect(caches.match).not.toHaveBeenCalled()
  })

  it.each(['text/html', 'text/x-component'])('does not cache an asset response containing %s', async contentType => {
    network.mockResolvedValue(new Response('private content', { headers: { 'Content-Type': contentType } }))
    await dispatchFetch(request('/_next/static/chunk.js')).mock.calls[0][0]
    expect(cache.put).not.toHaveBeenCalled()
  })

  it('precaches only the public manifest and icons, then activates immediately', async () => {
    await lifecycle('install')
    expect(cache.addAll).toHaveBeenCalledWith(['/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'])
    expect(caches.open).toHaveBeenCalledWith('whatsflow-v2-static')
    expect(self.skipWaiting).toHaveBeenCalledOnce()
  })

  it('purges legacy WhatsFlow caches without removing current or unrelated caches', async () => {
    await lifecycle('activate')
    expect(caches.delete.mock.calls.map(call => call[0])).toEqual(['whatsflow-v1-static', 'whatsflow-v1-dynamic'])
    expect(self.clients.claim).toHaveBeenCalledOnce()
  })

  it('preserves push payloads, notification opening and skip-waiting messages', async () => {
    await lifecycle('push', { data: { json: () => ({ title: 'Synthetic notice', body: 'Synthetic body', data: { url: '/atendimento' } }) } })
    expect(self.registration.showNotification).toHaveBeenCalledWith('Synthetic notice', expect.objectContaining({ body: 'Synthetic body', data: { url: '/atendimento' }, requireInteraction: true }))
    const close = vi.fn()
    await lifecycle('notificationclick', { action: 'open', notification: { close, data: { url: '/atendimento' } } })
    expect(close).toHaveBeenCalledOnce()
    expect(self.clients.openWindow).toHaveBeenCalledWith('/atendimento')
    handlers.message({ data: { type: 'SKIP_WAITING' } })
    expect(self.skipWaiting).toHaveBeenCalledOnce()
  })
})


describe('cache storage is best-effort', () => {
  it.each(['open', 'match', 'put'] as const)('returns the network asset when cache.%s fails', async operation => {
    const failure = new Error('Synthetic cache quota failure')
    if (operation === 'open') caches.open.mockRejectedValue(failure)
    else cache[operation].mockRejectedValue(failure)
    const result = await dispatchFetch(request('/_next/static/chunk.js')).mock.calls[0][0]
    expect(result.status).toBe(200)
    expect(await result.text()).toBe('current asset')
    expect(network).toHaveBeenCalledTimes(1)
  })

  it.each(['open', 'addAll'] as const)('activates the new worker even when precache %s fails', async operation => {
    const failure = new Error('Synthetic precache quota failure')
    if (operation === 'open') caches.open.mockRejectedValue(failure)
    else cache.addAll.mockRejectedValue(failure)
    await lifecycle('install')
    expect(self.skipWaiting).toHaveBeenCalledOnce()
  })
})
