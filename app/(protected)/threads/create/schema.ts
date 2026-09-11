import { z } from "zod";

export const threadEntrySchema = z
  .object({
    agent: z.enum(["news", "social_media", "topic"]),
    url: z.string().optional(),
    topic: z.string().optional(),
    description: z.string().optional(),
    guidance: z.string().optional(),
    manual_hook_selection: z.boolean().optional(),
    search_query_generation: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.agent === "topic") {
      if (!val.topic || val.topic.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Topic is required for Topic Expert.",
          path: ["topic"],
        });
      }
    } else {
      const trimmedUrl = (val.url || "").trim();
      if (trimmedUrl.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Content URL is required.",
          path: ["url"],
        });
      } else {
        try {
          const parsed = new URL(trimmedUrl);
          if (!parsed.protocol.startsWith("http")) {
            throw new Error("Invalid protocol");
          }
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please enter a valid HTTP or HTTPS URL.",
            path: ["url"],
          });
        }
      }
    }
  });

export const createThreadsFormSchema = z.object({
  entries: z.array(threadEntrySchema).min(1, "At least one thread entry is required"),
});

export type ThreadEntryFormData = z.infer<typeof threadEntrySchema>;
export type CreateThreadsFormData = z.infer<typeof createThreadsFormSchema>;

export interface DefaultEntryOptions {
  url?: string;
  topic?: string;
  description?: string;
  guidance?: string;
  agent?: "news" | "social_media" | "topic";
  manual_hook_selection?: boolean;
  search_query_generation?: boolean;
}

/**
 * Creates default form values for a thread entry card.
 * NOTE: Per product guidelines, checkboxes (manual_hook_selection and search_query_generation)
 * must default to false (deselected) even when pre-seeding from URLs or trend alerts.
 */
export function createDefaultEntry(options?: DefaultEntryOptions): ThreadEntryFormData {
  return {
    agent: options?.agent ?? "news",
    url: options?.url ?? "",
    topic: options?.topic ?? "",
    description: options?.description ?? "",
    guidance: options?.guidance ?? "",
    // Checkboxes are deselected by default on pre-seeding and blank entries
    manual_hook_selection: options?.manual_hook_selection ?? false,
    search_query_generation: options?.search_query_generation ?? false,
  };
}
