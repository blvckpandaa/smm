import type { BrandBrief, Channel, ContentPlan, PlannedPost, PostGoal } from "./types.js";
import {
  CHANNEL_WINDOWS,
  WEEKDAY_MULTIPLIER,
  formatHm,
  pickMinute,
} from "./posting-times.js";
import { DEFAULT_GOAL_WEIGHTS, topicsForNiche, type TopicIdea } from "./topics.js";

const WEEKDAYS_RU = [
  "воскресенье",
  "понедельник",
  "вторник",
  "среда",
  "четверг",
  "пятница",
  "суббота",
];

function parseDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function localParts(dateYmd: string, hour: number, minute: number, timeZone: string) {
  // Build a UTC instant that corresponds to local wall time in timezone via iterative format
  // Simpler approach: use Intl to format candidates — for planner we store local + ISO approx
  const guess = new Date(`${dateYmd}T${formatHm(hour, minute)}:00`);
  // Adjust using timezone offset formatter
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  // Binary-ish search: start from UTC guess of local as if UTC, then fix offset
  let utc = Date.UTC(
    Number(dateYmd.slice(0, 4)),
    Number(dateYmd.slice(5, 7)) - 1,
    Number(dateYmd.slice(8, 10)),
    hour,
    minute,
    0
  );

  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(
      fmt.formatToParts(new Date(utc)).map((p) => [p.type, p.value])
    );
    const gotH = Number(parts.hour);
    const gotM = Number(parts.minute);
    const gotD = `${parts.year}-${parts.month}-${parts.day}`;
    const targetMin = hour * 60 + minute;
    const gotMin = gotH * 60 + gotM;
    let delta = targetMin - gotMin;
    if (gotD !== dateYmd) {
      // crossed day — coarse correction
      delta += gotD > dateYmd ? -24 * 60 : 24 * 60;
    }
    utc += delta * 60 * 1000;
  }

  void guess;
  return new Date(utc);
}

function countBy<T extends string>(items: T[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {});
}

function allocateGoals(total: number, preferred?: PostGoal[]): PostGoal[] {
  const weights = { ...DEFAULT_GOAL_WEIGHTS };
  if (preferred?.length) {
    for (const key of Object.keys(weights) as PostGoal[]) {
      if (!preferred.includes(key)) weights[key] = weights[key] * 0.25;
    }
  }
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  const raw = (Object.entries(weights) as [PostGoal, number][]).map(([g, w]) => ({
    g,
    n: (w / sum) * total,
  }));

  const floors = raw.map((r) => ({ g: r.g, n: Math.floor(r.n), frac: r.n - Math.floor(r.n) }));
  let used = floors.reduce((a, b) => a + b.n, 0);
  floors.sort((a, b) => b.frac - a.frac);
  let i = 0;
  while (used < total) {
    floors[i % floors.length].n += 1;
    used += 1;
    i += 1;
  }

  const bag: PostGoal[] = [];
  for (const f of floors) for (let k = 0; k < f.n; k++) bag.push(f.g);
  // Mild shuffle for variety across week
  for (let i2 = bag.length - 1; i2 > 0; i2--) {
    const j = (i2 * 7 + 3) % (i2 + 1);
    [bag[i2], bag[j]] = [bag[j], bag[i2]];
  }
  return bag;
}

function pickTopic(pool: TopicIdea[], goal: PostGoal, usedTopics: Set<string>): TopicIdea {
  const byGoal = pool.filter((t) => t.goal === goal && !usedTopics.has(t.topic));
  const fallback = pool.filter((t) => !usedTopics.has(t.topic));
  const list = byGoal.length ? byGoal : fallback.length ? fallback : pool;
  const idea = list[usedTopics.size % list.length];
  usedTopics.add(idea.topic);
  return idea;
}

function bestSlotForDay(
  channel: Channel,
  date: Date,
  takenHours: Set<string>,
  goal?: PostGoal
): { hour: number; minute: number; why: string; score: number } {
  const dow = date.getUTCDay();
  const windows = CHANNEL_WINDOWS[channel];
  let best: { hour: number; minute: number; why: string; score: number } | null = null;

  // Engagement/community → evening; education/trust → lunch+evening; offer → evening prime
  const preferEvening = goal === "engagement" || goal === "community" || goal === "offer";
  const preferLunch = goal === "education" || goal === "trust" || goal === "awareness";

  for (const w of windows) {
    for (let hour = w.start; hour < w.end; hour++) {
      const key = `${channel}:${toYmd(date)}:${hour}`;
      if (takenHours.has(key)) continue;
      const minute = pickMinute(channel, hour);
      let score = w.score * (WEEKDAY_MULTIPLIER[dow] ?? 1);
      const midBoost = hour === Math.floor((w.start + w.end - 1) / 2) ? 1.05 : 1;
      score *= midBoost;
      if (preferEvening && hour >= 18) score *= 1.12;
      if (preferLunch && hour >= 12 && hour < 15) score *= 1.1;
      if (takenHours.has(`${channel}:${toYmd(date)}:${hour - 1}`)) score *= 0.85;
      if (!best || score > best.score) {
        best = { hour, minute, why: w.label, score };
      }
    }
  }

  if (!best) {
    best = {
      hour: 19,
      minute: pickMinute(channel, 19),
      why: "fallback вечерний слот",
      score: 50,
    };
  }
  takenHours.add(`${channel}:${toYmd(date)}:${best.hour}`);
  return best;
}

