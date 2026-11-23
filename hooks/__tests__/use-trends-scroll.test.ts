/// <reference types="vite/client" />
import { expect, test, describe, beforeEach, afterEach, vi } from "vitest";
import {
  formatTrendCardDomId,
  getSavedTrendsScrollPosition,
  setSavedTrendsScrollPosition,
  getSavedTrendsState,
  setSavedTrendsState,
  getSavedTrendsLastItem,
  setSavedTrendsLastItem,
  clearSavedTrendsScroll,
  getHasHydrated,
  setHasHydrated,
  safeSessionGet,
  safeSessionSet,
  safeSessionRemove,
  getCurrentScrollY,
  TRENDS_SCROLL_STORAGE_KEY,
  TRENDS_STATE_STORAGE_KEY,
  TRENDS_LAST_ITEM_KEY,
  TRENDS_LOCKED_KEY,
  TRENDS_FROM_TRENDS_KEY,
  type TrendsPageState,
} from "../use-trends-scroll";

describe("use-trends-scroll utilities and storage handlers", () => {
  const originalSessionStorage = globalThis.sessionStorage;
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    const mockStorage = {
      getItem: (key: string) => mockStore[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStore[key] = String(value);
      },
      removeItem: (key: string) => {
        delete mockStore[key];
      },
      clear: () => {
        mockStore = {};
      },
      length: 0,
      key: (_index: number) => null,
    };

    Object.defineProperty(globalThis, "sessionStorage", {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    if (originalSessionStorage !== undefined) {
      globalThis.sessionStorage = originalSessionStorage;
    } else {
      Reflect.deleteProperty(globalThis, "sessionStorage");
    }
    vi.restoreAllMocks();
  });

  describe("formatTrendCardDomId", () => {
    test("generates valid and sanitized DOM IDs", () => {
      expect(formatTrendCardDomId("apple")).toBe("trend-card-apple");
      expect(formatTrendCardDomId("AI & Machine Learning")).toBe("trend-card-AI_20_26_20Machine_20Learning");
      expect(formatTrendCardDomId("special!@#$queries")).toContain("trend-card-");
    });
  });

  describe("scroll position storage", () => {
    test("returns 0 when no scroll position is stored", () => {
      expect(getSavedTrendsScrollPosition()).toBe(0);
    });

    test("saves and retrieves valid integer scroll positions", () => {
      setSavedTrendsScrollPosition(1420);
      expect(getSavedTrendsScrollPosition()).toBe(1420);
      expect(mockStore[TRENDS_SCROLL_STORAGE_KEY]).toBe("1420");
    });

    test("normalizes negative or invalid values to 0", () => {
      mockStore[TRENDS_SCROLL_STORAGE_KEY] = "-500";
      expect(getSavedTrendsScrollPosition()).toBe(0);

      mockStore[TRENDS_SCROLL_STORAGE_KEY] = "not-a-number";
      expect(getSavedTrendsScrollPosition()).toBe(0);
    });

    test("handles SSR when window is undefined", () => {
      const originalWindow = globalThis.window;
      Reflect.deleteProperty(globalThis, "window");

      expect(getSavedTrendsScrollPosition()).toBe(0);
      expect(() => setSavedTrendsScrollPosition(500)).not.toThrow();

      globalThis.window = originalWindow;
    });
  });

  describe("trends page state storage", () => {
    test("returns null when no state is stored", () => {
      expect(getSavedTrendsState()).toBeNull();
    });

    test("saves and retrieves full state", () => {
      const sampleState: TrendsPageState = {
        keywordSearch: "OpenAI",
        sortMode: "growth",
        onlyMyNiches: true,
        currentPage: 3,
      };

      setSavedTrendsState(sampleState);
      const retrieved = getSavedTrendsState();

      expect(retrieved).toEqual(sampleState);
      expect(JSON.parse(mockStore[TRENDS_STATE_STORAGE_KEY])).toEqual(sampleState);
    });

    test("sanitizes invalid sortMode to relevance and ensures positive page number", () => {
      mockStore[TRENDS_STATE_STORAGE_KEY] = JSON.stringify({
        keywordSearch: "test",
        sortMode: "invalid_sort_mode",
        onlyMyNiches: "not-a-boolean",
        currentPage: -5,
      });

      const retrieved = getSavedTrendsState();
      expect(retrieved).toEqual({
        keywordSearch: "test",
        sortMode: "relevance",
        onlyMyNiches: false,
        currentPage: 1,
      });
    });

    test("gracefully returns null for corrupted JSON", () => {
      mockStore[TRENDS_STATE_STORAGE_KEY] = "corrupted{invalid:json";
      expect(getSavedTrendsState()).toBeNull();
    });
  });

  describe("last item and clear helpers", () => {
    test("saves, retrieves, and clears last clicked trend item and lock flags", () => {
      expect(getSavedTrendsLastItem()).toBeNull();

      setSavedTrendsLastItem("nvidia-stock-spike");
      expect(getSavedTrendsLastItem()).toBe("nvidia-stock-spike");
      expect(mockStore[TRENDS_LAST_ITEM_KEY]).toBe("nvidia-stock-spike");

      mockStore[TRENDS_LOCKED_KEY] = "true";
      mockStore[TRENDS_FROM_TRENDS_KEY] = "true";
      setSavedTrendsScrollPosition(2500);
      expect(getSavedTrendsScrollPosition()).toBe(2500);

      clearSavedTrendsScroll();
      expect(getSavedTrendsScrollPosition()).toBe(0);
      expect(getSavedTrendsLastItem()).toBeNull();
      expect(mockStore[TRENDS_LOCKED_KEY]).toBeUndefined();
      expect(mockStore[TRENDS_FROM_TRENDS_KEY]).toBeUndefined();
    });

    test("hydrated flag tracks client hydration lifecycle", () => {
      expect(typeof getHasHydrated()).toBe("boolean");
      setHasHydrated();
      expect(getHasHydrated()).toBe(true);
    });

    test("safeSession helpers handle get, set, remove without throwing", () => {
      safeSessionSet("test-key", "test-value");
      expect(safeSessionGet("test-key")).toBe("test-value");
      safeSessionRemove("test-key");
      expect(safeSessionGet("test-key")).toBeNull();
    });

    test("getCurrentScrollY returns numeric window scroll position", () => {
      expect(typeof getCurrentScrollY()).toBe("number");
    });
  });
});
