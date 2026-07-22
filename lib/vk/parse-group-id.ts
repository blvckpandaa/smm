/** Путь в VK к ключам сообщества. */
export const VK_API_PATH_RU =
  "Управление → Дополнительно → Работа с API";

export const VK_API_PATH_EN = "Manage → Additional → API";

/** Ссылка на вкладку «Ключи доступа» сообщества. */
export function vkCommunityApiUrl(groupId: string): string {
  const id = groupId.replace(/^-/, "").trim();
  if (/^\d+$/.test(id)) {
    return `https://vk.com/club${id}?act=tokens`;
  }
  return `https://vk.com/${encodeURIComponent(id)}?act=tokens`;
}

/** Достаёт access_token из сырого токена или URL вида ...#access_token=...&... */
export function parseVkAccessToken(input: string): string {
  const raw = input.trim();
  if (!raw) return "";

  const fromHash = raw.match(/[#?&]access_token=([^&]+)/i);
  if (fromHash?.[1]) {
    try {
      return decodeURIComponent(fromHash[1]);
    } catch {
      return fromHash[1];
    }
  }

  if (/^access_token=/i.test(raw)) {
    return raw.slice("access_token=".length).split("&")[0] || "";
  }

  return raw.split(/\s+/)[0] || "";
}

/**
 * Из ссылки / ID / короткого имени → идентификатор для VK API.
 * Примеры: 123, club123, vk.com/club123, vk.com/mybrand, @mybrand
 */
export function parseVkGroupId(input: string): string | null {
  let raw = input.trim();
  if (!raw) return null;

  raw = raw.replace(/^@/, "");

  try {
    if (/^https?:\/\//i.test(raw) || /^vk\.(com|ru)\//i.test(raw)) {
      const url = new URL(
        /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
      );
      raw = url.pathname.replace(/^\//, "").split("/")[0] || "";
    }
  } catch {
    /* keep raw */
  }

  raw = raw.split("?")[0].split("#")[0].trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) return raw;

  const negative = raw.match(/^-(\d+)$/);
  if (negative) return negative[1];

  const fromPrefix = raw.match(/^(?:club|public|event|group)(\d+)$/i);
  if (fromPrefix) return fromPrefix[1];

  // короткое имя сообщества: my_brand
  if (/^[a-zA-Z0-9._]+$/.test(raw)) return raw;

  return null;
}
