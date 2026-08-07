"use node";

import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const CharacterValidatorTool = tool(
  async ({ thread_draft, check_line_breaks }) => {
    const errors: string[] = [];
    let over200Count = 0;

    const banned_phrases = [
      "a thread 🧵", "read below", "let's dive in", "here is why",
      "save this tweet", "what do you think?", "let's discuss",
      "in today's fast-paced world", "have you ever wondered", "look no further",
      "in this post, we will explore", "key takeaway", "crucial step",
      "remember to", "let's look at", "here's the deal"
    ];

    // 5. Thread Length Validation (The 9-Post Rule)
    if (thread_draft.length > 9) {
      errors.push("Thread exceeds the 9-post maximum limit. Condense the body.");
    }

    thread_draft.forEach((post, index) => {
      let position = "Body";
      if (index === 0) position = "Hook";
      else if (index === thread_draft.length - 1) position = "CTA";

      // 1. Hook length validation removed per user request.
      // 2. Body Post Length & Relief Valve Validation
      if (index !== 0) {
        if (post.length > 200) {
          over200Count++;
        }
      }

      // Hard ceiling breached
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

      // 4. Exact-Match Banned Phrase Validation
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

    if (over200Count > 3) {
      errors.push(`Thread contains ${over200Count} posts over 200 characters (excluding the hook). Only 3 relief valve posts > 200 characters are allowed.`);
    }

    return JSON.stringify({
      isValid: errors.length === 0,
      errors
    });
  },
  {
    name: "character_validator",
    description: "Validates if any post exceeds 280 characters. Optionally checks for maximum of 4 line breaks.",
    schema: z.object({
      thread_draft: z.array(z.string()).describe("The list of thread posts to validate"),
      check_line_breaks: z.boolean().optional().default(false).describe("Whether to check if line breaks exceed 4 per post"),
    }),
  }
);
