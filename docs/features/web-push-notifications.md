# W3C Web Push & Mobile PWA Notifications

**Viral Thread Generator** implements native **W3C Web Push** notifications with **VAPID cryptographic authentication**. Creators receive background push notifications on desktop and Android WebAPK devices when threads finish generating, require manual hook approval, or when emerging trends are detected.

---

## 🏗️ Web Push Architecture

```
┌─────────────────────────────────┐
│     Client Browser / WebAPK     │
│   Registers Service Worker      │
│   Calls: pushManager.subscribe()│
└────────────────┬────────────────┘
                 │ Returns PushSubscription (endpoint, p256dh, auth)
                 ▼
┌─────────────────────────────────┐
│     Convex pushSubscriptions    │
│  (Indexed by userId + endpoint) │
└────────────────┬────────────────┘
                 │
                 │ Event Trigger:
                 │ Thread Finished / Emerging Trend Cron
                 ▼
┌─────────────────────────────────┐
│   convex/actions/pushNotify.ts  │
│  Validates Quiet Hours & Prefs  │
│  Signs payload via VAPID keys   │
│  Dispatches via web-push library│
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ Push Service (FCM / Mozilla etc)│
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│   Background Service Worker     │
│        (public/sw.js)           │
│   Displays System Notification  │
│   Routes Click to Target URL    │
└─────────────────────────────────┘
```

---

## 🔑 1. VAPID Configuration & Key Rotation

Web Push uses Voluntary Application Server Identification (VAPID) keys:

- **Public Key (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`)**: Exposed to the frontend to subscribe with the browser's `pushManager`.
- **Private Key (`VAPID_PRIVATE_KEY`)**: Kept strictly server-side in Convex to sign outbound notification payloads.
- **Subject (`VAPID_SUBJECT`)**: Contact URI (e.g. `mailto:support@viralthreadgenerator.com`) included in the push request header.

Generate new keys via:
```bash
pnpm exec web-push generate-vapid-keys
```

---

## 🛠️ 2. Service Worker Delivery (`public/sw.js`)

The PWA Service Worker handles two core lifecycle events:

### Push Event (`push`)
Receives decrypted push payloads and renders system-native notifications with app icon, badge, and vibration patterns:
```javascript
self.addEventListener("push", (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: "/apple-icon",
    badge: "/apple-icon",
    tag: data.tag || "viral-thread-alert",
    data: { href: data.href },
    vibrate: [150, 50, 150],
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});
```

### Notification Click Event (`notificationclick`)
- Focuses an existing open tab if one is already active.
- On Android WebAPK and mobile browsers, executes `clients.openWindow(targetUrl)` to bring the installed standalone app to the foreground.

---

## ⏰ 3. Quiet Hours & Delivery Preferences

Located in `convex/actions/pushNotifications.ts`:

- Users can configure timezone and **quiet hours** (e.g. 10:00 PM to 8:00 AM).
- If a push notification is triggered during the user's quiet hours, it is suppressed from audible push alerts while still remaining visible in the in-app notification center.
- **Dead Endpoint Pruning**: If the push gateway responds with `404` or `410 Gone` (user uninstalled or revoked permissions), the endpoint is automatically deleted from the `pushSubscriptions` table.
