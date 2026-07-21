import type { Channel } from "./types";

/** Peak windows by channel (local audience time). Ranked best → good. */
export const CHANNEL_WINDOWS: Record<
  Channel,
  { start: number; end: number; label: string; score: number }[]
> = {
  telegram: [
    { start: 19, end: 21, label: "вечерний прайм — максимум открытий", score: 100 },
    { start: 12, end: 14, label: "обеденный скролл", score: 86 },
    { start: 9, end: 10, label: "утренний чек ленты", score: 72 },
    { start: 22, end: 23, label: "поздний досуг", score: 68 },
  ],
  vk: [
    { start: 18, end: 21, label: "после работы — пик ленты VK", score: 100 },
    { start: 12, end: 15, label: "дневная активность", score: 84 },
    { start: 9, end: 11, label: "утренний заход", score: 70 },
  ],
  instagram: [
    { start: 11, end: 13, label: "позднее утро — высокий reach", score: 100 },
    { start: 19, end: 21, label: "вечерний досуг", score: 92 },
    { start: 8, end: 9, label: "утро в сторис/ленте", score: 74 },
  ],
  threads: [
    { start: 8, end: 10, label: "утро — обсуждения", score: 100 },
    { start: 12, end: 14, label: "обед — короткие реакции", score: 88 },
    { start: 18, end: 20, label: "вечерний микроконтент", score: 80 },
  ],
  facebook: [
    { start: 13, end: 16, label: "день — пик ленты Page", score: 100 },
    { start: 19, end: 21, label: "вечерний досуг", score: 90 },
    { start: 9, end: 11, label: "утренний заход", score: 72 },
  ],
  x: [
    { start: 8, end: 10, label: "утро — новости и обсуждения", score: 100 },
    { start: 12, end: 14, label: "обеденный скролл", score: 88 },
    { start: 18, end: 21, label: "вечерний прайм", score: 92 },
  ],
};

/** Weekday multipliers: weekend leisure vs weekday commute patterns */
export const WEEKDAY_MULTIPLIER: Record<number, number> = {
  0: 0.92, // Sun
  1: 1.0, // Mon
  2: 1.05, // Tue — often strongest
  3: 1.05, // Wed
  4: 1.02, // Thu
  5: 0.98, // Fri
  6: 0.9, // Sat
};

export function pickMinute(channel: Channel, hour: number, seed = 0): number {
  const base = channel === "telegram" ? 12 : channel === "vk" ? 17 : 7;
  return ((base + hour * 3 + seed * 11) % 55) + 2;
}

export function formatHm(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
