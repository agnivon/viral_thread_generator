/// <reference types="vite/client" />
"use node";
import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import { checkpointSaver } from "./lib/agents/news/graph";

const modules = import.meta.glob("./**/*.ts");

test("setupActions - setupCheckpointer runs setup without error", async () => {
  const t = convexTest(schema, modules);
  const spySetup = vi.spyOn(checkpointSaver, "setup").mockResolvedValue();

  await t.action(internal.actions.setupActions.setupCheckpointer, {});

  expect(spySetup).toHaveBeenCalled();
});
