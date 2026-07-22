// ponytail: no offline caching — this SW exists so the app is installable and can
// receive push. Add a cache strategy only when kader actually need offline input.
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()))

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {}
  event.waitUntil(
    self.registration.showNotification(data.judul || "Loka Bakka", {
      body: data.pesan || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.actionUrl || "/" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(self.clients.openWindow(event.notification.data.url))
})
