/**
 * Site-wide configuration and URL resolution for SEO, OpenGraph, and metadata.
 */

export const PRODUCTION_DOMAIN = "viralthreads.agnivon.dev";
export const PRODUCTION_URL = `https://${PRODUCTION_DOMAIN}`;
export const SITE_NAME = "Viral Thread Generator";
export const SITE_TITLE = "Viral Thread Generator | AI Creator Studio for Meta Threads";
export const SITE_DESCRIPTION =
  "Transform source links, news, and trending topics into high-performing, viral Meta Threads sequences in seconds with multi-agent AI.";

export const AUTHOR_NAME = "Agnivo Neogi";
export const AUTHOR_SITE = "https://agnivon.dev";

/**
 * Returns the canonical base URL for the current environment.
 * Evaluates NEXT_PUBLIC_APP_URL, Vercel system environment variables, or falls back to production domain.
 */
export function getSiteUrl(): string {
  // 1. Explicit app URL override (e.g. from environment variable)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  // 2. Vercel production deployment URL (automatically set on Vercel production)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/$/, "");
  }

  // 3. Vercel preview or branch deployment URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }

  // 4. Default fallback to linked production domain
  return PRODUCTION_URL;
}
