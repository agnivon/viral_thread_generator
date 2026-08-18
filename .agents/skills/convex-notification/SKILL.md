---
name: convex-notification
description: A Convex component for typed, scalable in-app notifications. Use this skill whenever working with Notification or related Convex component functionality.
version: 0.1.1
---

> Agents: read this skill fully before writing code that uses Notification. Follow the installation and configuration steps exactly.

# Notification

## Instructions

A fully-configurable Convex component that provides a typed notification system for in-app messaging. It handles the storage, querying, and delivery of notifications within your Convex application.

### Installation

```bash
npm install convex-notification
```

Current npm version: `convex-notification@0.1.1`

## Use cases

<ul>
<li>Build user notification feeds for social media apps, messaging platforms, or collaboration tools</li>
<li>Send system notifications for order updates, payment confirmations, or account changes in e-commerce applications</li>
<li>Implement real-time alerts for admin dashboards, monitoring systems, or workflow management tools</li>
<li>Create notification queues for background job results, data processing updates, or scheduled reminders</li>
</ul>

## How it works

Add the component to your app:

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import notification from "convex-notification/convex.config.js";

const app = defineApp();

app.use(notification);

export default app;
```

Register the notification payloads your app supports:

```ts
// convex/notifications/client.ts
import { v } from "convex/values";
import { components } from "../_generated/api";
import { defineNotifications } from "convex-notification";

export const notifications = defineNotifications(components.notification, {
  defaultListLimit: 50, // Used when querying without pagination.
  batchChunkSize: 100, // Page size when querying with pagination.
  kinds: {
    // These can be configured to your needs
    team_invite: v.object({
      title: v.string(),
      body: v.optional(v.string()),
      href: v.string(),
      inviteId: v.string(),
    }),
    admin_broadcast: v.object({
      title: v.string(),
      body: v.optional(v.string()),
      href: v.optional(v.string()),
    }),
  },
});
```

Expose App-Facing Functions with your own auth resolution:

```ts
// convex/notifications/api.ts
import { makeNotificationAPI } from "convex-notification/server";
import { getCurrentUserOrThrow } from "../auth";
import { notifications } from "./client";

export const userNotifications = makeNotificationAPI(notifications, {
  resolveTargetId: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    return user._id;
  },
});
```

Export the generated Convex functions:

```ts
// convex/notifications.ts
import { userNotifications } from "./notifications/api";

export const {
  list,
  listPage,
  counts,
  unseenCount,
  markSeen,
  markAllSeen,
  dismiss,
  dismissAll,
} = userNotifications;
```

Create notifications from the backend:

```ts
await notifications.create(ctx, {
  targetId: userId,
  kind: "team_invite",
  data: {
    title: "You were invited to a team",
    body: "Open the invite to accept it.",
    href: "/invite/abc123",
    inviteId: "abc123",
  },
  source: { type: "invite", id: "abc123" },
  dedupeKey: "invite:abc123",
});
```

The `data` object is type-checked from your registered `kind` configuration.

## When NOT to use

- When a simpler built-in solution exists for your specific use case
- If you are not using Convex as your backend
- When the functionality provided by Notification is not needed

## Resources

- [npm package](https://www.npmjs.com/package/convex-notification)
- [GitHub repository](https://github.com/ben-katz/convex-notification)
- [Live demo](https://www.convex-notification.com)
- [Convex Components Directory](https://www.convex.dev/components/convex-notification)
- [Convex documentation](https://docs.convex.dev)
