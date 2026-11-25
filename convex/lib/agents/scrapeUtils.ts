import { isAccessDeniedOrGenericTitle } from "../urlMetadata.js";

const BLOCK_OR_CHALLENGE_PHRASES = [
  "enable javascript",
  "javascript is disabled",
  "checking your browser",
  "just a moment",
  "attention required! | cloudflare",
  "access to this page has been denied",
  "verify you are human",
  "robot or human",
  "please enable cookies",
  "no content found.",
];

const FEED_HEADING_REGEX =
  /^#{1,6}\s*(?:top stories|trending(?:\s+now)?|recommended(?:\s+(?:stories|videos|for you))?|related(?:\s+(?:articles|stories|news))?|more\s+(?:from\b|stories|news)|latest\s+news|popular(?:\s+stories)?|read\s+next|up\s+next|most\s+read)\b[:\s]*$/i;

const NAV_CHROME_LINE_REGEX =
  /^(?:advertisement|sponsored|promoted|skip to (?:main )?content|return to homepage|\[return to homepage\]\([^)]+\)|\[skip to [^\]]+\]\([^)]+\)|follow us|share this article|sign up for our newsletter|subscribe now|now playing|up next)$/i;

const VIDEO_PROMO_LINE_REGEX = /^\[?video\s+\d+\]?(?:\s*[:-].*)?$/i;

/**
 * Extracts image URLs referenced inside Markdown image syntax `![alt](url)`.
 */
export function extractMarkdownImages(markdown: string): string[] {
  if (!markdown) return [];
  return Array.from(markdown.matchAll(/!\[.*?\]\((.*?)\)/g))
    .map((m) => m[1]?.trim())
    .filter((u): u is string => Boolean(u));
}

/**
 * Normalizes Jina Reader responses (`string` or `{ data: string | { content, text, title } }`).
 */
export function extractJinaContent(jinaResult: unknown): { markdown: string; title: string } {
  let markdown = "";
  let title = "";

  if (typeof jinaResult === "string") {
    markdown = jinaResult;
  } else if (jinaResult && typeof jinaResult === "object") {
    const data = (jinaResult as { data?: unknown }).data;
    if (typeof data === "string") {
      markdown = data;
    } else if (data && typeof data === "object") {
      const dto = data as { content?: unknown; text?: unknown; title?: unknown };
      if (typeof dto.content === "string") markdown = dto.content;
      else if (typeof dto.text === "string") markdown = dto.text;
      if (typeof dto.title === "string") title = dto.title;
    }
  }

  return { markdown: markdown.trim(), title: title.trim() };
}

/**
 * Detects soft block pages, JS-challenge interstitials, or empty/unusable scrapes
 * so callers can trigger secondary reader fallbacks cleanly.
 */
export function isBlockedOrThinScrape(
  markdown: string | undefined | null,
  title: string | undefined | null,
  targetUrl: string
): boolean {
  const text = (markdown || "").trim();
  if (!text || text.length < 150) {
    return true;
  }

  const lower = text.toLowerCase();
  if (lower === "no content found.") {
    return true;
  }

  if (text.length < 2500 && BLOCK_OR_CHALLENGE_PHRASES.some((phrase) => lower.includes(phrase))) {
    return true;
  }

  if (title && isAccessDeniedOrGenericTitle(title, targetUrl) && text.length < 1500) {
    return true;
  }

  return false;
}

function isLinkDenseFeedBlock(lines: string[]): boolean {
  const nonEmpty = lines.map((l) => l.trim()).filter(Boolean);
  if (nonEmpty.length === 0) return true;
  const linkOrShortBulletLines = nonEmpty.filter((line) => {
    const isMarkdownLinkBullet = /^(?:[-*•]\s*)?\[[^\]]+\]\(https?:\/\/[^)]+\)/.test(line);
    const containsUrl = /https?:\/\/[^\s)]+/.test(line);
    return isMarkdownLinkBullet || (containsUrl && line.length < 180) || VIDEO_PROMO_LINE_REGEX.test(line);
  });
  return linkOrShortBulletLines.length / nonEmpty.length >= 0.5;
}

