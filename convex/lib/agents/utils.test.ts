/// <reference types="vite/client" />
import { expect, test, vi, afterEach } from "vitest";
import { invokeWithFallbacks, FallbackRunnable } from "./utils";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

test("invokeWithFallbacks - advances to fallback model when primary model times out", async () => {
  vi.useFakeTimers();

  const slowModel: FallbackRunnable = {
    invoke: vi.fn().mockImplementation((_input, config) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({ text: "slow response" }), 10000);
        config?.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new Error("AbortError"));
        });
      });
    }),
  };

  const fastFallbackModel: FallbackRunnable = {
    invoke: vi.fn().mockResolvedValue({ text: "fast fallback success" }),
  };

  const promise = invokeWithFallbacks(
    [slowModel, fastFallbackModel],
    { prompt: "hello" },
    { timeout: 2000 }
  );

  const assertion = expect(promise).resolves.toEqual({ text: "fast fallback success" });
  await vi.advanceTimersByTimeAsync(2000);
  await assertion;

  expect(slowModel.invoke).toHaveBeenCalledTimes(1);
  expect(fastFallbackModel.invoke).toHaveBeenCalledTimes(1);
});

test("invokeWithFallbacks - advances through multiple models when errors and timeouts occur", async () => {
  vi.useFakeTimers();

  const errorModel: FallbackRunnable = {
    invoke: vi.fn().mockRejectedValue(new Error("RateLimit 429")),
  };

  const timeoutModel: FallbackRunnable = {
    invoke: vi.fn().mockImplementation((_input, config) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({ text: "too late" }), 10000);
        config?.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new Error("AbortError"));
        });
      });
    }),
  };

  const successModel: FallbackRunnable = {
    invoke: vi.fn().mockResolvedValue({ text: "third model success" }),
  };

  const promise = invokeWithFallbacks(
    [errorModel, timeoutModel, successModel],
    { prompt: "hello" },
    { timeout: 1500 }
  );

  const assertion = expect(promise).resolves.toEqual({ text: "third model success" });
  await vi.advanceTimersByTimeAsync(1500);
  await assertion;

  expect(errorModel.invoke).toHaveBeenCalledTimes(1);
  expect(timeoutModel.invoke).toHaveBeenCalledTimes(1);
  expect(successModel.invoke).toHaveBeenCalledTimes(1);
});

test("invokeWithFallbacks - throws error when all models fail or time out", async () => {
  vi.useFakeTimers();

  const model1: FallbackRunnable = {
    invoke: vi.fn().mockRejectedValue(new Error("Model 1 500 Server Error")),
  };

  const model2: FallbackRunnable = {
    invoke: vi.fn().mockImplementation((_input, config) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({ text: "too late" }), 10000);
        config?.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new Error("AbortError"));
        });
      });
    }),
  };

  const promise = invokeWithFallbacks(
    [model1, model2],
    { prompt: "hello" },
    { timeout: 1000 }
  );

  const assertion = expect(promise).rejects.toThrow();
  await vi.advanceTimersByTimeAsync(1000);
  await assertion;

  expect(model1.invoke).toHaveBeenCalledTimes(1);
  expect(model2.invoke).toHaveBeenCalledTimes(1);
});

test("invokeWithFallbacks - stops immediately if parent signal is already aborted", async () => {
  const controller = new AbortController();
  controller.abort(new Error("User cancelled"));

  const model1: FallbackRunnable = {
    invoke: vi.fn().mockResolvedValue({ text: "never called" }),
  };

  await expect(
    invokeWithFallbacks([model1], { prompt: "hello" }, { signal: controller.signal })
  ).rejects.toThrow("User cancelled");

  expect(model1.invoke).not.toHaveBeenCalled();
});
