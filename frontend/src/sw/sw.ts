/// <reference lib="webworker" />
// Custom service worker (vite-plugin-pwa injectManifest): app-shell precache, same
// as the generated one before, plus Web Push for the live-GPS "paused" alert.
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope

// App shell only. API responses must stay live (never served from cache).
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/api\//] }),
)

// registerType 'prompt': <UpdateBanner /> asks before activating a new version.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})

interface PushPayload {
  title?: string
  body?: string
  url?: string
  tag?: string
}

self.addEventListener('push', (event) => {
  let data: PushPayload = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { body: event.data?.text() }
  }
  // iOS revokes the subscription if a push doesn't show a notification, so always show one.
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Dogwalker', {
      body: data.body,
      tag: data.tag,
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      data: { url: data.url ?? '/dashboard' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const path: string = event.notification.data?.url ?? '/dashboard'
  const target = new URL(path, self.location.origin)
  if (target.origin !== self.location.origin) return
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = windows[0]
      if (existing) {
        await existing.focus()
        if (new URL(existing.url).pathname !== target.pathname) await existing.navigate(target.href)
        return
      }
      await self.clients.openWindow(target.href)
    })(),
  )
})