/**
 * Strips aggregator/portal chrome (ad labels, "Return to Homepage", video playlists,
 * and link-dense "Top Stories" / "Trending" / "Related Articles" blocks) while preserving
 * the primary article body intact.
 */
export function sanitizeScrapedMarkdown(markdown: string): string {
  if (!markdown) return "";

  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const sections: Array<{ heading: string | null; bodyLines: string[] }> = [];
  let current: { heading: string | null; bodyLines: string[] } = { heading: null, bodyLines: [] };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (NAV_CHROME_LINE_REGEX.test(trimmed) || VIDEO_PROMO_LINE_REGEX.test(trimmed)) {
      continue;
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      if (current.heading !== null || current.bodyLines.length > 0) {
        sections.push(current);
      }
      current = { heading: trimmed, bodyLines: [] };
      continue;
    }

    current.bodyLines.push(rawLine);
  }
  if (current.heading !== null || current.bodyLines.length > 0) {
    sections.push(current);
  }

  const keptSections: string[] = [];
  for (const section of sections) {
    if (section.heading && FEED_HEADING_REGEX.test(section.heading) && isLinkDenseFeedBlock(section.bodyLines)) {
      continue;
    }
    const bodyText = section.bodyLines.join("\n").trim();
    if (section.heading && !bodyText) {
      if (FEED_HEADING_REGEX.test(section.heading)) continue;
      keptSections.push(section.heading);
      continue;
    }
    if (section.heading && bodyText) {
      keptSections.push(`${section.heading}\n\n${bodyText}`);
    } else if (bodyText) {
      keptSections.push(bodyText);
    }
  }

  const sanitized = keptSections
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return sanitized || markdown.trim();
}

export interface ParsedScraperToolPayload {
  markdown: string;
  images: string[];
  title: string;
  description: string;
}

/**
 * Unpacks WebScraperTool / YoutubeScraperTool output (JSON payload or raw string fallback).
 */
export function parseScraperToolResult(scraperResultStr: string): ParsedScraperToolPayload {
  try {
    const parsed = JSON.parse(scraperResultStr) as {
      markdown?: unknown;
      images?: unknown;
      title?: unknown;
      description?: unknown;
    };
    return {
      markdown: typeof parsed.markdown === "string" ? parsed.markdown : scraperResultStr,
      images: Array.isArray(parsed.images)
        ? parsed.images.filter((img): img is string => typeof img === "string" && img.length > 0)
        : [],
      title: typeof parsed.title === "string" ? parsed.title.trim() : "",
      description: typeof parsed.description === "string" ? parsed.description.trim() : "",
    };
  } catch {
    return {
      markdown: scraperResultStr,
      images: [],
      title: "",
      description: "",
    };
  }
}

/**
 * Builds an anchored user prompt for Scraper LLM nodes so they focus strictly on
 * <TARGET_URL> / <ARTICLE_TITLE> and ignore sidebar/aggregator link feeds.
 */
export function formatScraperUserPrompt(params: {
  url: string;
  title?: string;
  description?: string;
  markdown: string;
}): string {
  const sections: string[] = [`<TARGET_URL>\n${params.url}\n</TARGET_URL>`];
  if (params.title) {
    sections.push(`<ARTICLE_TITLE>\n${params.title}\n</ARTICLE_TITLE>`);
  }
  if (params.description) {
    sections.push(`<ARTICLE_DESCRIPTION>\n${params.description}\n</ARTICLE_DESCRIPTION>`);
  }
  sections.push(`<SCRAPED_MARKDOWN>\n${params.markdown}\n</SCRAPED_MARKDOWN>`);
  return sections.join("\n\n");
}

export const JINA_REMOVE_SELECTORS = [
  "nav",
  "footer",
  "aside",
  "[role='banner']",
  "[role='navigation']",
  "[class*='sidebar']",
  "[class*='newsletter']",
  "[class*='related']",
];

export const JINA_READER_OPTIONS = {
  respondWith: "markdown" as const,
  removeOverlay: true,
  timeout: 25,
  removeSelector: JINA_REMOVE_SELECTORS,
};

export const FIRECRAWL_EXCLUDE_TAGS = ["nav", "footer", "aside", "form"];
