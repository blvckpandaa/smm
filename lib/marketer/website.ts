/** Нормализует ссылку: добавляет https:// если протокола нет */
export function normalizeWebsiteUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

export function isValidWebsiteUrl(raw: string): boolean {
  const v = normalizeWebsiteUrl(raw);
  if (!v) return true;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Подставляет ссылку в CTA, если она уместна */
export function ctaWithWebsite(baseCta: string, websiteUrl?: string): string {
  const url = normalizeWebsiteUrl(websiteUrl ?? "");
  if (!url) return baseCta;
  if (/сайт|site|link|перейти|узнать|подробн|visit|learn more/i.test(baseCta)) {
    return `${baseCta}: ${url}`;
  }
  return baseCta;
}
