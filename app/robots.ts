import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = "https://smm-agents.ru";
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/login",
          "/register",
          "/guides/",
          "/favicon",
          "/favicon/",
          "/logo-512.png",
          "/logo-mark.png",
          "/icon-192.png",
          "/icon-512.png",
          "/favicon-48x48.png",
          "/favicon-96x96.png",
          "/og.png",
        ],
        disallow: ["/plan", "/admin", "/connections", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
