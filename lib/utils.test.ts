/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { cn } from "./utils";

test("cn - merges class names and resolves tailwind conflicts", () => {
  expect(cn("px-2 py-1", "bg-red-500")).toBe("px-2 py-1 bg-red-500");
  expect(cn("px-2", "px-4")).toBe("px-4");
  expect(cn("text-red-500", false && "text-blue-500", "font-bold")).toBe("text-red-500 font-bold");
});
