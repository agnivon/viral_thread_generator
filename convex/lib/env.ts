/**
 * Environment detection utilities for Convex functions, actions, and crons.
 * Provides unified `isDev` / `useDev` / `isProduction` checks across the codebase.
 */

/**
 * Returns true if running in a development deployment or local dev environment.
 *
 * Evaluates:
 * 1. `CONVEX_DEPLOYMENT` starting with "dev:"
 * 2. `SITE_URL` containing "localhost" or "127.0.0.1"
 * 3. `NODE_ENV` explicitly set to "development" or any non-production value
 * 4. Safe fallback if neither NODE_ENV nor CONVEX_DEPLOYMENT is configured
 */
export type EnvDictionary = Record<string, string | undefined>;

/**
 * Returns true if running in a development deployment or local dev environment.
 *
 * Evaluates:
 * 1. `CONVEX_DEPLOYMENT` starting with "dev:"
 * 2. `SITE_URL` containing "localhost" or "127.0.0.1"
 * 3. `NODE_ENV` explicitly set to "development" or any non-production value
 * 4. Safe fallback if neither NODE_ENV nor CONVEX_DEPLOYMENT is configured
 */
export function isDev(env: EnvDictionary = process.env): boolean {
  if (env.CONVEX_DEPLOYMENT?.startsWith("dev:")) return true;
  if (
    env.SITE_URL &&
    (env.SITE_URL.includes("localhost") || env.SITE_URL.includes("127.0.0.1"))
  ) {
    return true;
  }
  if (env.NODE_ENV === "development") return true;
  if (env.NODE_ENV && env.NODE_ENV !== "production") return true;
  if (!env.NODE_ENV && !env.CONVEX_DEPLOYMENT) return true;
  return false;
}

/**
 * Alias for `isDev` to support the `useDev` convention across modules.
 */
export const useDev = isDev;

/**
 * Returns true if running in a production deployment.
 */
export function isProduction(env: EnvDictionary = process.env): boolean {
  return !isDev(env);
}

/**
 * Determines whether the emerging trend detection cron should be registered and executed.
 * Automatically disabled in development environments unless explicitly enabled via ENABLE_DEV_TREND_CRON="true".
 * Can be explicitly disabled in any environment via DISABLE_TREND_CRON="true".
 */
export function isTrendCronEnabled(env: EnvDictionary = process.env): boolean {
  if (env.DISABLE_TREND_CRON === "true") return false;
  if (env.ENABLE_DEV_TREND_CRON === "true") return true;
  return !isDev(env);
}
