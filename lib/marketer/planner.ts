import type { BrandBrief, Channel, ContentPlan, PlannedPost, PostGoal } from "./types";
import { resolvePostFrequency } from "./frequency";
import { ctaWithWebsite, normalizeWebsiteUrl } from "./website";
import { formatHm } from "./posting-times";
import { DEFAULT_GOAL_WEIGHTS, topicsForNiche, type TopicIdea } from "./topics";
import { pickIdealSlot } from "./pick-slot";
import {
  addCalendarDays,
  fromZonedTime,
  isValidTimeZone,
  weekdayIndexFromYmd,
} from "./timezone";

export type { TopicIdea };

const WEEKDAYS_RU = [
  "воскресенье",
  "понедельник",
  "вторник",
  "среда",
  "четверг",
  "пятница",
  "суббота",
];

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

function redistributeAcrossChannels(total: number, channels: Channel[]): Channel[] {
  const result: Channel[] = [];
  for (let i = 0; i < total; i++) result.push(channels[i % channels.length]);
  return result;
}

function strategyNotes(brief: BrandBrief, extra: string[] = []): string[] {
  return [
    `Микс целей: не больше ~15–20% чистых офферов — иначе лента приедается.`,
    `Время в таймзоне ${brief.timezone}: маркетолог сам выбирает пиковые окна канала (утро / обед / вечер).`,
    `Если слот не подходит — дату и час можно поменять в плане или в текстах.`,
    `Между постами в одном канале — разные окна дня.`,
    `CTA ротация: ${brief.ctaOptions.join(" / ")}.`,
    ...(brief.websiteUrl?.trim()
      ? [`Сайт/проект: ${normalizeWebsiteUrl(brief.websiteUrl)} — вставлять в офферные посты и CTA.`]
      : []),
    `Ниша «${brief.niche}»: темы под аудиторию — ${brief.audience.who}.`,
    ...extra,
  ];
}

function postingRules(brief: BrandBrief): string[] {
  const rules = [
    "Не выдумывать факты, цены, акции — нет данных → [уточнить].",
    "Один пост = одна мысль + один CTA.",
    "Хук в первых 1–2 строках; вода запрещена.",
    `Tone of Voice: ${brief.toneOfVoice.join(", ")}.`,
  ];
  for (const t of brief.taboos ?? []) rules.push(`Табу: ${t}`);
  if (brief.facts.age) rules.push(`Дисклеймер возраста: ${brief.facts.age}`);
  if (brief.websiteUrl?.trim()) {
    rules.push(
      `Ссылка на сайт/проект: ${normalizeWebsiteUrl(brief.websiteUrl)} — вставлять в CTA и тексты, где уместно (не в каждой строке).`
    );
  }
  return rules;
}

