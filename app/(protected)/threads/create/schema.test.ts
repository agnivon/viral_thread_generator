import { describe, it, expect } from "vitest";
import {
  createDefaultEntry,
  createThreadsFormSchema,
  threadEntrySchema,
} from "./schema";

describe("createDefaultEntry", () => {
  it("defaults checkboxes to false when creating a blank entry", () => {
    const entry = createDefaultEntry();
    expect(entry.manual_hook_selection).toBe(false);
    expect(entry.search_query_generation).toBe(false);
    expect(entry.agent).toBe("news");
    expect(entry.url).toBe("");
    expect(entry.topic).toBe("");
  });

  it("keeps checkboxes deselected by default on pre-seeding", () => {
    const preSeeded = createDefaultEntry({
      url: "https://example.com/article/123",
      topic: "Artificial Intelligence Breakthrough",
      description: "Discussion on new LLMs",
      guidance: "Focus on safety and performance",
      agent: "topic",
    });

    // Both checkboxes MUST be false by default on pre-seeding
    expect(preSeeded.manual_hook_selection).toBe(false);
    expect(preSeeded.search_query_generation).toBe(false);
    expect(preSeeded.agent).toBe("topic");
    expect(preSeeded.topic).toBe("Artificial Intelligence Breakthrough");
    expect(preSeeded.description).toBe("Discussion on new LLMs");
    expect(preSeeded.url).toBe("https://example.com/article/123");
  });
});

describe("threadEntrySchema validation", () => {
  it("validates news entry with valid URL", () => {
    const result = threadEntrySchema.safeParse({
      agent: "news",
      url: "https://news.ycombinator.com",
      manual_hook_selection: false,
      search_query_generation: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects news entry with empty URL", () => {
    const result = threadEntrySchema.safeParse({
      agent: "news",
      url: "   ",
      manual_hook_selection: false,
      search_query_generation: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Content URL is required");
    }
  });

  it("rejects news entry with invalid URL format", () => {
    const result = threadEntrySchema.safeParse({
      agent: "news",
      url: "not-a-valid-url",
      manual_hook_selection: false,
      search_query_generation: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("valid HTTP or HTTPS URL");
    }
  });

  it("validates topic entry with non-empty topic", () => {
    const result = threadEntrySchema.safeParse({
      agent: "topic",
      topic: "Quantum Computing",
      description: "Overview of qubits",
      manual_hook_selection: false,
      search_query_generation: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects topic entry with empty topic", () => {
    const result = threadEntrySchema.safeParse({
      agent: "topic",
      topic: "   ",
      manual_hook_selection: false,
      search_query_generation: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Topic is required");
    }
  });
});

describe("createThreadsFormSchema", () => {
  it("validates full form payload with multiple entries", () => {
    const result = createThreadsFormSchema.safeParse({
      entries: [
        {
          agent: "news",
          url: "https://bloomberg.com/news/article",
          manual_hook_selection: false,
          search_query_generation: false,
        },
        {
          agent: "topic",
          topic: "Space Exploration",
          manual_hook_selection: true,
          search_query_generation: false,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects form payload when entries array is empty", () => {
    const result = createThreadsFormSchema.safeParse({
      entries: [],
    });
    expect(result.success).toBe(false);
  });
});
