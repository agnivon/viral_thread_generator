"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useAction, useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useWindowActivity } from "./use-window-activity";

export interface NotificationPayload {
  threadId?: string;
  title?: string;
  body?: string;
  error?: string;
  postIds?: string[];
  href?: string;
  trendKeyword?: string;
  traffic?: number;
  growthRate?: number;
  trajectoryStatus?: string;
  acceleration?: number;
}

export function getTrendSourceHref(keyword: string): string {
  const slug = keyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `/trends/${encodeURIComponent(slug || keyword)}`;
}

export const getTrendHref = getTrendSourceHref;

export type NotificationKind =
  | "thread_generation_success"
  | "thread_hook_selection_required"
  | "thread_generation_failed"
  | "thread_publication_success"
  | "thread_publication_failed"
  | "emerging_trend_alert";

export interface AppNotificationItem {
  _id: Id<"notifications">;
  kind: NotificationKind | string;
  data: NotificationPayload;
  targetId: string;
  sequence?: number;
  dedupeKey?: string;
  isSeen: boolean;
  isDismissed: boolean;
  createdAt: number;
  seenAt?: number;
  dismissedAt?: number;
}

export function isExternalUrl(url?: string): boolean {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//");
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface SimpleNotificationPayload {
  title: string;
  body?: string;
  href?: string;
  tag?: string;
}

export type AppNotificationTarget = AppNotificationItem | SimpleNotificationPayload;

export async function showAppNotification(
  notification: AppNotificationTarget,
  onClickAction?: () => void
): Promise<Notification | boolean | null> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  if (window.Notification.permission !== "granted") {
    return null;
  }

  const isItem = "data" in notification;
  const title = isItem
    ? notification.data.title || "Viral Thread Generator"
    : notification.title || "Viral Thread Generator";
  const body = isItem
    ? notification.data.body || "You have a new notification"
    : notification.body || "You have a new notification";
  const targetHref = isItem
    ? notification.kind === "emerging_trend_alert"
      ? (notification.data.trendKeyword ? getTrendSourceHref(notification.data.trendKeyword) : undefined)
      : notification.data.href
    : notification.href;
  const tag = isItem ? (notification.dedupeKey || notification._id) : notification.tag;

  // 1. Prefer Service Worker registration if available (mandatory on mobile browsers & PWAs)
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && "showNotification" in registration) {
        await registration.showNotification(title, {
          body,
          icon: "/icon.svg",
          badge: "/icon.svg",
          tag,
          data: { href: targetHref },
        });
        return true;
      }
    } catch (swErr) {
      console.warn("ServiceWorker showNotification failed, trying desktop constructor:", swErr);
    }
  }

  // 2. Fallback to desktop window.Notification constructor
  try {
    const desktopNotification = new window.Notification(title, {
      body,
      icon: "/icon.svg",
      tag,
    });

    desktopNotification.onclick = () => {
      window.focus();
      desktopNotification.close();
      onClickAction?.();
    };

    return desktopNotification;
  } catch (err) {
    console.error("Failed to display notification:", err);
    return null;
  }
}

export function showDesktopNotification(
  notification: AppNotificationItem,
  onClickAction?: () => void
): Notification | null {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  if (window.Notification.permission !== "granted") {
    return null;
  }

  try {
    const title = notification.data.title || "Viral Thread Generator";
    const body = notification.data.body || "You have a new notification";
    const desktopNotification = new window.Notification(title, {
      body,
      icon: "/icon.svg",
      tag: notification._id,
    });

    desktopNotification.onclick = () => {
      window.focus();
      desktopNotification.close();
      onClickAction?.();
    };

    return desktopNotification;
  } catch (err) {
    console.error("Failed to display desktop notification:", err);
    return null;
  }
}

