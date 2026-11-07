"use node";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

let cachedFont: Buffer | null = null;

function resolveFontDirectory(): string | null {
  try {
    if (typeof __dirname !== "undefined") {
      return __dirname;
    }
  } catch {
    // Ignore error in environments where typeof __dirname throws
  }

  try {
    if (typeof import.meta !== "undefined" && import.meta.url) {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {
    // Ignore error
  }

  return null;
}

/**
 * Loads the bundled Inter TrueType font file for Satori rendering.
 * Caches in memory to ensure sub-millisecond subsequent renders.
 * In serverless environments where local font files are not on disk,
 * falls back to remote CDN font download.
 */
export async function getInfographicFont(): Promise<Buffer> {
  if (cachedFont) {
    return cachedFont;
  }

  const dir = resolveFontDirectory();
  const cwd = process.cwd();

  const possiblePaths: string[] = [
    path.join(cwd, "convex/lib/infographics/assets/fonts/Inter-Regular.ttf"),
    path.join(cwd, "assets/fonts/Inter-Regular.ttf"),
  ];

  if (dir) {
    possiblePaths.push(
      path.join(dir, "assets/fonts/Inter-Regular.ttf"),
      path.join(dir, "../infographics/assets/fonts/Inter-Regular.ttf")
    );
  }

  // System font fallbacks if running in standard Linux / container environment
  possiblePaths.push(
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
  );

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        cachedFont = fs.readFileSync(p);
        return cachedFont;
      }
    } catch {
      // Continue to next candidate
    }
  }

  // When running in serverless / cloud environments (like Convex Cloud) where local font files are not on disk,
  // fetch the font from trusted CDN and cache in memory for all subsequent renders.
  const remoteFontUrls = [
    "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf",
    "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf",
  ];

  for (const url of remoteFontUrls) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Convex-Serverless" } });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        cachedFont = Buffer.from(arrayBuf);
        return cachedFont;
      }
    } catch {
      // Continue to next remote URL
    }
  }

  throw new Error(
    "Could not locate font file for infographic rendering locally or remotely. Checked: " +
      possiblePaths.join(", ")
  );
}
