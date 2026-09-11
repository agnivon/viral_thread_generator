"use client";

import { useMemo } from "react";

/**
 * React hook to check whether the client application is running in development mode.
 *
 * Checks:
 * - `window.location.hostname` for localhost / 127.0.0.1
 * - `process.env.NODE_ENV !== "production"`
 */
export function useDev(): boolean {
  return useMemo(() => {
    if (typeof window !== "undefined" && window.location?.hostname) {
      const hostname = window.location.hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local")) {
        return true;
      }
    }
    return process.env.NODE_ENV !== "production";
  }, []);
}
