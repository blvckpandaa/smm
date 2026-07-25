import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = "https://smm-agents.ru";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register"],
        disallow: ["/plan", "/connections", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
