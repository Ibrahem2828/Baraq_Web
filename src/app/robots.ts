import type { MetadataRoute } from "next";

// Constant content: build it once. Required by the app's static export, and
// what the web did at runtime anyway.
export const dynamic = "force-static";

/**
 * The app is behind a login and has nothing for search engines; the public,
 * indexable face of Baraq is https://baraqapp.com. Without this file every
 * crawler got the 404 page for /robots.txt.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
