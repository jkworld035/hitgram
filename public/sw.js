const CACHE_NAME = 'hitgram-v2.0'
const STEP_KEY = 'hitgram_steps_today'
const STEP_DATE_KEY = 'hitgram_steps_date'

// ── CACHE STATIC ASSETS ───────────────────────────────────────
const STATIC_ASSETS = [
  '/', '/dashboard', '/health', '/workout', '/meals',
  '/habits', '/goals', '/jarvis', '/assessment', '/health-live',
  '/manifest.json',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── FETCH HANDLER ─────────────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  if (event.request.url.includes('/api/')) return
  if (event.request.url.includes('supabase.co')) return

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request).then(cached => {
        if (cached) return cached
        if (event.request.mode === 'navigate') return caches.match('/')
      }))
  )
})

// ── BACKGROUND STEP SYNC ──────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-steps') {
    event.waitUntil(syncStepsToServer())
  }
})

async function syncStepsToServer() {
  try {
    // Get cached step data from IndexedDB via message
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({ type: 'SYNC_STEPS_REQUEST' })
    })
  } catch (err) {
    console.error('Background sync error:', err)
  }
}

// ── PERIODIC BACKGROUND SYNC ──────────────────────────────────
self.addEventListener('periodicsync', event => {
  if (event.tag === 'step-sync') {
    event.waitUntil(syncStepsToServer())
  }
})

// ── PUSH NOTIFICATIONS ────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() || {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Hitgram', {
      body: data.body || 'Check your health progress!',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      vibrate: [100, 50, 100],
      tag: 'hitgram-notification',
      data: { url: data.url || '/dashboard' },
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  if (event.action !== 'dismiss') {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/dashboard')
    )
  }
})

// ── MESSAGE HANDLER ───────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
  if (event.data?.type === 'STEPS_UPDATE') {
    // Store latest step count received from page
    event.waitUntil(
      caches.open('hitgram-data').then(cache => {
        cache.put('/step-data', new Response(JSON.stringify(event.data.payload)))
      })
    )
  }
})