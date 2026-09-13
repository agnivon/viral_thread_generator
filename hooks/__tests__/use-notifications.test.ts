/// <reference types="vite/client" />
import { expect, test, vi, describe, afterEach } from "vitest";
import { showDesktopNotification, showAppNotification, AppNotificationItem, isExternalUrl } from "../use-notifications";
import { Id } from "@/convex/_generated/dataModel";

interface MockNotificationInstance {
  title: string;
  options?: NotificationOptions;
  close: () => void;
  onclick?: () => void;
}

describe("isExternalUrl", () => {
  test("returns true for http and https urls", () => {
    expect(isExternalUrl("https://threads.net/@user/post/123")).toBe(true);
    expect(isExternalUrl("http://example.com")).toBe(true);
    expect(isExternalUrl("//example.com/path")).toBe(true);
  });

  test("returns false for internal relative routes or empty values", () => {
    expect(isExternalUrl("/threads/drafts/123/approve")).toBe(false);
    expect(isExternalUrl("/dashboard")).toBe(false);
    expect(isExternalUrl("")).toBe(false);
    expect(isExternalUrl(undefined)).toBe(false);
  });
});

describe("showDesktopNotification", () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    if (originalWindow !== undefined) {
      globalThis.window = originalWindow;
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
    vi.restoreAllMocks();
  });

  const mockNotification: AppNotificationItem = {
    _id: "notif_123" as Id<"notifications">,
    kind: "thread_generation_success",
    targetId: "user_123",
    data: {
      threadId: "draft_123",
      title: "Thread Generation Succeeded",
      body: "Your viral thread is ready for review.",
      href: "/threads/drafts/draft_123/approve",
    },
    isSeen: false,
    isDismissed: false,
    createdAt: Date.now(),
  };

  test("returns null when window is undefined", () => {
    Reflect.deleteProperty(globalThis, "window");
    expect(showDesktopNotification(mockNotification)).toBe(null);
  });

  test("returns null when Notification is not in window", () => {
    globalThis.window = {} as Window & typeof globalThis;
    expect(showDesktopNotification(mockNotification)).toBe(null);
  });

  test("returns null when Notification.permission is not granted", () => {
    const mockNotifConstructor = vi.fn();
    Object.defineProperty(mockNotifConstructor, "permission", {
      value: "denied",
      configurable: true,
    });

    globalThis.window = {
      Notification: mockNotifConstructor,
      focus: vi.fn(),
    } as unknown as Window & typeof globalThis;

    expect(showDesktopNotification(mockNotification)).toBe(null);
    expect(mockNotifConstructor).not.toHaveBeenCalled();
  });

  test("creates native Notification and triggers click action when granted", () => {
    const focusMock = vi.fn();
    const closeMock = vi.fn();
    const clickActionMock = vi.fn();

    let createdInstance: MockNotificationInstance | null = null;
    function MockNotificationClass(
      this: MockNotificationInstance,
      title: string,
      options?: NotificationOptions
    ) {
      this.title = title;
      this.options = options;
      this.close = closeMock;
      createdInstance = this;
      return this;
    }
    Object.defineProperty(MockNotificationClass, "permission", {
      value: "granted",
      configurable: true,
    });

    globalThis.window = {
      Notification: MockNotificationClass as unknown as typeof Notification,
      focus: focusMock,
    } as unknown as Window & typeof globalThis;

    const result = showDesktopNotification(mockNotification, clickActionMock);

    expect(result).not.toBeNull();
    expect(createdInstance).not.toBeNull();
    expect(createdInstance?.title).toBe("Thread Generation Succeeded");
    expect(createdInstance?.options).toEqual({
      body: "Your viral thread is ready for review.",
      icon: "/icon.svg",
      tag: "notif_123",
    });

    // Simulate clicking the desktop notification
    createdInstance?.onclick?.();

    expect(focusMock).toHaveBeenCalled();
    expect(closeMock).toHaveBeenCalled();
    expect(clickActionMock).toHaveBeenCalled();
  });
});

describe("showAppNotification", () => {
  const originalWindow = globalThis.window;
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    if (originalWindow !== undefined) {
      globalThis.window = originalWindow;
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }

    if (originalNavigator !== undefined) {
      globalThis.navigator = originalNavigator;
    } else {
      Reflect.deleteProperty(globalThis, "navigator");
    }
    vi.restoreAllMocks();
  });

  const mockNotification: AppNotificationItem = {
    _id: "notif_456" as Id<"notifications">,
    kind: "thread_publication_success",
    targetId: "user_456",
    data: {
      threadId: "draft_456",
      title: "Thread Published",
      body: "Your thread is live on Threads!",
      href: "https://threads.net/@user/post/456",
    },
    isSeen: false,
    isDismissed: false,
    createdAt: Date.now(),
  };

  test("uses ServiceWorkerRegistration.showNotification when available (mobile / PWA path)", async () => {
    const showNotificationMock = vi.fn().mockResolvedValue(undefined);

    globalThis.navigator = {
      serviceWorker: {
        ready: Promise.resolve({
          showNotification: showNotificationMock,
        }),
      },
    } as unknown as Navigator;

    const mockNotifConstructor = vi.fn();
    Object.defineProperty(mockNotifConstructor, "permission", {
      value: "granted",
      configurable: true,
    });

    globalThis.window = {
      Notification: mockNotifConstructor as unknown as typeof Notification,
      focus: vi.fn(),
    } as unknown as Window & typeof globalThis;

    const result = await showAppNotification(mockNotification);

    expect(result).toBe(true);
    expect(showNotificationMock).toHaveBeenCalledWith("Thread Published", {
      body: "Your thread is live on Threads!",
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: "notif_456",
      data: {
        href: "https://threads.net/@user/post/456",
      },
    });
    expect(mockNotifConstructor).not.toHaveBeenCalled();
  });

  test("falls back to window.Notification when serviceWorker is not present", async () => {
    Reflect.deleteProperty(globalThis, "navigator");

    let createdInstance: MockNotificationInstance | null = null;
    function MockNotificationClass(
      this: MockNotificationInstance,
      title: string,
      options?: NotificationOptions
    ) {
      this.title = title;
      this.options = options;
      this.close = vi.fn();
      createdInstance = this;
      return this;
    }
    Object.defineProperty(MockNotificationClass, "permission", {
      value: "granted",
      configurable: true,
    });

    globalThis.window = {
      Notification: MockNotificationClass as unknown as typeof Notification,
      focus: vi.fn(),
    } as unknown as Window & typeof globalThis;

    const result = await showAppNotification(mockNotification);

    expect(result).not.toBeNull();
    expect(createdInstance).not.toBeNull();
    expect(createdInstance?.title).toBe("Thread Published");
    expect(createdInstance?.options?.tag).toBe("notif_456");
  });

  test("returns null when permission is denied", async () => {
    const mockNotifConstructor = vi.fn();
    Object.defineProperty(mockNotifConstructor, "permission", {
      value: "denied",
      configurable: true,
    });

    globalThis.window = {
      Notification: mockNotifConstructor as unknown as typeof Notification,
    } as unknown as Window & typeof globalThis;

    const result = await showAppNotification(mockNotification);
    expect(result).toBeNull();
  });
});

