// Service Worker for Viral Thread Generator
// Handles mobile & PWA notifications and notification click interactions

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetHref = event.notification.data?.href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it and navigate to the target route
        for (const client of clientList) {
          if (client.url && "focus" in client) {
            if (targetHref && "navigate" in client) {
              client.navigate(targetHref);
            }
            return client.focus();
          }
        }
        // Otherwise, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetHref || "/");
        }
      })
  );
});
