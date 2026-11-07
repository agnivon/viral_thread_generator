import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/login",
          "/icon.svg",
          "/apple-icon",
          "/opengraph-image",
          "/twitter-image",
          "/manifest.webmanifest",
        ],
        disallow: [
          "/dashboard",
          "/dashboard/*",
          "/threads",
          "/threads/*",
          "/trends",
          "/trends/*",
          "/settings",
          "/settings/*",
          "/api/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
