/// <reference types="vite/client" />
import { expect, test } from "vitest";
import crons from "./crons";

test("crons - cron jobs configured correctly", () => {
  expect(crons).toBeDefined();
  expect(typeof crons.interval).toBe("function");
});
