// Service Worker for Viral Thread Generator
// Handles mobile WebAPK & PWA push notifications and notification click interactions

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for incoming background push messages from Web Push / FCM
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (err) {
    data = {
      title: "Viral Thread Generator",
      body: event.data.text(),
    };
  }

  const title = data.title || "Viral Thread Generator";
  const options = {
    body: data.body || "New update available",
    icon: data.icon || "/apple-icon",
    badge: data.badge || "/apple-icon",
    tag: data.tag || "viral-thread-alert",
    data: data.data || {},
    vibrate: [150, 50, 150],
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetHref = event.notification.data?.href || "/";
  const isExternal =
    targetHref.startsWith("http://") ||
    targetHref.startsWith("https://") ||
    targetHref.startsWith("//");
  const isCrossOrigin =
    isExternal && !targetHref.startsWith(self.location.origin);

  event.waitUntil(
    (async () => {
      // External cross-origin targets (e.g. Threads permalink) must open in a new tab/window
      if (isCrossOrigin) {
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetHref);
        }
        return;
      }

      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // If a same-origin window is already active, focus and navigate
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          if ("navigate" in client) {
            try {
              await client.navigate(targetHref);
            } catch {
              // Ignore navigation failures if window is closing
            }
          }
          return client.focus();
        }
      }

      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetHref);
      }
    })()
  );
});
