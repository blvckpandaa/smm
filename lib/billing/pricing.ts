/** Цена одного поста для маркетолога (руб.) */
export const POST_PRICE_RUB = 50;

export function costForPosts(count: number): number {
  const n = Math.max(0, Math.floor(count));
  return n * POST_PRICE_RUB;
}

export const TOPUP_PRESETS_RUB = [100, 300, 500, 1000, 2000] as const;
