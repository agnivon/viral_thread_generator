import { useQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { linkPreviewKeys } from "@/lib/query-keys";

export interface UrlMetadata {
  title: string;
  description: string;
  image: string;
}

export interface UseUrlMetadataResult {
  title: string;
  subtitle: string;
  hostname: string;
  metadata: UrlMetadata | null;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Detects if a title indicates an access-denied/WAF block page or is just a generic site domain.
 */
export function isAccessDeniedOrGenericTitle(titleToCheck: string | undefined | null, targetUrl: string): boolean {
  if (!titleToCheck) return true;
  const trimmed = titleToCheck.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();

  const blockedPatterns = [
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

  if (blockedPatterns.some((pattern) => lower.includes(pattern))) {
    return true;
  }

  try {
    const parsed = new URL(targetUrl.startsWith("http://") || targetUrl.startsWith("https://") ? targetUrl : `https://${targetUrl}`);
    const rawHost = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    const domainName = rawHost.split(".")[0];

    // For Reuters links, generic titles like "reuters.com" or "Reuters" should be treated as generic
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

    // If title matches hostname or site domain when path slug is present
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0) {
      if (lower === rawHost || lower === domainName || lower === `${domainName}.com`) {
        return true;
      }
    }
  } catch {
    // ignore URL parse errors
  }

  return false;
}

/**
 * Synchronously extracts a clean, human-readable title and hostname fallback from a URL
 * while metadata is fetching or if external network retrieval fails.
 */
export function extractFallbackTitle(rawUrl: string): { title: string; hostname: string } {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { title: "Unknown Source", hostname: "" };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { title: "Unknown Source", hostname: "" };
  }

  try {
    const parsed = new URL(trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`);
    const rawHostname = parsed.hostname.replace(/^www\./i, "");

    // Extract path segments
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0) {
      // Find the last segment that is not purely an extension or number
      let selectedPart = pathParts[pathParts.length - 1];
      if (/^\d+$/.test(selectedPart) && pathParts.length > 1) {
        selectedPart = pathParts[pathParts.length - 2];
      }

      // Strip file extensions (.html, .php, etc.)
      let cleaned = decodeURIComponent(selectedPart).replace(/\.[^/.]+$/, "");
      // Strip trailing ISO dates (-2024-01-26, -2026-09-17)
      cleaned = cleaned.replace(/-\d{4}-\d{2}-\d{2}$/, "");
      // Strip trailing Reuters / AP article IDs (e.g. -idUSKBN..., -idUS...)
      cleaned = cleaned.replace(/-id[A-Za-z0-9]+$/i, "");
      // Replace hyphens, underscores, pluses with spaces
      cleaned = cleaned.replace(/[-_+]+/g, " ").trim();

      if (cleaned.length > 0) {
        const formatted = cleaned
          .split(/\s+/)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        return {
          title: formatted,
          hostname: rawHostname,
        };
      }
    }

    // If path has no meaningful segment, use capitalized domain name
    const domainParts = rawHostname.split(".");
    const mainDomain = domainParts.length > 1 ? domainParts[0] : rawHostname;
    const formattedDomain = mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);

    return {
      title: formattedDomain || rawHostname,
      hostname: rawHostname,
    };
  } catch {
    return {
      title: trimmed,
      hostname: trimmed,
    };
  }
}

/**
 * Custom hook to fetch and cache webpage metadata using TanStack Query.
 * Stored purely in memory on the client side with zero database writes.
 */
export function useUrlMetadata(url?: string | null): UseUrlMetadataResult {
  const fetchMetadata = useAction(api.actions.threads.getUrlMetadata);
  const normalizedUrl = url?.trim() || "";
  const isValidHttp = normalizedUrl.startsWith("http://") || normalizedUrl.startsWith("https://");

  const fallback = extractFallbackTitle(normalizedUrl);

  const { data: metadata, isLoading, isError } = useQuery<UrlMetadata | null>({
    queryKey: linkPreviewKeys.byUrl(normalizedUrl),
    queryFn: async (): Promise<UrlMetadata | null> => {
      if (!isValidHttp) return null;
      const result = await fetchMetadata({ url: normalizedUrl });
      return result ?? null;
    },
    enabled: isValidHttp,
    staleTime: 1000 * 60 * 30, // 30 minutes in-memory cache
    gcTime: 1000 * 60 * 60,    // 1 hour retention in client cache
  });

  const rawTitle = metadata?.title?.trim() || "";
  const isInvalid = isAccessDeniedOrGenericTitle(rawTitle, normalizedUrl);
  const displayTitle = !isInvalid && rawTitle ? rawTitle : fallback.title;

  return {
    title: displayTitle,
    subtitle: normalizedUrl,
    hostname: fallback.hostname,
    metadata: metadata ?? null,
    isLoading: isLoading && isValidHttp,
    isError,
  };
}
