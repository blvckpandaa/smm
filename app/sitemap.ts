import type { MetadataRoute } from "next";

const base = "https://smm-agents.ru";

const guidePaths = [
  "/guides",
  "/guides/avtoposting-telegram-vk",
  "/guides/bot-kommentariev-vk",
  "/guides/ii-dlya-smm",
  "/guides/kontent-plan",
  "/guides/smm-bez-agentstva",
  "/guides/ne-uspevayu-vesti-socseti",
  "/guides/posts-dlya-kafe",
  "/guides/kontent-dlya-eksperta",
  "/guides/psiholog-v-socsetyah",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...guidePaths.map((path) => ({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: path === "/guides" ? 0.8 : 0.9,
    })),
    {
      url: `${base}/register`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
