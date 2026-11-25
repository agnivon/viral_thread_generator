/**
 * Shared URL title and block-page detection helpers used by both Convex server actions
 * and client hooks. Must remain runtime-agnostic (zero Node or browser-only imports).
 */

const BLOCKED_TITLE_PATTERNS = [
  "access to this page has been denied",
  "access denied",
  "403 forbidden",
  "forbidden",
  "401 unauthorized",
  "just a moment",
  "attention required",
  "cloudflare",
  "security check",
  "robot or human",
  "are you a human",
  "verify you are human",
  "blocked",
  "shieldsquare",
  "perimeterx",
  "ddos-guard",
  "enable javascript and cookies",
  "enable cookies",
  "captcha",
  "page not found",
  "404 not found",
  "502 bad gateway",
  "503 service unavailable",
  "504 gateway timeout",
];

/**
 * Detects if an extracted page title indicates an access-denied/WAF block page
 * or is just a generic site domain instead of a real headline.
 */
export function isAccessDeniedOrGenericTitle(
  titleToCheck: string | undefined | null,
  targetUrl: string
): boolean {
  if (!titleToCheck) return true;
  const trimmed = titleToCheck.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();

  if (BLOCKED_TITLE_PATTERNS.some((pattern) => lower.includes(pattern))) {
    return true;
  }

  try {
    const normalized =
      targetUrl.startsWith("http://") || targetUrl.startsWith("https://")
        ? targetUrl
        : `https://${targetUrl}`;
    const parsed = new URL(normalized);
    const rawHost = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    const domainName = rawHost.split(".")[0];

    // Generic Reuters placeholders should defer to slug derivation
    if (rawHost === "reuters.com" || rawHost.endsWith(".reuters.com")) {
      if (
        lower === "reuters.com" ||
        lower === "reuters" ||
        lower.startsWith("reuters |") ||
        lower.includes("breaking international news")
      ) {
        return true;
      }
    }

    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0) {
      if (lower === rawHost || lower === domainName || lower === `${domainName}.com`) {
        return true;
      }
    }
  } catch {
    // Ignore URL parse errors
  }

  return false;
}