function buildPlanFromIdeas(
  brief: BrandBrief,
  ideas: TopicIdea[],
  extraNotes: string[] = []
): ContentPlan {
  const tz = isValidTimeZone(brief.timezone) ? brief.timezone : "Europe/Moscow";
  const channels = brief.channels.length ? brief.channels : (["telegram"] as Channel[]);
  const { postsPerDay, postsPerWeek } = resolvePostFrequency(brief);
  const total = Math.max(channels.length, postsPerWeek, ideas.length);
  const startYmd = brief.startDate;
  const endYmd = addCalendarDays(startYmd, 6);

  const goals = allocateGoals(total, brief.goals);
  const channelBag = redistributeAcrossChannels(total, channels);
  const takenOnDay = new Set<string>();
  const takenWeekHours = new Set<string>();

  // Ровно postsPerDay постов на каждый из 7 дней
  const dayIndexes: number[] = [];
  for (let d = 0; d < 7; d++) {
    for (let p = 0; p < postsPerDay; p++) {
      dayIndexes.push(d);
    }
  }
  while (dayIndexes.length < total) {
    dayIndexes.push(dayIndexes.length % 7);
  }

  // Count posts per day+channel for diversification index
  const dayChannelCount = new Map<string, number>();

  const posts: PlannedPost[] = [];

  for (let i = 0; i < total; i++) {
    const dayOffset = dayIndexes[i];
    const ymd = addCalendarDays(startYmd, dayOffset);
    const channel = channelBag[i];
    const idea = ideas[i % ideas.length];
    const effectiveGoal = idea.goal || goals[i];

    const dcKey = `${channel}:${ymd}`;
    const slotIndex = dayChannelCount.get(dcKey) ?? 0;
    dayChannelCount.set(dcKey, slotIndex + 1);

    // Instagram — всегда с фото; Threads — только текст
    let format = idea.format;
    if (channel === "instagram") {
      format = format === "carousel" ? "carousel" : "text_image";
    } else if (channel === "threads") {
      format = "text";
    }

    const slot = pickIdealSlot({
      channel,
      ymd,
      goal: effectiveGoal,
      rubric: idea.rubric,
      format,
      postIndex: i + slotIndex,
      takenOnDay,
      takenWeekHours,
    });
    const when = fromZonedTime(ymd, slot.hour, slot.minute, tz);
    const weekday = WEEKDAYS_RU[weekdayIndexFromYmd(ymd)];

    const cta = ctaWithWebsite(
      effectiveGoal === "offer" || effectiveGoal === "awareness"
        ? brief.ctaOptions[i % brief.ctaOptions.length]
        : brief.ctaOptions.filter((c) => /коммент|голо|спроси|пишите/i.test(c))[0] ??
            brief.ctaOptions[i % brief.ctaOptions.length],
      brief.websiteUrl
    );

    const mustInclude = ["ценность для читателя с первых строк"];
    if (brief.facts.age) mustInclude.push(brief.facts.age);
    if (brief.websiteUrl?.trim()) {
      mustInclude.push(`ссылка: ${normalizeWebsiteUrl(brief.websiteUrl)}`);
    }
    if (effectiveGoal === "offer") {
      mustInclude.push("только подтверждённые условия из facts");
    }

    const timeLocal = formatHm(slot.hour, slot.minute);

    posts.push({
      id: `post-${ymd}-${channel}-${String(i + 1).padStart(2, "0")}`,
      day: ymd,
      weekday,
      timeLocal,
      scheduledAtIso: when.toISOString(),
      channel,
      rubric: idea.rubric,
      goal: effectiveGoal,
      topic: idea.topic,
      angle: idea.angle,
      hook: idea.hook,
      cta,
      whyThisTime: `${slot.why} · ${timeLocal} ${tz}`,
      whyInteresting: idea.whyInteresting,
      format,
      mustInclude,
      mustAvoid: brief.taboos ?? [],
    });
  }

  posts.sort((a, b) => a.scheduledAtIso.localeCompare(b.scheduledAtIso));

  return {
    brandName: brief.brandName,
    niche: brief.niche,
    timezone: tz,
    period: { from: startYmd, to: endYmd },
    summary: {
      totalPosts: posts.length,
      byChannel: countBy(posts.map((p) => p.channel)),
      byGoal: countBy(posts.map((p) => p.goal)),
      byRubric: countBy(posts.map((p) => p.rubric)),
    },
    strategyNotes: strategyNotes(
      { ...brief, timezone: tz, postsPerDay, postsPerWeek },
      [
        `Частота: ${postsPerDay} пост(ов) в день · ${postsPerWeek} за неделю.`,
        ...extraNotes,
      ]
    ),
    postingRules: postingRules(brief),
    posts,
  };
}

export function createWeeklyPlan(brief: BrandBrief): ContentPlan {
  const channels = brief.channels.length ? brief.channels : (["telegram"] as Channel[]);
  const { postsPerWeek } = resolvePostFrequency(brief);
  const total = Math.max(channels.length, postsPerWeek);
  const goals = allocateGoals(total, brief.goals);
  const pool = topicsForNiche(brief.niche);
  const usedTopics = new Set<string>();
  const ideas = goals.map((goal) => pickTopic(pool, goal, usedTopics));
  return buildPlanFromIdeas(brief, ideas);
}

export function createWeeklyPlanFromTopics(
  brief: BrandBrief,
  topics: TopicIdea[],
  extraNotes: string[] = []
): ContentPlan {
  return buildPlanFromIdeas(brief, topics, extraNotes);
}
