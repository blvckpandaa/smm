import type { Channel } from "@/lib/marketer/types";

/**
 * Нужно ли фото для поста.
 * Instagram — всегда (фото + текст в описании).
 * Threads — никогда (только текст).
 * X — по формату (можно фото/видео, не обязательно).
 * Остальные — по формату плана.
 */
export function draftNeedsPhoto(options: {
  channel: Channel | string;
  format?: string;
  needsPhoto?: boolean;
}): boolean {
  if (options.channel === "instagram") return true;
  if (options.channel === "threads") return false;
  if (typeof options.needsPhoto === "boolean") return options.needsPhoto;
  return formatNeedsPhoto(options.format);
}

export function draftNeedsVideo(options: {
  channel: Channel | string;
  format?: string;
  needsVideo?: boolean;
}): boolean {
  if (options.channel === "threads" || options.channel === "instagram") {
    return false;
  }
  if (typeof options.needsVideo === "boolean") return options.needsVideo;
  return options.format === "short_video";
}

/** Маркетолог: визуальные форматы (кроме Threads). */
export function formatNeedsPhoto(format: string | undefined): boolean {
  return format === "text_image" || format === "carousel";
}
