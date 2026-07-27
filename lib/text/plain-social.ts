function normalizeUrl(url: string): string {
  const u = url.trim();
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

/** Убирает markdown и оборачивающие кавычки для TG/VK и ответов бота. */
export function plainSocialText(raw: string): string {
  let text = raw.trim();
  if (!text) return "";

  text = text.replace(/^["'«»„“]+|["'«»„“]+$/g, "").trim();

  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, url: string) => {
    const fullUrl = normalizeUrl(url);
    const labelText = label.trim();
    if (!fullUrl) return labelText;
    if (/^(сайт|site|link|тут|здесь|here|перейти)$/i.test(labelText)) {
      return fullUrl;
    }
    return `${labelText}: ${fullUrl}`;
  });

  text = text.replace(/\[([^\]]+)\]\[([^\]]+)\]/g, "$1");
  text = text.replace(/\[([^\]]+)\](?!\()/g, "$1");

  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/\*([^*\n]+)\*/g, "$1");
  text = text.replace(/_([^_\n]+)_/g, "$1");
  text = text.replace(/`([^`]+)`/g, "$1");

  return text.trim();
}
