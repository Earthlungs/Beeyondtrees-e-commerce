// Self-destroying service worker.
//
// A previous version used a naive cache-first strategy and pre-cached page
// HTML (/, /products, /admin). After each deploy it kept serving that stale
// HTML, which referenced old JS chunk hashes that no longer exist — breaking
// pages with "This page couldn't load". It never updated its cache.
//
// This version takes over the old registration, wipes every cache,
// unregisters itself, and reloads any open pages so visitors recover with no
// action needed. Once unregistered, requests go straight to the network.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
      await self.registration.unregister()
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) {
        client.navigate(client.url)
      }
    })()
  )
})
