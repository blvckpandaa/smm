const hits = new Map<string, number[]>();

/** Простой лимит: maxN ответов за windowMs на ключ (projectId). */
export function allowBotReply(
  key: string,
  maxN = 20,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const prev = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (prev.length >= maxN) {
    hits.set(key, prev);
    return false;
  }
  prev.push(now);
  hits.set(key, prev);
  return true;
}
