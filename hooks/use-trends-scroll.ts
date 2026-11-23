"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export const TRENDS_SCROLL_STORAGE_KEY = "vtr_trends_scroll_pos";
export const TRENDS_STATE_STORAGE_KEY = "vtr_trends_state";
export const TRENDS_LAST_ITEM_KEY = "vtr_trends_last_item_id";
export const TRENDS_LOCKED_KEY = "vtr_trends_locked";
export const TRENDS_FROM_TRENDS_KEY = "vtr_trends_from_trends";

let hasHydratedGlobal = false;

export function getHasHydrated(): boolean {
  return hasHydratedGlobal;
}

export function setHasHydrated(): void {
  hasHydratedGlobal = true;
}

export function safeSessionGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSessionSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Quota or security exception
  }
}

export function safeSessionRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Quota or security exception
  }
}

export function getCurrentScrollY(): number {
  if (typeof window === "undefined") return 0;
  const doc = typeof document !== "undefined" ? document : null;
  return window.scrollY || doc?.documentElement?.scrollTop || doc?.body?.scrollTop || 0;
}

export type SortMode = "relevance" | "traffic" | "growth" | "recent";

export interface TrendsPageState {
  keywordSearch: string;
  sortMode: SortMode;
  onlyMyNiches: boolean;
  currentPage: number;
}

