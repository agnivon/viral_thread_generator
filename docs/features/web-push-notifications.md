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

---

## 📬 4. Reactive Notification Center & Cursor Pagination

In addition to background push notifications delivered to devices, in-app notifications are surfaced through a real-time reactive Notification Center (`components/NotificationCenter.tsx`):

### 1. Cursor-Based Pagination (`paginate`)
To handle large volumes of activity without memory bloat or read amplification, notifications are queried using Convex's native `paginate` query validator:
```typescript
export const paginate = query({
  args: {
    paginationOpts: paginationOptsValidator,
    includeDismissed: v.optional(v.boolean()),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    // Evaluates indexed compound query across active or unseen notifications
    return await queryBuilder.paginate(args.paginationOpts);
  },
});
```

### 2. Lightweight Real-Time Counters (`counts`, `unseenCount`)
- Dedicated queries compute `active` and `unseen` notification counts directly against indexed ranges (`by_userId_unseen` and `by_userId_active`).
- Powers badge indicators in the top navigation bar with minimal bandwidth overhead.

### 3. Bulk Mutations & Maintenance
- `markAllSeen`: Marks all pending notifications as viewed in a single atomic transaction.
- `dismissAll`: Soft-dismisses all active notifications for the creator.
- `purgeDismissed`: Internal scheduled mutation that purges soft-dismissed records older than 7 days in batches of 100 to keep the table compact.
