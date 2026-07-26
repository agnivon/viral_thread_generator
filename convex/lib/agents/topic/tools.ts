"use node";

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { tavily } from "@tavily/core";
import "dotenv/config";

import { JinaClient, JinaResponse, FormattedPageDto } from "../../jina/api.js";
import FirecrawlApp from "@mendable/firecrawl-js";

export const TavilySearchTool = tool(
  async ({ query }) => {
    try {
      const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
      const response = await client.search(query, {
        searchDepth: "advanced",
        includeAnswer: true,
      });

      return JSON.stringify({
        answer: response.answer,
        results: response.results.slice(0, 5)
      });
    } catch (e: any) {
      return JSON.stringify({ error: e.message || "Tavily search failed" });
    }
  },
  {
    name: "tavily_search",
    description: "Searches the web using Tavily to fetch LLM-optimized summaries and synthesize factual answers.",
    schema: z.object({
      query: z.string().describe("The search query to research"),
    }),
  }
);

import { search as ddgSearch, SafeSearchType } from "duck-duck-scrape";

export const DuckDuckGoSearchTool = tool(
  async ({ query }) => {
    try {
      const response = await ddgSearch(query, {
        safeSearch: SafeSearchType.MODERATE,
      });
      return JSON.stringify(response.results.slice(0, 5));
    } catch (e: any) {
      return JSON.stringify({ error: e.message || "DuckDuckGo search failed" });
    }
  },
  {
    name: "duckduckgo_search",
    description: "Executes DuckDuckGo Search to discover high-volume entity metadata and breaking references.",
    schema: z.object({
      query: z.string().describe("The search query for entity discovery"),
    }),
  }
);

export const JinaReaderTool = tool(
  async ({ url }) => {
    try {
      const jina = new JinaClient();
      const response = await jina.read(url, { respondWith: 'markdown' });

      let markdown = "";
      let title = "";

      if (typeof response === 'string') {
        markdown = response;
      } else if (response && typeof response === 'object') {
        const typedResponse = response as JinaResponse<FormattedPageDto | string>;
        const data = typedResponse.data;
        if (data) {
          if (typeof data === 'string') {
            markdown = data;
          } else {
            markdown = data.content || data.text || "";
            title = data.title || "";
          }
        }
      }

      const images = Array.from(markdown.matchAll(/!\[.*?\]\((.*?)\)/g)).map((m) => m[1]);

      return JSON.stringify({
        markdown,
        title,
        images,
      });
    } catch (e: any) {
      return JSON.stringify({ error: e.message || "Jina Reader extraction failed" });
    }
  },
  {
    name: "jina_reader",
    description: "Extracts clean markdown from a URL with a massive context budget.",
    schema: z.object({
      url: z.string().describe("The URL of the high-traffic source document to ingest"),
    }),
  }
);

export const FirecrawlScrapeTool = tool(
  async ({ url }) => {
    try {
      const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
      const response = await app.scrape(url, { formats: ["markdown", "images"] });

      if (!(response as any).success && (response as any).error) {
        throw new Error((response as any).error || "Firecrawl failed");
      }

      return JSON.stringify({
        markdown: response.markdown || "",
        metadata: response.metadata || {},
        images: response.images || [],
      });
    } catch (e: any) {
      return JSON.stringify({ error: e.message || "Firecrawl extraction failed" });
    }
  },
  {
    name: "firecrawl_scrape",
    description: "Scrapes dynamic protected pages requiring interactive JS rendering.",
    schema: z.object({
      url: z.string().describe("The URL to scrape"),
    }),
  }
);

export const TopicCharacterValidatorTool = tool(
  async ({ thread_draft, check_line_breaks }) => {
    const errors: string[] = [];

    const banned_phrases = [
      "a thread 🧵", "read below", "let's dive in", "here is why",
      "save this tweet", "what do you think?", "let's discuss"
    ];

    // Thread Length Validation (The 9-Post Rule)
    if (thread_draft.length > 9) {
      errors.push("Thread exceeds the 9-post maximum limit. Condense the body.");
    }

    thread_draft.forEach((post: string, index: number) => {
      let position = "Body";
      if (index === 0) position = "Hook";
      else if (index === thread_draft.length - 1) position = "CTA";

      // 500 Char Hard Ceiling
      if (post.length > 500) {
        errors.push(`Post ${index + 1} (${position}) is ${post.length} characters long. Hard ceiling of 500 characters breached.`);
      }

      if (check_line_breaks !== false) {
        const lineBreaks = (post.match(/\n/g) || []).length;
        if (lineBreaks > 4) {
          errors.push(`Post ${index + 1} (${position}) has ${lineBreaks} line breaks. Maximum allowed is 4 line breaks.`);
        }
      }

      // Complex markdown check for formatting (including any use of asterisks)
      const formattingRegex = /(\*|__|~~|`|#\s+|>+\s+|\[.*\]\(.*\))/g;
      const foundFormatting = post.match(formattingRegex);
      if (foundFormatting) {
        errors.push(`Post ${index + 1} (${position}) contains invalid markdown formatting characters (${foundFormatting.join(", ")}). Remove all markdown formatting (bold, italic, headers, code blocks, etc).`);
      }

      // Exact-Match Banned Phrase Validation
      const postLower = post.toLowerCase();
      for (const phrase of banned_phrases) {
        if (postLower.includes(phrase)) {
          errors.push(`Post ${index + 1} (${position}) contains banned engagement phrase: "${phrase}".`);
        }
      }

      // Check for raw hyperlinks (URLs)
      const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
      const foundUrls = post.match(urlRegex);
      if (foundUrls && position !== "CTA") {
        errors.push(`Post ${index + 1} (${position}) contains a hyperlink (${foundUrls.join(", ")}). Hyperlinks are strictly forbidden in the Hook and Body posts. Remove all URLs.`);
      }

      // Check for placeholders, account names, identifiers, or tags in the CTA
      if (position === "CTA") {
        const placeholderRegex = /(\[.*?\]|<.*?>|@[a-zA-Z0-9_]+)/g;
        const foundPlaceholders = post.match(placeholderRegex);
        if (foundPlaceholders) {
          errors.push(`Post ${index + 1} (CTA) contains forbidden placeholders, tags, or account identifiers (${foundPlaceholders.join(", ")}). Remove all placeholders like [Link] or @account from the CTA.`);
        }
      }
    });

    return JSON.stringify({
      isValid: errors.length === 0,
      errors
    });
  },
  {
    name: "topic_character_validator",
    description: "Validates thread hard ceilings (500 chars), max 9 posts, and banned formatting. Ignores soft pacing limits.",
    schema: z.object({
      thread_draft: z.array(z.string()).describe("The list of thread posts to validate"),
      check_line_breaks: z.boolean().optional().default(false).describe("Whether to check if line breaks exceed 4 per post"),
    }),
  }
);
