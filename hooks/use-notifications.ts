"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
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
}

export function getTrendSourceHref(keyword: string): string {
  const slug = keyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `/sources/${encodeURIComponent(slug || keyword)}`;
}

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

  const notifications: AppNotificationItem[] = (rawNotifications ?? []) as AppNotificationItem[];

  // Track initial load & processed IDs
  const initialLoadDoneRef = useRef<boolean>(false);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const originalTitleRef = useRef<string>("");

  // Sync notification permission state
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(window.Notification.permission);
      originalTitleRef.current = document.title;
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }

    try {
      const result = await window.Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        toast.success("Desktop notifications enabled!");
      } else if (result === "denied") {
        toast.error("Desktop notifications were blocked in browser settings.");
      }
      return result;
    } catch (err) {
      console.error("Failed to request notification permission:", err);
      return "denied";
    }
  }, []);

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
        // Display native desktop notification when window is inactive
        showDesktopNotification(item, handleNotificationClick);

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

  const sendTestNotification = useCallback(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Desktop notifications are not supported in your browser.");
      return false;
    }

    if (window.Notification.permission !== "granted") {
      toast.error("Desktop notifications are not enabled. Please grant permission first.");
      return false;
    }

    try {
      const testNotification = new window.Notification("Viral Thread Generator", {
        body: "⚡ Desktop notifications are functional! You will receive native alerts when new trends emerge.",
        icon: "/icon.svg",
      });

      testNotification.onclick = () => {
        window.focus();
        testNotification.close();
      };

      toast.success("Test desktop notification dispatched!");
      return true;
    } catch (err) {
      console.error("Failed to trigger desktop notification:", err);
      toast.error("Failed to display desktop notification. Check browser permissions.");
      return false;
    }
  }, []);

  return {
    notifications,
    unseenCount: unseenCount ?? 0,
    isLoading: rawNotifications === undefined,
    permission,
    requestPermission,
    sendTestNotification,
    markSeen,
    markAllSeen,
    dismiss,
    dismissAll,
    isInactive,
    isActive,
  };
}
