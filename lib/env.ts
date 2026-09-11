/**
 * Application environment detection utilities for Next.js (client, server components, & server actions).
 */

/**
 * Returns true if the app is running in development mode (localhost or NODE_ENV !== "production").
 */
export function isDev(): boolean {
  if (typeof window !== "undefined" && window.location?.hostname) {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
      return true;
    }
  }
  return process.env.NODE_ENV !== "production";
}

/**
 * Alias for isDev.
 */
export const useDev = isDev;

/**
 * Returns true if the app is running in production mode.
 */
export function isProduction(): boolean {
  return !isDev();
}
