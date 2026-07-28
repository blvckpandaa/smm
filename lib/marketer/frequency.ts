import type { BrandBrief } from "./types";

const MIN_PER_DAY = 1;
const MAX_PER_DAY = 5;
const MIN_POSTS_PER_WEEK = 1;
const MAX_POSTS_PER_WEEK = 35;

export const ALL_WEEK_OFFSETS = [0, 1, 2, 3, 4, 5, 6] as const;

/** Дни недели плана: 0 = startDate, …, 6 = startDate + 6 дней. */
export function normalizePostingDays(days: number[] | undefined): number[] {
  const source = days?.length ? days : [...ALL_WEEK_OFFSETS];
  const set = new Set(
    source
      .map((d) => Math.round(d))
      .filter((d) => d >= 0 && d <= 6)
  );
  const result = [...set].sort((a, b) => a - b);
  return result.length ? result : [...ALL_WEEK_OFFSETS];
}

/** Нормализует postsPerDay / postsPerWeek / postingDays для плана и биллинга. */
export function resolvePostFrequency(
  brief: Pick<BrandBrief, "postsPerDay" | "postsPerWeek" | "postingDays">
): {
  postsPerDay: number;
  postsPerWeek: number;
  postingDays: number[];
} {
  const postingDays = normalizePostingDays(brief.postingDays);
  const maxForDays = postingDays.length * MAX_PER_DAY;

  let postsPerWeek: number;
  if (typeof brief.postsPerWeek === "number" && brief.postsPerWeek > 0) {
    postsPerWeek = Math.round(brief.postsPerWeek);
  } else if (typeof brief.postsPerDay === "number" && brief.postsPerDay > 0) {
    const legacyAllWeek =
      !brief.postingDays || brief.postingDays.length === ALL_WEEK_OFFSETS.length;
    postsPerWeek = legacyAllWeek
      ? Math.round(brief.postsPerDay) * 7
      : Math.round(brief.postsPerDay) * postingDays.length;
  } else {
    postsPerWeek = postingDays.length;
  }

  postsPerWeek = Math.min(
    maxForDays,
    Math.max(MIN_POSTS_PER_WEEK, postsPerWeek)
  );
  const postsPerDay = Math.min(
    MAX_PER_DAY,
    Math.max(MIN_PER_DAY, Math.ceil(postsPerWeek / postingDays.length))
  );

  return { postsPerDay, postsPerWeek, postingDays };
}

export { MIN_PER_DAY, MAX_PER_DAY, MIN_POSTS_PER_WEEK, MAX_POSTS_PER_WEEK };
