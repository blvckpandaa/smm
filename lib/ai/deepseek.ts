import type { BrandBrief, ContentPlan, PostGoal, RubricId } from "@/lib/marketer/types";
import { createWeeklyPlan, createWeeklyPlanFromTopics } from "@/lib/marketer/planner";
import type { TopicIdea } from "@/lib/marketer/topics";
import {
  deepseekChat,
  extractJson,
  isDeepSeekConfigured,
} from "@/lib/ai/client";

export { isDeepSeekConfigured };

const RUBRICS: RubricId[] = [
  "brand_atmosphere",
  "game_spotlight",
  "promo_factual",
  "education",
  "community_hook",
  "social_proof",
  "responsible_play",
  "behind_scenes",
  "trend_react",
  "faq_support",
];

const GOALS: PostGoal[] = [
  "awareness",
  "trust",
  "engagement",
  "offer",
  "education",
  "community",
];

const FORMATS: TopicIdea["format"][] = [
  "text",
  "text_image",
  "poll",
  "carousel",
  "short_video",
];

function sanitizeTopic(raw: Partial<TopicIdea>, index: number): TopicIdea {
  const rubric = RUBRICS.includes(raw.rubric as RubricId)
    ? (raw.rubric as RubricId)
    : "education";
  const goal = GOALS.includes(raw.goal as PostGoal)
    ? (raw.goal as PostGoal)
    : "awareness";
  const format = FORMATS.includes(raw.format as TopicIdea["format"])
    ? (raw.format as TopicIdea["format"])
    : "text_image";

  return {
    rubric,
    goal,
    topic: raw.topic?.trim() || `Тема ${index + 1}`,
    angle: raw.angle?.trim() || "Угол подачи под аудиторию",
    hook: raw.hook?.trim() || "Короткий хук без воды",
    format,
    whyInteresting:
      raw.whyInteresting?.trim() || "Даёт пользу или диалог, а не только рекламу",
  };
}

const SYSTEM_PROMPT = `Ты агент-маркетолог SMM-платформы SMM-Agents.
Твоя задача — предложить темы постов на неделю для ЛЮБОЙ ниши бизнеса или эксперта.

Правила:
- Отвечай ТОЛЬКО валидным JSON без пояснений
- Не выдумывай цены, акции, цифры — если нет фактов, пиши [уточнить]
- Микс: мало чистых офферов (~15%), больше пользы, доверия, вовлечения
- Хуки короткие, без воды, на языке из брифа (поле language: ru/en/…)
- Учитывай Tone of Voice и табу из брифа
- Темы должны быть интересны живым людям, не шаблонный спам
- САМ решай, нужен ли визуал: text_image/carousel — если пост выиграет от фото; text/poll — если достаточно текста; short_video — только если идея явно про видео
- Если канал Instagram — почти всегда format text_image (фото обязательно)
- Если в брифе есть websiteUrl — темы с призывом перейти должны опираться на эту ссылку

Формат ответа:
{
  "strategyNotes": ["строка", "..."],
  "topics": [
    {
      "rubric": "brand_atmosphere|education|community_hook|promo_factual|behind_scenes|faq_support|trend_react|social_proof|game_spotlight|responsible_play",
      "goal": "awareness|trust|engagement|offer|education|community",
      "topic": "тема",
      "angle": "угол",
      "hook": "хук",
      "format": "text|text_image|poll|carousel|short_video",
      "whyInteresting": "почему зайдёт"
    }
  ]
}

Количество topics должно быть ровно равно postsPerWeek из брифа (это postsPerDay × 7).`;

export async function generateTopicsWithDeepSeek(
  brief: BrandBrief
): Promise<{ strategyNotes: string[]; topics: TopicIdea[] } | null> {
  if (!isDeepSeekConfigured()) return null;

  const userPayload = {
    brandName: brief.brandName,
    niche: brief.niche,
    geo: brief.geo,
    language: brief.language || "ru",
    audience: brief.audience,
    toneOfVoice: brief.toneOfVoice,
    offer: brief.offer,
    websiteUrl: brief.websiteUrl?.trim() || undefined,
    ctaOptions: brief.ctaOptions,
    facts: brief.facts,
    channels: brief.channels,
    postsPerDay: brief.postsPerDay ?? Math.max(1, Math.round((brief.postsPerWeek || 7) / 7)),
    postsPerWeek: brief.postsPerWeek,
    taboos: brief.taboos ?? [],
    goals: brief.goals ?? [],
  };

  const content = await deepseekChat({
    system: SYSTEM_PROMPT,
    temperature: 0.7,
    user: `Собери темы на неделю по брифу:\n${JSON.stringify(userPayload, null, 2)}`,
  });

  const parsed = extractJson(content) as {
    strategyNotes?: string[];
    topics?: Partial<TopicIdea>[];
  };

  if (!Array.isArray(parsed.topics) || parsed.topics.length === 0) {
    throw new Error("DeepSeek вернул некорректный список тем");
  }

  const topics = parsed.topics
    .slice(0, brief.postsPerWeek)
    .map((t, i) => sanitizeTopic(t, i));

  while (topics.length < brief.postsPerWeek) {
    topics.push(sanitizeTopic({}, topics.length));
  }

  return {
    strategyNotes: [
      ...(parsed.strategyNotes ?? []),
      "Темы сгенерированы DeepSeek под ваш бриф.",
    ],
    topics,
  };
}

export async function buildContentPlan(
  brief: BrandBrief
): Promise<{ plan: ContentPlan; source: "deepseek" | "local" }> {
  try {
    const ai = await generateTopicsWithDeepSeek(brief);
    if (ai) {
      const plan = createWeeklyPlanFromTopics(brief, ai.topics, ai.strategyNotes);
      return { plan, source: "deepseek" };
    }
  } catch (error) {
    console.error("[deepseek]", error);
  }

  return { plan: createWeeklyPlan(brief), source: "local" };
}