function redistributeAcrossChannels(
  total: number,
  channels: Channel[]
): Channel[] {
  const result: Channel[] = [];
  for (let i = 0; i < total; i++) {
    result.push(channels[i % channels.length]);
  }
  return result;
}

function strategyNotes(brief: BrandBrief): string[] {
  const notes = [
    `Микс целей: не больше ~15–20% чистых офферов — иначе лента приедается.`,
    `Время считаем в ${brief.timezone} под пики каналов (TG вечер/обед, VK вечер/день).`,
    `Между постами в одном канале — минимум разные рубрики день ото дня.`,
    `CTA ротация: ${brief.ctaOptions.join(" / ")}.`,
  ];
  if (brief.niche.toLowerCase().includes("casino") || brief.niche.includes("казино")) {
    notes.push(
      "Казино: в каждом внешнем посте учитывать 18+ и ответственную игру; промо — только из facts."
    );
    notes.push(
      "Интерес аудитории держим пользой (разборы, FAQ, комьюнити), не только бонусами."
    );
  }
  return notes;
}

function postingRules(brief: BrandBrief): string[] {
  const rules = [
    "Не выдумывать факты, цены, бонусы, лицензии — нет данных → [уточнить].",
    "Один пост = одна мысль + один CTA.",
    "Хук в первых 1–2 строках; вода запрещена.",
    `Tone of Voice: ${brief.toneOfVoice.join(", ")}.`,
  ];
  for (const t of brief.taboos ?? []) rules.push(`Табу: ${t}`);
  if (brief.facts.age) rules.push(`Дисклеймер возраста: ${brief.facts.age}`);
  return rules;
}

/**
 * Marketing agent core: builds a 7-day multi-channel content plan
 * with topics, goals, formats and optimal local posting times.
 */
export function createWeeklyPlan(brief: BrandBrief): ContentPlan {
  const channels = brief.channels.length ? brief.channels : (["telegram"] as Channel[]);
  const total = Math.max(channels.length, brief.postsPerWeek);
  const start = parseDate(brief.startDate);
  const end = addDays(start, 6);

  const goals = allocateGoals(total, brief.goals);
  const channelBag = redistributeAcrossChannels(total, channels);
  const pool = topicsForNiche(brief.niche);
  const usedTopics = new Set<string>();
  const takenHours = new Set<string>();

  // Spread posts across 7 days as evenly as possible
  const dayIndexes: number[] = [];
  for (let i = 0; i < total; i++) dayIndexes.push(i % 7);
  dayIndexes.sort((a, b) => a - b);

  // Prefer heavier slots on Tue–Thu evenings for engagement posts
  const posts: PlannedPost[] = [];

  for (let i = 0; i < total; i++) {
    const dayOffset = dayIndexes[i];
    const date = addDays(start, dayOffset);
    const channel = channelBag[i];
    const goal = goals[i];
    const idea = pickTopic(pool, goal, usedTopics);
    const effectiveGoal = idea.goal;
    const slot = bestSlotForDay(channel, date, takenHours, effectiveGoal);
    const ymd = toYmd(date);
    const when = localParts(ymd, slot.hour, slot.minute, brief.timezone);
    const cta =
      effectiveGoal === "offer" || effectiveGoal === "awareness"
        ? brief.ctaOptions[i % brief.ctaOptions.length]
        : brief.ctaOptions.filter((c) => /коммент|голо|спроси|пишите/i.test(c))[0] ??
          brief.ctaOptions[i % brief.ctaOptions.length];

    const mustInclude = ["ценность для читателя с первых строк"];
    if (brief.facts.age) mustInclude.push(brief.facts.age);
    if (effectiveGoal === "offer") {
      mustInclude.push("только подтверждённые условия из facts");
    }

    posts.push({
      id: `post-${ymd}-${channel}-${String(i + 1).padStart(2, "0")}`,
      day: ymd,
      weekday: WEEKDAYS_RU[date.getUTCDay()],
      timeLocal: formatHm(slot.hour, slot.minute),
      scheduledAtIso: when.toISOString(),
      channel,
      rubric: idea.rubric,
      goal: effectiveGoal,
      topic: idea.topic,
      angle: idea.angle,
      hook: idea.hook,
      cta,
      whyThisTime: `${slot.why} (оценка слота ${Math.round(slot.score)})`,
      whyInteresting: idea.whyInteresting,
      format: idea.format,
      mustInclude,
      mustAvoid: brief.taboos ?? [],
    });
  }

  posts.sort((a, b) => a.scheduledAtIso.localeCompare(b.scheduledAtIso));

  return {
    brandName: brief.brandName,
    niche: brief.niche,
    timezone: brief.timezone,
    period: { from: toYmd(start), to: toYmd(end) },
    summary: {
      totalPosts: posts.length,
      byChannel: countBy(posts.map((p) => p.channel)),
      byGoal: countBy(posts.map((p) => p.goal)),
      byRubric: countBy(posts.map((p) => p.rubric)),
    },
    strategyNotes: strategyNotes(brief),
    postingRules: postingRules(brief),
    posts,
  };
}
