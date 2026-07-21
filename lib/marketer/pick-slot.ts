import type { Channel, PostGoal, RubricId } from "./types";
import {
  CHANNEL_WINDOWS,
  WEEKDAY_MULTIPLIER,
  pickMinute,
} from "./posting-times";
import { weekdayIndexFromYmd } from "./timezone";

export type IdealSlotContext = {
  channel: Channel;
  ymd: string;
  goal: PostGoal;
  rubric: RubricId;
  format: "text" | "text_image" | "poll" | "carousel" | "short_video";
  /** Порядковый номер поста в плане — для ротации окон */
  postIndex: number;
  /** channel:ymd:hour — уже занято в этот день */
  takenOnDay: Set<string>;
  /** channel:hour — уже использовали на неделе (чтобы не ставить 19:00 каждый день) */
  takenWeekHours: Set<string>;
};

function goalHourBoost(goal: PostGoal, hour: number): number {
  switch (goal) {
    case "engagement":
      return hour >= 18 && hour <= 22 ? 1.2 : hour >= 12 && hour < 15 ? 1.08 : 1;
    case "community":
      return hour >= 19 && hour <= 21 ? 1.18 : hour >= 12 && hour < 14 ? 1.06 : 1;
    case "offer":
      return hour >= 18 && hour <= 21 ? 1.22 : 1;
    case "education":
      return hour >= 11 && hour < 15 ? 1.15 : hour >= 9 && hour < 11 ? 1.1 : 1;
    case "trust":
      return hour >= 10 && hour < 14 ? 1.12 : hour >= 18 ? 1.05 : 1;
    case "awareness":
      return hour >= 12 && hour < 16 ? 1.1 : hour >= 19 && hour < 22 ? 1.08 : 1;
    default:
      return 1;
  }
}

function rubricHourBoost(rubric: RubricId, hour: number): number {
  switch (rubric) {
    case "promo_factual":
    case "game_spotlight":
      return hour >= 18 ? 1.15 : 1;
    case "brand_atmosphere":
      return hour >= 19 || (hour >= 11 && hour < 13) ? 1.1 : 1;
    case "education":
    case "faq_support":
      return hour >= 10 && hour < 15 ? 1.12 : 1;
    case "community_hook":
    case "social_proof":
      return hour >= 18 ? 1.14 : 1;
    case "behind_scenes":
      return hour >= 17 && hour <= 21 ? 1.1 : 1;
    case "trend_react":
      return hour >= 8 && hour < 12 ? 1.12 : hour >= 18 ? 1.08 : 1;
    default:
      return 1;
  }
}

function weekdayHourBias(dow: number, hour: number): number {
  const weekend = dow === 0 || dow === 6;
  if (weekend && hour >= 10 && hour < 14) return 1.12;
  if (weekend && hour >= 18) return 1.08;
  if (!weekend && hour >= 7 && hour < 9) return 0.85;
  if (!weekend && dow === 1 && hour >= 12 && hour < 14) return 1.06;
  if (!weekend && (dow === 2 || dow === 3) && hour >= 18) return 1.05;
  return 1;
}

function goalReason(goal: PostGoal): string {
  switch (goal) {
    case "offer":
      return "оффер — вечерний прайм";
    case "education":
      return "обучение — дневное окно";
    case "engagement":
    case "community":
      return "вовлечение — пик активности";
    case "trust":
      return "доверие — спокойное время";
    case "awareness":
      return "охват — широкое окно";
    default:
      return "под цель поста";
  }
}

/** Маркетолог подбирает идеальное время: канал, цель, рубрика, день недели, без повторов */
export function pickIdealSlot(ctx: IdealSlotContext): {
  hour: number;
  minute: number;
  why: string;
  score: number;
} {
  const {
    channel,
    ymd,
    goal,
    rubric,
    format,
    postIndex,
    takenOnDay,
    takenWeekHours,
  } = ctx;
  const dow = weekdayIndexFromYmd(ymd);
  const windows = CHANNEL_WINDOWS[channel];
  const candidates: { hour: number; minute: number; why: string; score: number }[] =
    [];

  for (const w of windows) {
    for (let hour = w.start; hour < w.end; hour++) {
      const dayKey = `${channel}:${ymd}:${hour}`;
      const weekKey = `${channel}:${hour}`;
      if (takenOnDay.has(dayKey)) continue;

      let score = w.score * (WEEKDAY_MULTIPLIER[dow] ?? 1);
      score *= goalHourBoost(goal, hour);
      score *= rubricHourBoost(rubric, hour);
      score *= weekdayHourBias(dow, hour);

      if (format === "short_video" && hour >= 19) score *= 1.1;
      if (format === "poll" && hour >= 12 && hour < 17) score *= 1.08;
      if (format === "carousel" && hour >= 11 && hour < 14) score *= 1.06;

      if (takenWeekHours.has(weekKey)) score *= 0.32;

      const windowIndex = windows.findIndex(
        (win) => hour >= win.start && hour < win.end
      );
      score *= 1 + ((postIndex + Math.max(0, windowIndex)) % windows.length) * 0.04;
      score *= 1 + ((postIndex * 17 + hour * 7 + dow * 3) % 13) / 100;

      const minute = pickMinute(channel, hour, postIndex);
      candidates.push({ hour, minute, why: w.label, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  if (!candidates.length) {
    const hour = 12 + (postIndex % 8);
    return {
      hour,
      minute: pickMinute(channel, hour, postIndex),
      why: "резервный слот",
      score: 40,
    };
  }

  const topN = Math.min(4, candidates.length);
  const pool = candidates.slice(0, topN);
  const best = pool[postIndex % pool.length];

  takenOnDay.add(`${channel}:${ymd}:${best.hour}`);
  takenWeekHours.add(`${channel}:${best.hour}`);

  return {
    ...best,
    why: `${best.why} · ${goalReason(goal)}`,
  };
}

/** Собрать takenWeekHours из набора channel:day:hour */
export function weekHoursFromTaken(taken: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const key of taken) {
    const parts = key.split(":");
    if (parts.length >= 3) {
      out.add(`${parts[0]}:${parts[2]}`);
    }
  }
  return out;
}
