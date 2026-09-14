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
  const targetHref = data.data?.href || data.href || "/";
  const options = {
    body: data.body || "New update available",
    icon: data.icon || "/apple-icon",
    badge: data.badge || "/apple-icon",
    tag: data.tag || "viral-thread-alert",
    data: {
      href: targetHref,
      tag: data.tag,
      ...(data.data || {}),
    },
    vibrate: [150, 50, 150],
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  let urlToOpen = "/";
  try {
    const rawHref = event.notification.data?.href;
    if (rawHref && typeof rawHref === "string") {
      urlToOpen = new URL(rawHref, self.location.origin).href;
    } else {
      urlToOpen = new URL("/", self.location.origin).href;
    }
  } catch {
    urlToOpen = self.location.origin + "/";
  }

  const isExternal =
    urlToOpen.startsWith("http://") ||
    urlToOpen.startsWith("https://") ||
    urlToOpen.startsWith("//");
  const isCrossOrigin =
    isExternal && !urlToOpen.startsWith(self.location.origin);

  event.waitUntil(
    (async () => {
      // External cross-origin targets (e.g. Threads permalink) must open in an external window
      if (isCrossOrigin) {
        if (self.clients.openWindow) {
          return await self.clients.openWindow(urlToOpen);
        }
        return;
      }

      try {
        const clientList = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });

        // 1. If a window is ALREADY in the foreground (focused), navigate and keep focus
        for (const client of clientList) {
          if (client.url && "focus" in client) {
            if (client.focused) {
              if ("navigate" in client && client.url !== urlToOpen) {
                await client.navigate(urlToOpen);
              }
              return await client.focus();
            }
          }
        }

        // 2. On Android WebAPK and mobile browsers, openWindow is REQUIRED to launch the app
        // or bring a background task to the foreground. Android routes openWindow to the WebAPK.
        if (self.clients.openWindow) {
          return await self.clients.openWindow(urlToOpen);
        }

        // 3. Fallback to focusing any available client if openWindow is not supported
        for (const client of clientList) {
          if (client.url && "focus" in client) {
            if ("navigate" in client && client.url !== urlToOpen) {
              try {
                await client.navigate(urlToOpen);
              } catch {
                // Ignore navigation error
              }
            }
            return await client.focus();
          }
        }
      } catch (err) {
        console.error("Failed to handle notificationclick:", err);
        if (self.clients.openWindow) {
          try {
            return await self.clients.openWindow(urlToOpen);
          } catch (openErr) {
            console.error("Fallback openWindow failed:", openErr);
          }
        }
      }
    })()
  );
});
