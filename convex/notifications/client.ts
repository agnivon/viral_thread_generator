import { v } from "convex/values";
import { components } from "../_generated/api";
import { defineNotifications } from "convex-notification";

export const notifications = defineNotifications(components.notification, {
  defaultListLimit: 50,
  batchChunkSize: 100,
  kinds: {
    thread_generation_success: v.object({
      threadId: v.string(),
      title: v.string(),
      body: v.optional(v.string()),
      href: v.optional(v.string()),
    }),
    thread_generation_failed: v.object({
      threadId: v.optional(v.string()),
      title: v.string(),
      body: v.string(),
      error: v.optional(v.string()),
    }),
    thread_publication_success: v.object({
      threadId: v.string(),
      title: v.string(),
      body: v.string(),
      postIds: v.optional(v.array(v.string())),
      href: v.optional(v.string()),
    }),
    thread_publication_failed: v.object({
      threadId: v.optional(v.string()),
      title: v.string(),
      body: v.string(),
      error: v.optional(v.string()),
    }),
  },
});
