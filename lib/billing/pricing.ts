/** Цена одного поста для маркетолога (руб.) */
export const POST_PRICE_RUB = 50;

/** Переписать текст одного поста (руб.) */
export const REWRITE_TEXT_PRICE_RUB = 25;

/** Пересоздать фото поста (руб.). Первое фото в посте — бесплатно. */
export const REGENERATE_IMAGE_PRICE_RUB = 10;

/** Период активации бота комментариев (дней) */
export const BOT_PERIOD_DAYS = 30;

/**
 * Активация бота на период (руб.) — ниже рынка (~390–990 ₽/мес у конкурентов).
 */
export const BOT_VK_PERIOD_RUB = 290;
export const BOT_TG_PERIOD_RUB = 290;

/** FAQ-ответ в периоде бесплатно */
export const BOT_FAQ_REPLY_RUB = 0;

/** ИИ-ответ — копейки поверх периода (DeepSeek дёшев) */
export const BOT_AI_REPLY_RUB = 2;

export function costForPosts(count: number): number {
  const n = Math.max(0, Math.floor(count));
  return n * POST_PRICE_RUB;
}

export function botPeriodPrice(channel: "vk" | "telegram"): number {
  return channel === "vk" ? BOT_VK_PERIOD_RUB : BOT_TG_PERIOD_RUB;
}

export function botReplyPrice(mode: "faq" | "ai"): number {
  return mode === "ai" ? BOT_AI_REPLY_RUB : BOT_FAQ_REPLY_RUB;
}

export const TOPUP_PRESETS_RUB = [100, 300, 500, 1000, 2000] as const;

/** Бонус на баланс при регистрации */
export const NEW_USER_BONUS_RUB = 200;