export function useNotifications() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const { isInactive, isActive } = useWindowActivity();

  const [permission, setPermission] = useState<NotificationPermission>("default");

  // Query notifications from Convex
  const rawNotifications = useQuery(
    api.notifications.list,
    isAuthenticated ? { limit: 50, includeDismissed: false } : "skip"
  );
  const unseenCount = useQuery(
    api.notifications.unseenCount,
    isAuthenticated ? {} : "skip"
  );

  // Convex mutations
  const markSeenMutation = useMutation(api.notifications.markSeen);
  const markAllSeenMutation = useMutation(api.notifications.markAllSeen);
  const dismissMutation = useMutation(api.notifications.dismiss);
  const dismissAllMutation = useMutation(api.notifications.dismissAll);

  // Push subscription mutations & actions
  const saveSubscriptionMutation = useMutation(api.pushSubscriptions.saveSubscription);
  const sendTestPushAction = useAction(api.actions.pushNotifications.sendTestPush);

  const notifications: AppNotificationItem[] = (rawNotifications ?? []) as AppNotificationItem[];

  // Track initial load & processed IDs
  const initialLoadDoneRef = useRef<boolean>(false);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const originalTitleRef = useRef<string>("");
  const syncedEndpointRef = useRef<string | null>(null);

  // Sync notification permission state
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(window.Notification.permission);
      originalTitleRef.current = document.title;
    }
  }, []);

  const syncPushSubscription = useCallback(async (): Promise<boolean> => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !isAuthenticated
    ) {
      return false;
    }

    if (window.Notification?.permission !== "granted") {
      return false;
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.warn("Push subscription skipped: NEXT_PUBLIC_VAPID_PUBLIC_KEY is not defined in environment.");
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      const keyUint8 = urlBase64ToUint8Array(vapidKey);

      // Self-healing: if subscription exists under an outdated VAPID key, rotate/resubscribe
      if (subscription && subscription.options?.applicationServerKey) {
        const subKeyArr = new Uint8Array(subscription.options.applicationServerKey);
        let keysMatch = subKeyArr.length === keyUint8.length;
        if (keysMatch) {
          for (let i = 0; i < subKeyArr.length; i++) {
            if (subKeyArr[i] !== keyUint8[i]) {
              keysMatch = false;
              break;
            }
          }
        }
        if (!keysMatch) {
          await subscription.unsubscribe();
          subscription = null;
          syncedEndpointRef.current = null;
        }
      }

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyUint8.buffer as ArrayBuffer,
        });
      }

      const subJson = subscription.toJSON();
      if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
        if (syncedEndpointRef.current === subJson.endpoint) {
          return true;
        }

        await saveSubscriptionMutation({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys.p256dh,
            auth: subJson.keys.auth,
          },
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        });

        syncedEndpointRef.current = subJson.endpoint;
        return true;
      }
    } catch (err) {
      console.warn("Push subscription sync failed:", err);
    }
    return false;
  }, [isAuthenticated, saveSubscriptionMutation]);

  // Automatically sync push subscription when authenticated and granted
  useEffect(() => {
    if (isAuthenticated && permission === "granted") {
      void syncPushSubscription();
    }
  }, [isAuthenticated, permission, syncPushSubscription]);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }

    try {
      const result = await window.Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        toast.success("Notifications enabled!");
        void syncPushSubscription();
      } else if (result === "denied") {
        toast.error("Notifications were blocked in browser settings.");
      }
      return result;
    } catch (err) {
      console.error("Failed to request notification permission:", err);
      return "denied";
    }
  }, [syncPushSubscription]);

  const markSeen = useCallback(
    async (notificationId: Id<"notifications">) => {
      try {
        await markSeenMutation({ notificationId });
      } catch (err) {
        console.error("Failed to mark notification as seen:", err);
      }
    },
    [markSeenMutation]
  );

  const markAllSeen = useCallback(async () => {
    try {
      await markAllSeenMutation({});
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Failed to mark all as seen:", err);
      toast.error("Failed to mark notifications as read");
    }
  }, [markAllSeenMutation]);

  const dismiss = useCallback(
    async (notificationId: Id<"notifications">) => {
      try {
        await dismissMutation({ notificationId });
      } catch (err) {
        console.error("Failed to dismiss notification:", err);
      }
    },
    [dismissMutation]
  );

  const dismissAll = useCallback(async () => {
    try {
      await dismissAllMutation({});
      toast.success("All notifications cleared");
    } catch (err) {
      console.error("Failed to dismiss all notifications:", err);
      toast.error("Failed to clear notifications");
    }
  }, [dismissAllMutation]);

  // Handle incoming notifications (active toast or inactive desktop notification)
  useEffect(() => {
    if (!rawNotifications) {
      return;
    }

    // On initial mount/load, record existing IDs without triggering alerts
    if (!initialLoadDoneRef.current) {
      for (const item of notifications) {
        processedIdsRef.current.add(item._id);
      }
      initialLoadDoneRef.current = true;
      return;
    }

    // Process new unseen items
    const newItems = notifications.filter(
      (item) => !processedIdsRef.current.has(item._id) && !item.isSeen && !item.isDismissed
    );

    for (const item of newItems) {
      processedIdsRef.current.add(item._id);

      const title = item.data.title || "Notification";
      const body = item.data.body;
      const href = item.data.href;
      const sourceHref = item.data.trendKeyword
        ? getTrendSourceHref(item.data.trendKeyword)
        : undefined;
      const isSuccess = item.kind.includes("success");
      const isFailure = item.kind.includes("failed");

      const handleNotificationClick = () => {
        void markSeen(item._id);
        const targetUrl = item.kind === "emerging_trend_alert" ? sourceHref : href;
        if (targetUrl) {
          if (isExternalUrl(targetUrl)) {
            window.open(targetUrl, "_blank", "noopener,noreferrer");
          } else {
            router.push(targetUrl);
          }
        }
      };

      if (isInactive) {
        // Display native app / service worker notification when window is inactive
        void showAppNotification(item, handleNotificationClick);

        // Flash/update document title with unread indicator
        if (typeof document !== "undefined") {
          const currentCount = (unseenCount ?? 0) + 1;
          document.title = `(${currentCount}) ${originalTitleRef.current || "Viral Thread Generator"}`;
        }
      } else {
        // Do NOT automatically mark seen upon toast display so unread badge/count is visible!
        // Notification is marked seen when user clicks toast action, notification item, or mark all as read.

        const handleToastClick = () => {
          void markSeen(item._id);
          if (href) {
            if (isExternalUrl(href)) {
              window.open(href, "_blank", "noopener,noreferrer");
            } else {
              router.push(href);
            }
          }
        };

        // Display in-app toast when window is active
        if (item.kind === "emerging_trend_alert") {
          toast.info(title, {
            description: body,
            action: sourceHref
              ? {
                  label: "View Source",
                  onClick: () => {
                    void markSeen(item._id);
                    router.push(sourceHref);
                  },
                }
              : undefined,
          });
        } else if (isSuccess) {
          toast.success(title, {
            description: body,
            action: href
              ? {
                  label: "Review",
                  onClick: handleToastClick,
                }
              : undefined,
          });
        } else if (isFailure) {
          toast.error(title, {
            description: body || item.data.error,
            action: href
              ? {
                  label: "View",
                  onClick: handleToastClick,
                }
              : undefined,
          });
        } else {
          const actionLabel = item.kind === "thread_hook_selection_required" ? "Select Hook" : "View";
          toast.info(title, {
            description: body,
            action: href
              ? {
                  label: actionLabel,
                  onClick: handleToastClick,
                }
              : undefined,
          });
        }
      }
    }
  }, [rawNotifications, notifications, isInactive, unseenCount, router, markSeen]);

  // Reset document title when window becomes active
  useEffect(() => {
    if (isActive && originalTitleRef.current && typeof document !== "undefined") {
      document.title = originalTitleRef.current;
    }
  }, [isActive]);

  const sendTestNotification = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Notifications are not supported in your browser.");
      return false;
    }

    if (window.Notification.permission !== "granted") {
      toast.error("Notifications are not enabled. Please grant permission first.");
      return false;
    }

    // Try backend push dispatch first to test wake-up on WebAPK / OS
    try {
      await syncPushSubscription();
      const pushRes = await sendTestPushAction({});
      if (pushRes.success) {
        toast.success(pushRes.message || "Test push alert dispatched to your device!");
        return true;
      }
    } catch (pushErr) {
      console.warn("Backend push test failed, attempting local fallback:", pushErr);
    }

    const result = await showAppNotification({
      title: "Viral Thread Generator",
      body: "⚡ Notifications are functional! You will receive alerts when new trends emerge.",
      href: "/dashboard",
      tag: "test_alert",
    });

    if (result) {
      toast.success("Test notification dispatched!");
      return true;
    } else {
      toast.error("Failed to display notification. Check browser permissions.");
      return false;
    }
  }, [syncPushSubscription, sendTestPushAction]);

  return {
    notifications,
    unseenCount: unseenCount ?? 0,
    isLoading: rawNotifications === undefined,
    permission,
    requestPermission,
    sendTestNotification,
    syncPushSubscription,
    markSeen,
    markAllSeen,
    dismiss,
    dismissAll,
    isInactive,
    isActive,
  };
}
