"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Check,
  X,
  Sparkles,
  Send,
  AlertCircle,
  Trash2,
  ExternalLink,
  Laptop,
  TrendingUp,
} from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  useNotifications,
  AppNotificationItem,
  isExternalUrl,
  getTrendSourceHref,
} from "@/hooks/use-notifications";
import { useDev } from "@/hooks/use-dev";
import { cn } from "@/lib/utils";

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffInSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (diffInSeconds < 60) {
    return "just now";
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getNotificationIcon(kind: string) {
  if (kind === "emerging_trend_alert") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-amber-500/20 to-violet-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 shadow-xs">
        <TrendingUp className="h-4.5 w-4.5 text-amber-500" />
      </div>
    );
  }
  if (kind === "thread_hook_selection_required") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <Sparkles className="h-4.5 w-4.5" />
      </div>
    );
  }
  if (kind === "thread_generation_success") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
        <Sparkles className="h-4.5 w-4.5" />
      </div>
    );
  }
  if (kind === "thread_publication_success") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <Send className="h-4.5 w-4.5" />
      </div>
    );
  }
  if (kind === "thread_generation_failed" || kind === "thread_publication_failed") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
        <AlertCircle className="h-4.5 w-4.5" />
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
      <Bell className="h-4.5 w-4.5" />
    </div>
  );
}

export function NotificationCenter() {
  const router = useRouter();
  const isDev = useDev();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const {
    notifications,
    unseenCount,
    permission,
    requestPermission,
    sendTestNotification,
    markSeen,
    markAllSeen,
    dismiss,
    dismissAll,
  } = useNotifications();

  const filteredNotifications = notifications.filter((item) => {
    if (filter === "unread") {
      return !item.isSeen;
    }
    return true;
  });

  const handleNotificationClick = (item: AppNotificationItem) => {
    if (!item.isSeen) {
      void markSeen(item._id);
    }
    const targetUrl =
      item.kind === "emerging_trend_alert"
        ? (item.data.trendKeyword ? getTrendSourceHref(item.data.trendKeyword) : undefined)
        : item.data.href;
    if (targetUrl) {
      if (isExternalUrl(targetUrl)) {
        window.open(targetUrl, "_blank", "noopener,noreferrer");
      } else {
        setIsOpen(false);
        router.push(targetUrl);
      }
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-xl transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Open notifications"
          >
            <Bell className="h-5 w-5" />
            {unseenCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-xs animate-in zoom-in-50">
                {unseenCount > 9 ? "9+" : unseenCount}
              </span>
            )}
          </button>
        }
      />

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[calc(100vw-2rem)] sm:w-[480px] md:w-[500px] p-0 shadow-2xl border-border/60 rounded-2xl bg-card/95 backdrop-blur-xl z-50 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 px-4 sm:px-5 py-3.5 bg-muted/20">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-foreground">Notifications</h3>
            {unseenCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                {unseenCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unseenCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void markAllSeen()}
                className="h-8 text-xs px-2 sm:px-2.5 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg flex items-center gap-1.5"
                title="Mark all as read"
              >
                <CheckCheck className="h-4 w-4" />
                <span className="hidden min-[380px]:inline">Mark all read</span>
                <span className="min-[380px]:hidden text-[11px]">Read all</span>
              </Button>
            )}
          </div>
        </div>

        {/* Desktop Notification Permission Banner */}
        {permission === "default" && (
          <div className="border-b border-border/40 bg-violet-500/5 p-3.5 text-xs text-muted-foreground">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 mt-0.5">
                <Laptop className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-1.5">
                <p className="font-semibold text-foreground leading-snug">
                  Get notified in background
                </p>
                <p className="text-[12px] leading-relaxed">
                  Enable desktop alerts so you never miss emerging trends and drafts when working in other tabs.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void requestPermission()}
                  className="h-7 text-xs px-3 rounded-lg border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 font-semibold cursor-pointer"
                >
                  Enable Desktop Alerts
                </Button>
              </div>
            </div>
          </div>
        )}

        {permission === "granted" && (
          <div className="border-b border-border/40 bg-emerald-500/5 px-5 py-2.5 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Desktop alerts active
            </span>
            {isDev && (
              <button
                type="button"
                onClick={() => void sendTestNotification()}
                className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline font-semibold cursor-pointer"
              >
                Send test alert
              </button>
            )}
          </div>
        )}

        {permission === "denied" && (
          <div className="border-b border-border/40 bg-amber-500/5 px-5 py-2.5 text-xs text-amber-600 dark:text-amber-400">
            <p className="text-[11px] leading-snug">
              Desktop alerts are blocked by your browser. Enable notifications in your browser address bar to receive background alerts.
            </p>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-border/40 px-5 py-2.5 bg-muted/10">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
              filter === "all"
                ? "bg-muted text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
              filter === "unread"
                ? "bg-muted text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Unread ({unseenCount})
          </button>
        </div>

        {/* Notification Items List */}
        <div className="max-h-[460px] sm:max-h-[500px] overflow-y-auto divide-y divide-border/30">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground/60 mb-3">
                <Bell className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground mt-1">
                {filter === "unread" ? "You have caught up with all updates." : "New activity will appear here."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item._id}
                onClick={() => handleNotificationClick(item)}
                className={cn(
                  "group relative flex items-start gap-3.5 p-4 transition-colors cursor-pointer text-left",
                  !item.isSeen
                    ? "bg-violet-500/5 hover:bg-violet-500/10"
                    : "hover:bg-muted/40"
                )}
              >
                {/* Type Icon */}
                {getNotificationIcon(item.kind)}

                {/* Content */}
                <div className="flex-1 min-w-0 pr-20 sm:pr-24 space-y-1">
                  <div className="min-w-0 w-full overflow-hidden">
                    <h4
                      className={cn(
                        "text-sm leading-snug truncate block w-full",
                        !item.isSeen ? "font-bold text-foreground" : "font-medium text-foreground/80"
                      )}
                      title={item.data.title || "Notification"}
                    >
                      {item.data.title || "Notification"}
                    </h4>
                  </div>
                  {item.data.body && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed break-words">
                      {item.data.body}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <span className="text-[11px] text-muted-foreground/70 font-medium">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                    {item.kind === "emerging_trend_alert" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        ⚡ Emerging Trend
                      </span>
                    )}
                    {item.kind !== "emerging_trend_alert" && item.data.href && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-violet-600 dark:text-violet-400 font-semibold group-hover:underline ml-auto">
                        View <ExternalLink className="h-3 w-3" />
                      </span>
                    )}
                  </div>

                  {item.kind === "emerging_trend_alert" && (
                    <div className="flex items-center gap-2 pt-2">
                      {item.data.trendKeyword && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!item.isSeen) void markSeen(item._id);
                            setIsOpen(false);
                            router.push(getTrendSourceHref(item.data.trendKeyword!));
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors cursor-pointer"
                        >
                          <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                          <span>View Source</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Unread Dot & Actions */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 shrink-0 z-10">
                  {!item.isSeen && (
                    <span className="h-2 w-2 rounded-full bg-violet-600 shadow-xs shrink-0" title="Unread" />
                  )}
                  <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 bg-background/80 backdrop-blur-xs rounded-md">
                    {!item.isSeen && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void markSeen(item._id);
                        }}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"
                        title="Mark as read"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void dismiss(item._id);
                      }}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
                      title="Dismiss"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border/40 bg-muted/20 px-4 py-2.5 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void dismissAll()}
              className="h-8 text-xs px-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-lg flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear all</span>
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
