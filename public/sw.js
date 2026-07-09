/* S.T.A.R KJo — Service Worker (PWA + local notifications) */
const CACHE = 'star-kjo-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/manifest.webmanifest', '/logo-sekolah.png'])).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  // Network-first for app shell; no aggressive offline cache of HTML (auth/session).
  if (event.request.method !== 'GET') return
  if (event.request.url.includes('/api/')) return
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/gbk'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ('focus' in c) {
          c.navigate(url)
          return c.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, url, tag } = event.data
    event.waitUntil(
      self.registration.showNotification(title || 'S.T.A.R KJo', {
        body: body || '',
        icon: '/logo-sekolah.png',
        badge: '/logo-sekolah.png',
        tag: tag || 'star-kjo',
        data: { url: url || '/gbk' },
        renotify: true,
      })
    )
  }
})
