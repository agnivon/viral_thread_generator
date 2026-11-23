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
  if (typeof window === "undefined") return 0;
  try {
    const raw = sessionStorage.getItem(TRENDS_SCROLL_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  } catch {
    return 0;
  }
}

export function setSavedTrendsScrollPosition(y: number): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(TRENDS_SCROLL_STORAGE_KEY, Math.max(0, Math.round(y)).toString());
  } catch {
    // Quota or security exception
  }
}

export function getSavedTrendsState(): TrendsPageState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(TRENDS_STATE_STORAGE_KEY);
    if (!raw) return null;
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
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(TRENDS_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota or security exception
  }
}

export function getSavedTrendsLastItem(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(TRENDS_LAST_ITEM_KEY);
  } catch {
    return null;
  }
}

export function setSavedTrendsLastItem(itemId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(TRENDS_LAST_ITEM_KEY, itemId);
  } catch {
    // Quota or security exception
  }
}

export function clearSavedTrendsScroll(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(TRENDS_SCROLL_STORAGE_KEY, "0");
    sessionStorage.removeItem(TRENDS_LAST_ITEM_KEY);
    sessionStorage.removeItem(TRENDS_LOCKED_KEY);
    sessionStorage.removeItem(TRENDS_FROM_TRENDS_KEY);
  } catch {
    // Quota or security exception
  }
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

  // Keep latest state in ref for unmount and scroll events
  const stateRef = useRef(state);
  stateRef.current = state;

  // Whether we are currently in the middle of navigating away or restoring saved scroll
  const isNavigatingAwayRef = useRef<boolean>(false);
  const isRestoringRef = useRef<boolean>(
    typeof window !== "undefined" &&
      (getSavedTrendsScrollPosition() > 0 || sessionStorage.getItem(TRENDS_LOCKED_KEY) === "true")
  );
  const restoredRef = useRef<boolean>(false);
  const scrollTickingRef = useRef<boolean>(false);

  // Synchronously save card click and state, and lock to prevent scroll-to-0 overwrite
  const saveCardClick = useCallback((itemId: string) => {
    if (typeof window === "undefined") return;
    isNavigatingAwayRef.current = true;
    const currentY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    try {
      sessionStorage.setItem(TRENDS_SCROLL_STORAGE_KEY, Math.max(0, Math.round(currentY)).toString());
      sessionStorage.setItem(TRENDS_LAST_ITEM_KEY, itemId);
      sessionStorage.setItem(TRENDS_STATE_STORAGE_KEY, JSON.stringify(stateRef.current));
      sessionStorage.setItem(TRENDS_LOCKED_KEY, "true");
      sessionStorage.setItem(TRENDS_FROM_TRENDS_KEY, "true");
    } catch {
      // Storage exception
    }
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
    const scrollTarget = typeof targetY === "number" ? targetY : (window.scrollY || document.documentElement.scrollTop || 0);
    window.scrollTo({
      top: scrollTarget,
      behavior: "instant",
    });
    setSavedTrendsScrollPosition(scrollTarget);
  }, []);

  // Save on state change when not restoring
  const saveCurrentState = useCallback((overrideScrollY?: number) => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(TRENDS_LOCKED_KEY) === "true") return;
    } catch {}
    const scrollY = typeof overrideScrollY === "number" ? overrideScrollY : (window.scrollY || document.documentElement.scrollTop || 0);
    setSavedTrendsScrollPosition(scrollY);
    setSavedTrendsState(stateRef.current);
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
      const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      setShowScrollTop(scrollY > 400);

      // Do NOT overwrite saved position while restoring or navigating away
      if (isRestoringRef.current || isNavigatingAwayRef.current) {
        return;
      }
      try {
        if (sessionStorage.getItem(TRENDS_LOCKED_KEY) === "true") {
          return;
        }
      } catch {}

      if (!scrollTickingRef.current) {
        scrollTickingRef.current = true;
        window.requestAnimationFrame(() => {
          try {
            if (sessionStorage.getItem(TRENDS_LOCKED_KEY) !== "true" && !isNavigatingAwayRef.current) {
              const y = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
              setSavedTrendsScrollPosition(y);
              setSavedTrendsState(stateRef.current);
            }
          } catch {}
          scrollTickingRef.current = false;
        });
      }
    };

    const handleBeforeUnload = () => {
      try {
        if (sessionStorage.getItem(TRENDS_LOCKED_KEY) !== "true" && !isNavigatingAwayRef.current) {
          const y = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
          setSavedTrendsScrollPosition(y);
          setSavedTrendsState(stateRef.current);
        }
      } catch {}
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);

      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = originalScrollRestoration;
      }

      // Only persist state on unmount if NOT navigating away to a topic (which already saved exact position and locked it)
      try {
        if (!isNavigatingAwayRef.current && sessionStorage.getItem(TRENDS_LOCKED_KEY) !== "true") {
          const y = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
          if (y > 0) {
            setSavedTrendsScrollPosition(y);
            setSavedTrendsState(stateRef.current);
          }
        }
      } catch {}
    };
  }, []);

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
      try {
        sessionStorage.removeItem(TRENDS_LOCKED_KEY);
      } catch {}
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

    // Attempt 3: After short delay to override any router scroll reset
    const timer1 = setTimeout(() => {
      applyScroll();
    }, 60);

    // Final attempt & release lock after DOM settles
    const timer2 = setTimeout(() => {
      applyScroll();
      isRestoringRef.current = false;
      try {
        sessionStorage.removeItem(TRENDS_LOCKED_KEY);
      } catch {}
    }, 200);

    return () => {
      window.cancelAnimationFrame(rafId);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isReady, totalFilteredItems]);

  return {
    showScrollTop,
    saveCardClick,
    resetScrollToTop,
    preserveScrollPosition,
    saveCurrentState,
    formatCardDomId: formatTrendCardDomId,
  };
}
