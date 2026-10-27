import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import path from "path";

config({ path: ".env.local" });

// Fallback mock credentials for test execution when .env.local is absent (e.g. CI)
process.env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "mock-google-api-key";
process.env.GOOGLE_API_KEY2 = process.env.GOOGLE_API_KEY2 || "mock-google-api-key-2";
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "mock-openai-api-key";
process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "mock-deepseek-api-key";
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "mock-openrouter-api-key";


export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "edge-runtime",
  },
});
