/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { CharacterValidatorTool } from "./tools";

test("CharacterValidatorTool - valid thread passes validation", async () => {
  const thread = [
    "Here is a fascinating breakdown of how modern compilers optimize code.",
    "First, abstract syntax trees parse raw text into clean structured nodes.",
    "Second, intermediate representations apply constant folding and dead code elimination.",
    "Finally, target instructions are scheduled for optimal CPU pipeline execution.",
    "Follow for more deep dives into systems engineering!"
  ];

  const rawResult = await CharacterValidatorTool.invoke({
    thread_draft: thread,
    check_line_breaks: true,
  });
  const result = JSON.parse(rawResult);

  expect(result.isValid).toBe(true);
  expect(result.errors.length).toBe(0);
});

test("CharacterValidatorTool - detects 9-post maximum limit breach", async () => {
  const longThread = Array.from({ length: 10 }, (_, i) => `Post content number ${i + 1}`);

  const rawResult = await CharacterValidatorTool.invoke({ thread_draft: longThread });
  const result = JSON.parse(rawResult);

  expect(result.isValid).toBe(false);
  expect(result.errors).toEqual(
    expect.arrayContaining([expect.stringContaining("Thread exceeds the 9-post maximum limit")])
  );
});

test("CharacterValidatorTool - detects hard ceiling (500 chars) and 280-char relief valve limit", async () => {
  const over280Post = "A".repeat(290);
  const over500Post = "B".repeat(505);

  const thread = [
    "Hook post",
    over280Post,
    over280Post,
    over280Post,
    over280Post, // 4th post over 280 -> relief valve breached
    over500Post, // over 500 -> hard ceiling breached
    "CTA post"
  ];

  const rawResult = await CharacterValidatorTool.invoke({ thread_draft: thread });
  const result = JSON.parse(rawResult);

  expect(result.isValid).toBe(false);
  expect(result.errors).toEqual(
    expect.arrayContaining([
      expect.stringContaining("Hard ceiling of 500 characters breached"),
      expect.stringContaining("Only 3 relief valve posts > 280 characters are allowed"),
    ])
  );
});

test("CharacterValidatorTool - allows body posts between 200 and 280 chars as standard posts", async () => {
  const post250Chars = "C".repeat(250);

  const thread = [
    "Hook post",
    post250Chars,
    post250Chars,
    post250Chars,
    post250Chars, // 4 posts with 250 chars <= 280 soft limit -> passes without relief valve breach
    "CTA post"
  ];

  const rawResult = await CharacterValidatorTool.invoke({ thread_draft: thread });
  const result = JSON.parse(rawResult);

  expect(result.isValid).toBe(true);
  expect(result.errors.length).toBe(0);
});

test("CharacterValidatorTool - detects line breaks limit (>4)", async () => {
  const multilinePost = "Line1\nLine2\nLine3\nLine4\nLine5\nLine6";

  const rawResult = await CharacterValidatorTool.invoke({
    thread_draft: ["Hook post", multilinePost, "CTA post"],
    check_line_breaks: true,
  });
  const result = JSON.parse(rawResult);

  expect(result.isValid).toBe(false);
  expect(result.errors).toEqual(
    expect.arrayContaining([expect.stringContaining("has 5 line breaks. Maximum allowed is 4 line breaks")])
  );
});

test("CharacterValidatorTool - detects banned engagement phrases and markdown formatting", async () => {
  const thread = [
    "Here is a thread 🧵 about AI development", // contains banned phrase "a thread 🧵"
    "This post has **bold text** and `code` inside.", // contains markdown bold & code
    "CTA: Check our website!"
  ];

  const rawResult = await CharacterValidatorTool.invoke({ thread_draft: thread });
  const result = JSON.parse(rawResult);

  expect(result.isValid).toBe(false);
  expect(result.errors).toEqual(
    expect.arrayContaining([
      expect.stringContaining('banned engagement phrase: "a thread 🧵"'),
      expect.stringContaining("contains invalid markdown formatting characters"),
    ])
  );
});

test("CharacterValidatorTool - detects forbidden URLs in body and forbidden placeholders in CTA", async () => {
  const thread = [
    "Hook post",
    "Body post with raw URL: https://example.com/article", // URL in body
    "CTA: Follow @developer for updates and click [Link]" // CTA with tag @developer & placeholder [Link]
  ];

  const rawResult = await CharacterValidatorTool.invoke({ thread_draft: thread });
  const result = JSON.parse(rawResult);

  expect(result.isValid).toBe(false);
  expect(result.errors).toEqual(
    expect.arrayContaining([
      expect.stringContaining("Hyperlinks are strictly forbidden in the Hook and Body posts"),
      expect.stringContaining("forbidden placeholders, tags, or account identifiers"),
    ])
  );
});
