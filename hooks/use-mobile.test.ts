/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { useIsMobile } from "./use-mobile";

test("useIsMobile - hook function definition", () => {
  expect(typeof useIsMobile).toBe("function");
});
