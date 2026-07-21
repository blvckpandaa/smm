import type { BrandBrief } from "./types";

const MIN_PER_DAY = 1;
const MAX_PER_DAY = 5;

/** Нормализует postsPerDay / postsPerWeek для плана и биллинга. */
export function resolvePostFrequency(brief: Pick<BrandBrief, "postsPerDay" | "postsPerWeek">): {
  postsPerDay: number;
  postsPerWeek: number;
} {
  let postsPerDay =
    typeof brief.postsPerDay === "number" && brief.postsPerDay > 0
      ? Math.round(brief.postsPerDay)
      : Math.round((brief.postsPerWeek || 7) / 7) || 1;

  postsPerDay = Math.min(MAX_PER_DAY, Math.max(MIN_PER_DAY, postsPerDay));
  const postsPerWeek = postsPerDay * 7;
  return { postsPerDay, postsPerWeek };
}

export { MIN_PER_DAY, MAX_PER_DAY };
