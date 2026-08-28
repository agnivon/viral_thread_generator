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
}

export interface AppNotificationItem {
  _id: Id<"notifications">;
  kind: string;
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
      const isSuccess = item.kind.includes("success");
      const isFailure = item.kind.includes("failed");

      const handleNotificationClick = () => {
        if (href) {
          if (isExternalUrl(href)) {
            window.open(href, "_blank", "noopener,noreferrer");
          } else {
            router.push(href);
          }
        }
        void markSeen(item._id);
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
        // Mark as read immediately upon displaying in-app toast when window is visible and in focus
        void markSeen(item._id);

        const handleToastClick = () => {
          if (href) {
            if (isExternalUrl(href)) {
              window.open(href, "_blank", "noopener,noreferrer");
            } else {
              router.push(href);
            }
          }
        };

        // Display in-app toast when window is active
        if (isSuccess) {
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
          toast.info(title, {
            description: body,
            action: href
              ? {
                  label: "View",
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

  return {
    notifications,
    unseenCount: unseenCount ?? 0,
    isLoading: rawNotifications === undefined,
    permission,
    requestPermission,
    markSeen,
    markAllSeen,
    dismiss,
    dismissAll,
    isInactive,
    isActive,
  };
}
