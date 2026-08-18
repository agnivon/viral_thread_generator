"use client";

import { useState, useEffect, useCallback } from "react";

export interface WindowActivityState {
  isActive: boolean;
  isInactive: boolean;
  isVisible: boolean;
  isFocused: boolean;
}

export function checkIsWindowInactive(): boolean {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return false;
  }
  const isHidden = document.visibilityState === "hidden" || document.hidden;
  const isUnfocused = typeof document.hasFocus === "function" ? !document.hasFocus() : false;
  return isHidden || isUnfocused;
}

export function useWindowActivity(): WindowActivityState {
  const [state, setState] = useState<WindowActivityState>({
    isActive: true,
    isInactive: false,
    isVisible: true,
    isFocused: true,
  });

  const updateState = useCallback(() => {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return;
    }

    const isVisible = document.visibilityState === "visible" && !document.hidden;
    const isFocused = typeof document.hasFocus === "function" ? document.hasFocus() : true;
    const isActive = isVisible && isFocused;
    const isInactive = !isActive;

    setState((prev) => {
      if (
        prev.isActive === isActive &&
        prev.isInactive === isInactive &&
        prev.isVisible === isVisible &&
        prev.isFocused === isFocused
      ) {
        return prev;
      }
      return {
        isActive,
        isInactive,
        isVisible,
        isFocused,
      };
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    // Initial check
    updateState();

    const handleVisibilityChange = () => updateState();
    const handleFocus = () => updateState();
    const handleBlur = () => updateState();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, [updateState]);

  return state;
}
