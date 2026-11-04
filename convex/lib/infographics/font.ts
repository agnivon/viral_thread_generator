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
 */
export function getInfographicFont(): Buffer {
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

  throw new Error(
    "Could not locate font file for infographic rendering. Checked: " +
      possiblePaths.join(", ")
  );
}
