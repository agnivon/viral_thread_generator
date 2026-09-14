"use node";

import { v } from "convex/values";
import { action, internalAction, ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireAuthUserId } from "../auth";
import webpush from "web-push";

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) {
    return;
  }

  const publicKey =
    process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject =
    process.env.VAPID_SUBJECT || "mailto:support@viralthreadgenerator.com";

  if (!publicKey || !privateKey) {
    throw new Error(
      "Missing VAPID configuration: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set in environment variables."
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

import { Doc } from "../_generated/dataModel";

export function isWithinQuietHours(
  startStr?: string,
  endStr?: string,
  now = new Date()
): boolean {
  if (!startStr || !endStr) return false;
  const [startH, startM] = startStr.split(":").map(Number);
  const [endH, endM] = endStr.split(":").map(Number);
  if (
    isNaN(startH) ||
    isNaN(startM) ||
    isNaN(endH) ||
    isNaN(endM) ||
    startH < 0 ||
    startH > 23 ||
    endH < 0 ||
    endH > 23
  ) {
    return false;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Overnight quiet hours (e.g. 22:00 to 08:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

async function dispatchWebPushPayload(
  ctx: ActionCtx,
  subscriptions: Doc<"pushSubscriptions">[],
  payload: string,
  options: { TTL: number; urgency: "high" | "normal" | "low" }
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  await Promise.allSettled(
    subscriptions.map(async (sub: Doc<"pushSubscriptions">) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          payload,
          options
        );
        sent++;
      } catch (err: unknown) {
        failed++;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        // Status 404 (Not Found) or 410 (Gone) indicates the subscription is expired or cancelled
        if (statusCode === 404 || statusCode === 410) {
          await ctx.runMutation(
            internal.pushSubscriptions.removeDeadSubscriptionInternal,
            { endpoint: sub.endpoint }
          );
        } else {
          console.warn(
            `Web push error for endpoint ${sub.endpoint.slice(0, 30)}...:`,
            err
          );
        }
      }
    })
  );

  return { sent, failed };
}

export const sendPushToUser = internalAction({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    href: v.optional(v.string()),
    tag: v.optional(v.string()),
    kind: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    sent: number;
    failed: number;
    subscriptionsCount: number;
    skipped?: string;
  }> => {
    ensureVapidConfigured();

    const subscriptions: Doc<"pushSubscriptions">[] = await ctx.runQuery(
      internal.pushSubscriptions.listByUserInternal,
      { userId: args.userId }
    );

    if (!subscriptions || subscriptions.length === 0) {
      return { sent: 0, failed: 0, subscriptionsCount: 0 };
    }

    // Check user trend filter settings if this is a trend alert
    if (args.kind === "emerging_trend_alert") {
      const settings: Doc<"trendFilterSettings"> | null = await ctx.runQuery(
        internal.pushSubscriptions.getUserPushSettingsInternal,
        { userId: args.userId }
      );

      if (settings) {
        if (settings.desktopPushEnabled === false) {
          return {
            sent: 0,
            failed: 0,
            subscriptionsCount: subscriptions.length,
            skipped: "push_disabled",
          };
        }

        if (
          settings.quietHoursEnabled &&
          isWithinQuietHours(settings.quietHoursStart, settings.quietHoursEnd)
        ) {
          return {
            sent: 0,
            failed: 0,
            subscriptionsCount: subscriptions.length,
            skipped: "quiet_hours",
          };
        }
      }
    }

    const payload = JSON.stringify({
      title: args.title,
      body: args.body,
      icon: "/apple-icon",
      badge: "/apple-icon",
      tag: args.tag || "viral-thread-alert",
      data: {
        href: args.href || "/",
        tag: args.tag,
      },
    });

    const { sent, failed } = await dispatchWebPushPayload(
      ctx,
      subscriptions,
      payload,
      {
        TTL: 60 * 60 * 24, // 24 hours
        urgency: "high",
      }
    );

    return { sent, failed, subscriptionsCount: subscriptions.length };
  },
});

export const sendTestPush = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    subscriptionsCount: number;
    message: string;
  }> => {
    const userId = await requireAuthUserId(ctx);
    ensureVapidConfigured();

    const subscriptions: Doc<"pushSubscriptions">[] = await ctx.runQuery(
      internal.pushSubscriptions.listByUserInternal,
      { userId }
    );

    if (!subscriptions || subscriptions.length === 0) {
      return {
        success: false,
        sent: 0,
        failed: 0,
        message: "No active push subscriptions found for your account on this device.",
        subscriptionsCount: 0,
      };
    }

    const payload = JSON.stringify({
      title: "Viral Thread Generator",
      body: "⚡ Web Push is active! Real-time alerts will wake your device even when closed.",
      icon: "/apple-icon",
      badge: "/apple-icon",
      tag: "test_push_alert",
      data: {
        href: "/dashboard",
        tag: "test_push_alert",
      },
    });

    const { sent, failed } = await dispatchWebPushPayload(
      ctx,
      subscriptions,
      payload,
      {
        TTL: 60,
        urgency: "high",
      }
    );

    return {
      success: sent > 0,
      sent,
      failed,
      subscriptionsCount: subscriptions.length,
      message:
        sent > 0
          ? `Dispatched test push to ${sent} device${sent === 1 ? "" : "s"}.`
          : "Failed to dispatch test push to registered devices.",
    };
  },
});
