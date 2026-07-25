import type { FaqItem } from "@/lib/bots/types";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): Set<string> {
  return new Set(
    normalize(text)
      .split(" ")
      .filter((w) => w.length >= 3)
  );
}

/** Вернуть лучший FAQ-ответ или null, если совпадение слабое. */
export function matchFaqAnswer(
  comment: string,
  faq: FaqItem[],
  minScore = 0.34
): string | null {
  const qNorm = normalize(comment);
  if (!qNorm || !faq.length) return null;

  const qTokens = tokens(comment);
  let best: { score: number; a: string } | null = null;

  for (const item of faq) {
    if (!item.q?.trim() || !item.a?.trim()) continue;
    const fq = normalize(item.q);
    if (!fq) continue;

    if (qNorm.includes(fq) || fq.includes(qNorm)) {
      return item.a.trim();
    }

    const fTokens = tokens(item.q);
    if (!fTokens.size || !qTokens.size) continue;
    let hit = 0;
    for (const t of fTokens) {
      if (qTokens.has(t)) hit += 1;
    }
    const score = hit / fTokens.size;
    if (!best || score > best.score) {
      best = { score, a: item.a.trim() };
    }
  }

  if (best && best.score >= minScore) return best.a;
  return null;
}
