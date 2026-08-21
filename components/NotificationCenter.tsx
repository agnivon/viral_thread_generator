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
} from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useNotifications, AppNotificationItem, isExternalUrl } from "@/hooks/use-notifications";
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
  if (kind === "thread_generation_success") {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
        <Sparkles className="h-4 w-4" />
      </div>
    );
  }
  if (kind === "thread_publication_success") {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <Send className="h-4 w-4" />
      </div>
    );
  }
  if (kind === "thread_generation_failed" || kind === "thread_publication_failed") {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
        <AlertCircle className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
      <Bell className="h-4 w-4" />
    </div>
  );
}

export function NotificationCenter() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const {
    notifications,
    unseenCount,
    permission,
    requestPermission,
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
    if (item.data.href) {
      if (isExternalUrl(item.data.href)) {
        window.open(item.data.href, "_blank", "noopener,noreferrer");
      } else {
        setIsOpen(false);
        router.push(item.data.href);
      }
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Open notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-background/80 text-muted-foreground transition-all duration-200 hover:bg-muted/60 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500/50 cursor-pointer"
          />
        }
      >
        <Bell className="h-4 w-4" />
        {unseenCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-1 text-[10px] font-bold text-white shadow-xs animate-in zoom-in-50">
            {unseenCount > 9 ? "9+" : unseenCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 border-border/80 bg-card/95 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold tracking-tight text-foreground">Notifications</h3>
            {unseenCount > 0 && (
              <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-600 dark:text-violet-400">
                {unseenCount} unread
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unseenCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void markAllSeen()}
                className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg flex items-center gap-1"
                title="Mark all as read"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </Button>
            )}
          </div>
        </div>

        {/* Desktop Notification Permission Banner */}
        {permission === "default" && (
          <div className="border-b border-border/40 bg-violet-500/5 p-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2.5">
              <div className="p-1 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 mt-0.5">
                <Laptop className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 space-y-1.5">
                <p className="font-medium text-foreground leading-snug">
                  Get notified in background
                </p>
                <p className="text-[11px] leading-relaxed">
                  Enable desktop alerts so you never miss completed thread drafts when working in other tabs.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void requestPermission()}
                  className="h-6 text-[11px] px-2.5 rounded-lg border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 font-semibold cursor-pointer"
                >
                  Enable Desktop Alerts
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-border/40 px-4 py-2 bg-muted/10">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer",
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
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer",
              filter === "unread"
                ? "bg-muted text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Unread ({unseenCount})
          </button>
        </div>

        {/* Notification Items List */}
        <div className="max-h-[340px] overflow-y-auto divide-y divide-border/30">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground/60 mb-2">
                <Bell className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-foreground">No notifications</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {filter === "unread" ? "You have caught up with all updates." : "New activity will appear here."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item._id}
                onClick={() => handleNotificationClick(item)}
                className={cn(
                  "group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer text-left",
                  !item.isSeen
                    ? "bg-violet-500/5 hover:bg-violet-500/10"
                    : "hover:bg-muted/40"
                )}
              >
                {/* Type Icon */}
                {getNotificationIcon(item.kind)}

                {/* Content */}
                <div className="flex-1 min-w-0 pr-6 space-y-1">
                  <div className="flex items-baseline justify-between gap-1">
                    <h4
                      className={cn(
                        "text-xs leading-snug truncate",
                        !item.isSeen ? "font-bold text-foreground" : "font-medium text-foreground/80"
                      )}
                    >
                      {item.data.title || "Notification"}
                    </h4>
                  </div>
                  {item.data.body && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.data.body}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[10px] text-muted-foreground/70 font-medium">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                    {item.data.href && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-violet-600 dark:text-violet-400 font-semibold group-hover:underline">
                        View <ExternalLink className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Unread Dot & Actions */}
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  {!item.isSeen && (
                    <span className="h-2 w-2 rounded-full bg-violet-600 shadow-xs" title="Unread" />
                  )}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    {!item.isSeen && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void markSeen(item._id);
                        }}
                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                        title="Mark as read"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void dismiss(item._id);
                      }}
                      className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                      title="Dismiss"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border/40 bg-muted/20 px-3 py-2 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void dismissAll()}
              className="h-7 text-xs px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-lg flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              <span>Clear all</span>
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
