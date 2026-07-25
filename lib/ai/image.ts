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

function pollinationsKey(): string | undefined {
  return process.env.POLLINATIONS_API_KEY?.trim() || undefined;
}

export function hasPollinationsKey(): boolean {
  return Boolean(pollinationsKey());
}

/** Без ключа Pollinations пускает только 1 запрос в очередь на IP — генерим строго по одному. */
let imageChain: Promise<unknown> = Promise.resolve();

function enqueueImageJob<T>(fn: () => Promise<T>): Promise<T> {
  const run = imageChain.then(fn, fn);
  imageChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function friendlyImageError(status: number, body: string): string {
  if (status === 429 || /queue full|too many requests|rate.?limit/i.test(body)) {
    if (!pollinationsKey()) {
      return "Сервис фото перегружен (лимит бесплатной очереди). Подождите 20–40 сек и нажмите снова — или добавьте POLLINATIONS_API_KEY с https://enter.pollinations.ai";
    }
    return "Сервис фото временно ограничил запросы. Подождите немного и попробуйте снова.";
  }
  if (status === 401 || status === 403) {
    return "Ключ Pollinations не принят. Проверьте POLLINATIONS_API_KEY на enter.pollinations.ai";
  }
  if (status === 402) {
    return "На ключе Pollinations закончился баланс (pollen). Пополните на enter.pollinations.ai";
  }
  return `Не удалось сгенерировать фото (${status}): ${body.slice(0, 160)}`;
}

async function fetchImageOnce(prompt: string): Promise<Buffer> {
  const encoded = encodeURIComponent(prompt.slice(0, 900));
  const key = pollinationsKey();
  const params = new URLSearchParams({
    width: "1080",
    height: "1080",
    model: "flux",
    nologo: "true",
    seed: String(Math.floor(Math.random() * 1_000_000)),
  });
  // enhance сильно грузит бесплатную очередь
  if (key) params.set("enhance", "true");

  const headers: Record<string, string> = { Accept: "image/*" };
  if (key) headers.Authorization = `Bearer ${key}`;

  // С ключом — gen.pollinations.ai; без — старый image.pollinations.ai
  const base = key
    ? `https://gen.pollinations.ai/image/${encoded}`
    : `https://image.pollinations.ai/prompt/${encoded}`;
  const url = `${base}?${params}`;

  const res = await fetch(url, {
    headers,
    redirect: "follow",
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(friendlyImageError(res.status, err));
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("image") && !contentType.includes("octet-stream")) {
    const err = await res.text().catch(() => "");
    if (/queue full|too many|429/i.test(err)) {
      throw new Error(friendlyImageError(429, err));
    }
    throw new Error("Сервис картинок вернул не изображение");
  }

  const ab = await res.arrayBuffer();
  if (ab.byteLength < 1000) {
    throw new Error("Пустой ответ от генератора изображений");
  }
  return Buffer.from(ab);
}

/** Сгенерировать изображение через Pollinations (очередь + ретраи на 429). */
export async function generateImageBytes(prompt: string): Promise<Buffer> {
  return enqueueImageJob(async () => {
    const delays = pollinationsKey()
      ? [0, 2000, 5000]
      : [0, 12_000, 25_000, 40_000];
    let lastError: Error | null = null;

    for (let i = 0; i < delays.length; i++) {
      if (delays[i] > 0) await sleep(delays[i]);
      try {
        return await fetchImageOnce(prompt);
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        const retryable =
          /перегружен|ограничил|429|queue full|too many/i.test(
            lastError.message
          );
        if (!retryable || i === delays.length - 1) throw lastError;
      }
    }

    throw lastError ?? new Error("Не удалось сгенерировать фото");
  });
}
