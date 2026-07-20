import { deepseekChat, isDeepSeekConfigured } from "@/lib/ai/client";
import type { BrandBrief } from "@/lib/marketer/types";
import type { PostDraft } from "@/lib/smm/types";

export async function buildVideoPrompt(options: {
  brief: BrandBrief;
  draft: PostDraft;
}): Promise<string> {
  const { brief, draft } = options;
  const base =
    draft.mediaHint?.trim() ||
    `Short social video about: ${draft.topic}. Brand ${brief.brandName}.`;

  if (!isDeepSeekConfigured()) {
    return [
      "Cinematic short vertical social video, smooth motion, 4 seconds,",
      base,
      "no watermarks, no tiny unreadable text",
    ].join(" ");
  }

  try {
    const raw = await deepseekChat({
      temperature: 0.6,
      system: `Ты режиссёр коротких роликов для соцсетей. Пишешь один английский промпт для AI-видео (3–6 секунд).
Только текст промпта, без кавычек. Без логотипов чужих брендов, без мелкого текста.`,
      user: JSON.stringify({
        brand: brief.brandName,
        niche: brief.niche,
        topic: draft.topic,
        title: draft.title,
        bodyPreview: draft.body.slice(0, 300),
        channel: draft.channel,
      }),
    });
    return raw.replace(/^["'\s]+|["'\s]+$/g, "").trim().slice(0, 700) || base;
  } catch {
    return base;
  }
}

function pollinationsKey(): string | undefined {
  return process.env.POLLINATIONS_API_KEY?.trim() || undefined;
}

async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const json = JSON.parse(text) as {
      error?: { message?: string } | string;
      message?: string;
    };
    if (typeof json.error === "string") return json.error;
    if (json.error?.message) return json.error.message;
    if (json.message) return json.message;
  } catch {
    /* plain text */
  }
  return text.slice(0, 240) || `HTTP ${res.status}`;
}

/**
 * Генерация короткого видео через Pollinations.
 * Нужен POLLINATIONS_API_KEY (https://enter.pollinations.ai).
 * Документация: GET https://gen.pollinations.ai/video/{prompt}
 */
export async function generateVideoBytes(prompt: string): Promise<Buffer> {
  const key = pollinationsKey();
  if (!key) {
    throw new Error(
      "Для видео нужен POLLINATIONS_API_KEY в .env (получить на enter.pollinations.ai). Без ключа API возвращает 401."
    );
  }

  const encoded = encodeURIComponent(prompt.slice(0, 700));
  const models = ["wan-fast", "wan", "veo"] as const;
  const headers: Record<string, string> = {
    Accept: "video/*,application/octet-stream,*/*",
    Authorization: `Bearer ${key}`,
  };

  let lastError = "Не удалось сгенерировать видео";

  for (const model of models) {
    const params = new URLSearchParams({
      model,
      duration: "4",
      aspectRatio: "9:16",
      audio: "false",
      seed: String(Math.floor(Math.random() * 1_000_000)),
    });
    const url = `https://gen.pollinations.ai/video/${encoded}?${params}`;

    const res = await fetch(url, {
      headers,
      redirect: "follow",
      // видео может генерироваться долго
      signal: AbortSignal.timeout(300_000),
    }).catch((e: unknown) => {
      lastError =
        e instanceof Error ? e.message : "Таймаут или сеть при генерации видео";
      return null;
    });

    if (!res) continue;

    if (!res.ok) {
      lastError = await readErrorMessage(res);
      if (res.status === 401 || res.status === 403) {
        throw new Error(
          `Pollinations отклонил ключ (${res.status}): ${lastError}`
        );
      }
      continue;
    }

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const ab = await res.arrayBuffer();

    if (ab.byteLength < 10_000) {
      const peek = Buffer.from(ab).toString("utf8").slice(0, 240);
      lastError = peek.startsWith("{")
        ? `Короткий ответ API: ${peek}`
        : `Пустой ответ от генератора видео (${ab.byteLength} байт, ${contentType || "без типа"})`;
      continue;
    }

    if (contentType.includes("json") || contentType.includes("text/html")) {
      lastError = Buffer.from(ab).toString("utf8").slice(0, 240);
      continue;
    }

    if (contentType.includes("image") && !contentType.includes("video")) {
      lastError = `Модель ${model} вернула картинку вместо видео`;
      continue;
    }

    return Buffer.from(ab);
  }

  throw new Error(lastError);
}
