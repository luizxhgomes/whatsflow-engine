/**
 * WhatsFlow Service Worker
 * Cache somente de assets estáticos públicos. Páginas e dados usam a rede.
 */

const CACHE_VERSION = 'whatsflow-v2'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// =============================================================================
// INSTALL - Pre-cache shell assets
// =============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...')

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Pre-caching app shell')
        return cache.addAll(PRECACHE_ASSETS)
      })
      .catch((error) => {
        console.error('[SW] Pre-cache failed:', error)
      })
      .then(() => {
        console.log('[SW] Install complete, skipping waiting')
        return self.skipWaiting()
      })
  )
})

// =============================================================================
// ACTIVATE - Clean old caches
// =============================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...')

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('whatsflow-') && name !== STATIC_CACHE)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name)
              return caches.delete(name)
            })
        )
      })
      .then(() => {
        console.log('[SW] Claiming clients')
        return self.clients.claim()
      })
  )
})

// =============================================================================
// FETCH - Cache only same-origin public static GET requests
// =============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      request.mode === 'navigate' ||
      /text\/(?:html|x-component)/i.test(request.headers.get('accept') || '') ||
      request.headers.has('rsc') || request.headers.has('next-router-state-tree') ||
      request.headers.has('next-router-prefetch') || url.searchParams.has('_rsc')) return

  const isPublicAsset = url.pathname.startsWith('/_next/static/') ||
    /^\/icons\/.+\.(?:png|svg|ico|webp|jpe?g|gif|avif)$/i.test(url.pathname) ||
    /^\/fonts\/.+\.(?:woff2?|ttf|eot|otf)$/i.test(url.pathname) ||
    url.pathname === '/manifest.json'
  if (isPublicAsset) event.respondWith(cacheFirst(request))
})

// =============================================================================
// PUSH - Handle push notifications
// =============================================================================

self.addEventListener('push', (event) => {
  console.log('[SW] Push received')

  let data = {
    title: 'WhatsFlow',
    body: 'Nova mensagem recebida',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'whatsflow-notification',
    data: { url: '/atendimento' }
  }

  try {
    if (event.data) {
      const payload = event.data.json()
      data = { ...data, ...payload }
    }
  } catch (error) {
    console.error('[SW] Error parsing push data:', error)
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      data: data.data,
      vibrate: [200, 100, 200],
      requireInteraction: true,
      actions: [
        { action: 'open', title: 'Abrir' },
        { action: 'dismiss', title: 'Dispensar' }
      ]
    })
  )
})

// =============================================================================
// NOTIFICATION CLICK - Handle notification interactions
// =============================================================================

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action)

  event.notification.close()

  if (event.action === 'dismiss') {
    return
  }

  const url = event.notification.data?.url || '/atendimento'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Se já existe uma janela aberta, foca nela
        for (const client of clientList) {
          if (client.url.includes('/atendimento') && 'focus' in client) {
            return client.focus()
          }
        }
        // Se não, abre uma nova
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})

// =============================================================================
// CACHE - Current static assets only, never HTML or RSC responses
// =============================================================================

async function cacheFirst(request) {
  let cache
  try {
    cache = await caches.open(STATIC_CACHE)
    const cached = await cache.match(request)
    if (cached) return cached
  } catch {
    // CacheStorage indisponível não pode impedir o acesso à rede.
  }

  try {
    const response = await fetch(request)
    if (cache && response.ok && !response.redirected &&
        !/text\/(?:html|x-component)/i.test(response.headers.get('content-type') || '') &&
        !/(?:private|no-store)/i.test(response.headers.get('cache-control') || '')) {
      try {
        await cache.put(request, response.clone())
      } catch {
        // Falha de quota não invalida uma resposta bem-sucedida da rede.
      }
    }
    return response
  } catch (error) {
    console.error('[SW] Cache-first fetch failed:', error)
    return new Response('Offline', { status: 503 })
  }
}

// =============================================================================
// MESSAGE HANDLER - Communication with main thread
// =============================================================================

self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) =>
        Promise.all(names.map((name) => caches.delete(name)))
      )
    )
  }
})
