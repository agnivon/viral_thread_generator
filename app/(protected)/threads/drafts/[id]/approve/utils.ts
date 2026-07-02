export function getImageQualityInfo(url: string) {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname.toLowerCase();
    const search = parsedUrl.search.toLowerCase();
    
    // File type detection
    let type = "Image";
    if (pathname.endsWith(".png")) type = "PNG";
    else if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) type = "JPEG";
    else if (pathname.endsWith(".gif")) type = "GIF";
    else if (pathname.endsWith(".webp")) type = "WebP";
    else if (pathname.endsWith(".svg")) type = "SVG Vector";
    
    // Quality estimation heuristic
    let resolution = "Standard";
    let score: "High" | "Medium" | "Low" = "Medium";
    
    if (type === "SVG Vector") {
      resolution = "Scalable Vector Graphics (Lossless)";
      score = "High";
    } else if (
      pathname.includes("thumb") ||
      pathname.includes("preview") ||
      search.includes("thumb") ||
      /icon|avatar/i.test(pathname) ||
      /\b(w|h|width|height)[=_-]([1-9]\d|[1-2]\d\d)\b/i.test(url)
    ) {
      resolution = "Low Resolution (Thumbnail/Preview)";
      score = "Low";
    } else if (
      pathname.includes("large") ||
      pathname.includes("full") ||
      pathname.includes("original") ||
      search.includes("large") ||
      search.includes("full") ||
      search.includes("original") ||
      /\b(w|h|width|height)[=_-]([8-9]\d\d|1\d\d\d|2\d\d\d)\b/i.test(url) ||
      pathname.includes("1080") ||
      pathname.includes("2048") ||
      pathname.includes("4k")
    ) {
      resolution = "High Resolution (HD/Large)";
      score = "High";
    } else {
      resolution = "Standard Resolution";
      score = "Medium";
    }
    
    const host = parsedUrl.hostname;
    
    return {
      type,
      resolution,
      score,
      host
    };
  } catch (e) {
    return {
      type: "Image",
      resolution: "Unknown Resolution",
      score: "Unknown" as const,
      host: "External Domain"
    };
  }
}
