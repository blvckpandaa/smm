import { deepseekChat, isDeepSeekConfigured } from "@/lib/ai/client";
import type { BrandBrief } from "@/lib/marketer/types";
import type { PostDraft } from "@/lib/smm/types";

/** Собрать промпт для картинки (DeepSeek или локальный шаблон). */
export async function buildImagePrompt(options: {
  brief: BrandBrief;
  draft: PostDraft;
}): Promise<string> {
  const { brief, draft } = options;
  const baseHint =
    draft.mediaHint?.trim() ||
    `Visual for social post about: ${draft.topic}. Brand: ${brief.brandName}, niche: ${brief.niche}.`;

  if (!isDeepSeekConfigured()) {
    return [
      "Professional social media photo, high quality, clean composition,",
      `brand mood for ${brief.brandName || "business"},`,
      brief.niche ? `niche ${brief.niche},` : "",
      baseHint,
      "no watermarks, no readable tiny text, no logos of other brands",
    ]
      .filter(Boolean)
      .join(" ");
  }

  try {
    const raw = await deepseekChat({
      temperature: 0.6,
      system: `Ты арт-директор. Пишешь один английский промпт для генерации фото к посту в соцсетях.
Правила: только текст промпта, без кавычек и пояснений; без логотипов чужих брендов; без мелкого читаемого текста на картинке; стиль реалистичный или мягкий editorial; учитывай бренд и тему.`,
      user: JSON.stringify({
        brand: brief.brandName,
        niche: brief.niche,
        tone: brief.toneOfVoice,
        topic: draft.topic,
        title: draft.title,
        bodyPreview: draft.body.slice(0, 400),
        mediaHint: draft.mediaHint,
        channel: draft.channel,
      }),
    });
    const prompt = raw.replace(/^["'\s]+|["'\s]+$/g, "").trim();
    return prompt.slice(0, 900) || baseHint;
  } catch {
    return baseHint;
  }
}

/** Сгенерировать изображение через Pollinations (опционально с ключом). */
export async function generateImageBytes(prompt: string): Promise<Buffer> {
  const encoded = encodeURIComponent(prompt.slice(0, 900));
  const params = new URLSearchParams({
    width: "1080",
    height: "1080",
    model: "flux",
    nologo: "true",
    enhance: "true",
    seed: String(Math.floor(Math.random() * 1_000_000)),
  });

  const url = `https://image.pollinations.ai/prompt/${encoded}?${params}`;
  const headers: Record<string, string> = {
    Accept: "image/*",
  };
  const key = process.env.POLLINATIONS_API_KEY?.trim();
  if (key) headers.Authorization = `Bearer ${key}`;

  const res = await fetch(url, { headers, redirect: "follow" });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(
      `Не удалось сгенерировать фото (${res.status}): ${err.slice(0, 200)}`
    );
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("image") && !contentType.includes("octet-stream")) {
    throw new Error("Сервис картинок вернул не изображение");
  }

  const ab = await res.arrayBuffer();
  if (ab.byteLength < 1000) {
    throw new Error("Пустой ответ от генератора изображений");
  }
  return Buffer.from(ab);
}
