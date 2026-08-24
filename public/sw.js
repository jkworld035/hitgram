const CACHE_NAME = 'hitgram-v1.0.0'
const OFFLINE_URL = '/offline'

const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/health',
  '/workout',
  '/meals',
  '/habits',
  '/goals',
  '/jarvis',
  '/assessment',
  '/manifest.json',
]

// Install — cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Hitgram PWA: Caching static assets')
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// Fetch — network first, fallback to cache
self.addEventListener('fetch', event => {
  // Skip non-GET and API requests
  if (event.request.method !== 'GET') return
  if (event.request.url.includes('/api/')) return
  if (event.request.url.includes('supabase.co')) return

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone)
          })
        }
        return response
      })
      .catch(() => {
        // Offline fallback
        return caches.match(event.request).then(cached => {
          if (cached) return cached
          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/') || new Response(
              '<html><body style="background:#0A0A0A;color:#fff;font-family:Inter;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;flex-direction:column;gap:16px"><div style="font-size:48px">📱</div><div style="font-size:20px;font-weight:800">Hitgram</div><div style="font-size:14px;color:#3A3A3A">You are offline. Connect to continue.</div></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            )
          }
        })
      })
  )
})

// Background sync for offline data
self.addEventListener('sync', event => {
  if (event.tag === 'sync-health-data') {
    event.waitUntil(syncHealthData())
  }
})

async function syncHealthData() {
  console.log('Hitgram: Syncing offline health data...')
}

// Push notifications
self.addEventListener('push', event => {
  const data = event.data?.json() || {}
  const options = {
    body: data.body || 'Time to check your health goals!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/dashboard' },
    actions: [
      { action: 'open', title: 'Open Hitgram' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Hitgram', options)
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/dashboard')
    )
  }
})