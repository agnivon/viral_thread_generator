/// <reference types="vite/client" />
import { expect, test, vi, describe, afterEach } from "vitest";
import { checkIsWindowInactive } from "./use-window-activity";

describe("checkIsWindowInactive", () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;

  afterEach(() => {
    if (originalDocument !== undefined) {
      globalThis.document = originalDocument;
    } else {
      Reflect.deleteProperty(globalThis, "document");
    }
    if (originalWindow !== undefined) {
      globalThis.window = originalWindow;
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
    vi.restoreAllMocks();
  });

  test("returns false when window or document is undefined (SSR)", () => {
    Reflect.deleteProperty(globalThis, "document");
    Reflect.deleteProperty(globalThis, "window");
    expect(checkIsWindowInactive()).toBe(false);
  });

  test("returns true when document is hidden", () => {
    globalThis.window = {} as Window & typeof globalThis;
    globalThis.document = {
      visibilityState: "hidden",
      hidden: true,
      hasFocus: () => true,
    } as unknown as Document;
    expect(checkIsWindowInactive()).toBe(true);
  });

  test("returns true when document is not focused", () => {
    globalThis.window = {} as Window & typeof globalThis;
    globalThis.document = {
      visibilityState: "visible",
      hidden: false,
      hasFocus: () => false,
    } as unknown as Document;
    expect(checkIsWindowInactive()).toBe(true);
  });

  test("returns false when document is visible and focused", () => {
    globalThis.window = {} as Window & typeof globalThis;
    globalThis.document = {
      visibilityState: "visible",
      hidden: false,
      hasFocus: () => true,
    } as unknown as Document;
    expect(checkIsWindowInactive()).toBe(false);
  });
});