export function formatTrendCardDomId(itemId: string): string {
  return `trend-card-${encodeURIComponent(itemId).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export function getSavedTrendsScrollPosition(): number {
  const raw = safeSessionGet(TRENDS_SCROLL_STORAGE_KEY);
  if (!raw) return 0;
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

export function setSavedTrendsScrollPosition(y: number): void {
  safeSessionSet(TRENDS_SCROLL_STORAGE_KEY, Math.max(0, Math.round(y)).toString());
}

export function getSavedTrendsState(): TrendsPageState | null {
  const raw = safeSessionGet(TRENDS_STATE_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<TrendsPageState>;
    if (typeof parsed !== "object" || parsed === null) return null;

    const validSortModes: SortMode[] = ["relevance", "traffic", "growth", "recent"];
    const sortMode = validSortModes.includes(parsed.sortMode as SortMode)
      ? (parsed.sortMode as SortMode)
      : "relevance";

    return {
      keywordSearch: typeof parsed.keywordSearch === "string" ? parsed.keywordSearch : "",
      sortMode,
      onlyMyNiches: typeof parsed.onlyMyNiches === "boolean" ? parsed.onlyMyNiches : false,
      currentPage: typeof parsed.currentPage === "number" && parsed.currentPage > 0 ? parsed.currentPage : 1,
    };
  } catch {
    return null;
  }
}

export function setSavedTrendsState(state: TrendsPageState): void {
  try {
    safeSessionSet(TRENDS_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota or serialization exception
  }
}

export function getSavedTrendsLastItem(): string | null {
  return safeSessionGet(TRENDS_LAST_ITEM_KEY);
}

export function setSavedTrendsLastItem(itemId: string): void {
  safeSessionSet(TRENDS_LAST_ITEM_KEY, itemId);
}

export function clearSavedTrendsScroll(): void {
  safeSessionSet(TRENDS_SCROLL_STORAGE_KEY, "0");
  safeSessionRemove(TRENDS_LAST_ITEM_KEY);
  safeSessionRemove(TRENDS_LOCKED_KEY);
  safeSessionRemove(TRENDS_FROM_TRENDS_KEY);
}

export interface UseTrendsScrollOptions {
  isReady: boolean;
  totalFilteredItems: number;
  state: TrendsPageState;
}

export function useTrendsScroll({
  isReady,
  totalFilteredItems,
  state,
}: UseTrendsScrollOptions) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Keep latest state in ref for unmount and navigation events
  const stateRef = useRef(state);
  stateRef.current = state;

  // Whether we are currently in the middle of navigating away or restoring saved scroll
  const isNavigatingAwayRef = useRef<boolean>(false);
  const isRestoringRef = useRef<boolean>(
    typeof window !== "undefined" &&
      (getSavedTrendsScrollPosition() > 0 || safeSessionGet(TRENDS_LOCKED_KEY) === "true")
  );
  const restoredRef = useRef<boolean>(false);
  const scrollTickingRef = useRef<boolean>(false);

  // Synchronously save card click and state, and lock to prevent scroll-to-0 overwrite
  const saveCardClick = useCallback((itemId: string) => {
    if (typeof window === "undefined") return;
    isNavigatingAwayRef.current = true;
    const currentY = getCurrentScrollY();
    setSavedTrendsScrollPosition(currentY);
    setSavedTrendsLastItem(itemId);
    setSavedTrendsState(stateRef.current);
    safeSessionSet(TRENDS_LOCKED_KEY, "true");
    safeSessionSet(TRENDS_FROM_TRENDS_KEY, "true");
  }, []);

  // Reset scroll to top (smooth or instant) and update session storage
  const resetScrollToTop = useCallback((smooth = true) => {
    if (typeof window === "undefined") return;
    isRestoringRef.current = false;
    clearSavedTrendsScroll();
    window.scrollTo({
      top: 0,
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  // Preserve and restore exact position after manual feed refresh
  const preserveScrollPosition = useCallback((targetY?: number) => {
    if (typeof window === "undefined") return;
    const scrollTarget = typeof targetY === "number" ? targetY : getCurrentScrollY();
    window.scrollTo({
      top: scrollTarget,
      behavior: "instant",
    });
    setSavedTrendsScrollPosition(scrollTarget);
  }, []);

  // Helper to persist current scroll position and state when page unloads/unmounts
  const persistCurrentScrollAndState = useCallback(() => {
    if (isNavigatingAwayRef.current || safeSessionGet(TRENDS_LOCKED_KEY) === "true") {
      return;
    }
    const y = getCurrentScrollY();
    if (y > 0) {
      setSavedTrendsScrollPosition(y);
      setSavedTrendsState(stateRef.current);
    }
  }, []);

  // Effect 1: Handle passive scroll tracking and browser scrollRestoration setting
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Set scrollRestoration to manual to prevent browser prematurely zeroing scroll
    const originalScrollRestoration =
      "scrollRestoration" in window.history ? window.history.scrollRestoration : "auto";
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const handleScroll = () => {
      const scrollY = getCurrentScrollY();
      setShowScrollTop(scrollY > 400);

      // Do NOT overwrite saved position while restoring or navigating away
      if (isRestoringRef.current || isNavigatingAwayRef.current) {
        return;
      }
      if (safeSessionGet(TRENDS_LOCKED_KEY) === "true") {
        return;
      }

      if (!scrollTickingRef.current) {
        scrollTickingRef.current = true;
        window.requestAnimationFrame(() => {
          if (safeSessionGet(TRENDS_LOCKED_KEY) !== "true" && !isNavigatingAwayRef.current) {
            setSavedTrendsScrollPosition(getCurrentScrollY());
          }
          scrollTickingRef.current = false;
        });
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("beforeunload", persistCurrentScrollAndState);
    window.addEventListener("pagehide", persistCurrentScrollAndState);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("beforeunload", persistCurrentScrollAndState);
      window.removeEventListener("pagehide", persistCurrentScrollAndState);

      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = originalScrollRestoration;
      }

      // Persist state on unmount if not navigating away to a topic (which already saved and locked)
      persistCurrentScrollAndState();
    };
  }, [persistCurrentScrollAndState]);

  // Effect 2: Perform scroll restoration once data is rendered
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isReady || totalFilteredItems === 0) return;
    if (restoredRef.current) return;

    restoredRef.current = true;
    const targetY = getSavedTrendsScrollPosition();
    const lastItemId = getSavedTrendsLastItem();

    if (targetY <= 0 && !lastItemId) {
      isRestoringRef.current = false;
      safeSessionRemove(TRENDS_LOCKED_KEY);
      return;
    }

    const applyScroll = () => {
      if (targetY > 0) {
        window.scrollTo(0, targetY);
        if (document.documentElement) document.documentElement.scrollTop = targetY;
        if (document.body) document.body.scrollTop = targetY;
      }

      if (lastItemId) {
        const domId = formatTrendCardDomId(lastItemId);
        const cardEl = document.getElementById(domId);
        if (cardEl) {
          const rect = cardEl.getBoundingClientRect();
          // If the card is completely out of the viewport, bring it into view
          if (rect.top < 0 || rect.bottom > window.innerHeight) {
            cardEl.scrollIntoView({ block: "center", behavior: "auto" });
          }
        }
      }
    };

    // Attempt 1: Immediate execution (synchronous)
    applyScroll();

    // Attempt 2: requestAnimationFrame after paint
    const rafId = window.requestAnimationFrame(() => {
      applyScroll();
    });

    // Attempt 3: Final confirmation & release lock after DOM settles
    const timer = setTimeout(() => {
      applyScroll();
      isRestoringRef.current = false;
      safeSessionRemove(TRENDS_LOCKED_KEY);
    }, 150);

    return () => {
      window.cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, [isReady, totalFilteredItems]);

  return {
    showScrollTop,
    saveCardClick,
    resetScrollToTop,
    preserveScrollPosition,
    formatCardDomId: formatTrendCardDomId,
  };
}
