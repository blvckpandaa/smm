import { deepseekChat, extractJson, isDeepSeekConfigured } from "@/lib/ai/client";
import type { BrandBrief, ContentPlan, PlannedPost } from "@/lib/marketer/types";
import { draftNeedsPhoto } from "./photo";
import type { PostDraft, WritePostsInput } from "./types";

const SYSTEM = `Ты агент-SMM платформы AgentMark.
Пишешь готовые тексты постов по контент-плану маркетолога.

Правила:
- Отвечай ТОЛЬКО валидным JSON
- Язык: как в брифе (обычно русский)
- Один пост = одна мысль, без воды
- Начни с хука из плана или усиль его
- Учитывай канал: telegram — можно чуть длиннее; vk/instagram — короче; threads — очень коротко
- Instagram: пост всегда с фото, текст идёт в описание (caption)
- Threads: только текст, без фото и без ссылок на картинки
- Не выдумывай факты, цены, акции — нет данных → [уточнить]
- Соблюдай Tone of Voice и табу
- CTA в конце естественно
- Без markdown-разметки в body (можно эмодзи умеренно, если тон позволяет)

Формат:
{
  "posts": [
    {
      "planPostId": "id из плана",
      "title": "короткий заголовок/первая строка",
      "body": "полный текст поста готовый к публикации",
      "hashtags": ["тег1"],
      "mediaHint": "что показать на картинке, если нужно"
    }
  ]
}`;

function localFallback(brief: BrandBrief, post: PlannedPost): PostDraft {
  const lines = [
    post.hook,
    "",
    `${post.angle}.`,
    "",
    `Тема: ${post.topic}`,
    brief.offer ? `О нас: ${brief.offer}` : "",
    "",
    post.cta,
  ].filter(Boolean);

  return {
    id: `draft-${post.id}`,
    planPostId: post.id,
    channel: post.channel,
    day: post.day,
    weekday: post.weekday,
    timeLocal: post.timeLocal,
    scheduledAtIso: post.scheduledAtIso,
    topic: post.topic,
    goal: post.goal,
    format: post.format,
    cta: post.cta,
    title: post.hook.slice(0, 80),
    body: lines.join("\n"),
    hashtags: [brief.niche.replace(/\s+/g, "")].filter(Boolean),
    status: "pending_approval",
    needsPhoto: draftNeedsPhoto({
      channel: post.channel,
      format: post.format,
    }),
    mediaHint: draftNeedsPhoto({ channel: post.channel, format: post.format })
      ? "Визуал по теме поста в стиле бренда"
      : undefined,
  };
}

function mapAiPost(
  planPost: PlannedPost,
  raw: {
    title?: string;
    body?: string;
    hashtags?: string[];
    mediaHint?: string;
  }
): PostDraft {
  return {
    id: `draft-${planPost.id}`,
    planPostId: planPost.id,
    channel: planPost.channel,
    day: planPost.day,
    weekday: planPost.weekday,
    timeLocal: planPost.timeLocal,
    scheduledAtIso: planPost.scheduledAtIso,
    topic: planPost.topic,
    goal: planPost.goal,
    format: planPost.format,
    cta: planPost.cta,
    title: raw.title?.trim() || planPost.hook.slice(0, 80),
    body: raw.body?.trim() || planPost.hook,
    hashtags: Array.isArray(raw.hashtags)
      ? raw.hashtags.map(String).slice(0, 8)
      : [],
    status: "pending_approval",
    needsPhoto: draftNeedsPhoto({
      channel: planPost.channel,
      format: planPost.format,
    }),
    mediaHint:
      raw.mediaHint?.trim() ||
      (draftNeedsPhoto({ channel: planPost.channel, format: planPost.format })
        ? `Фото по теме «${planPost.topic}» в стиле бренда`
        : undefined),
  };
}

export async function writePostsFromPlan(
  input: WritePostsInput
): Promise<{ drafts: PostDraft[]; source: "deepseek" | "local" }> {
  const { brief, plan } = input;

  if (!isDeepSeekConfigured()) {
    return {
      drafts: plan.posts.map((p) => localFallback(brief, p)),
      source: "local",
    };
  }

  try {
    const content = await deepseekChat({
      system: SYSTEM,
      temperature: 0.75,
      user: JSON.stringify(
        {
          brief: {
            brandName: brief.brandName,
            niche: brief.niche,
            audience: brief.audience,
            toneOfVoice: brief.toneOfVoice,
            offer: brief.offer,
            taboos: brief.taboos ?? [],
            facts: brief.facts,
            language: brief.language,
          },
          postingRules: plan.postingRules,
          posts: plan.posts.map((p) => ({
            planPostId: p.id,
            channel: p.channel,
            topic: p.topic,
            angle: p.angle,
            hook: p.hook,
            cta: p.cta,
            goal: p.goal,
            format: p.format,
            mustInclude: p.mustInclude,
            mustAvoid: p.mustAvoid,
          })),
        },
        null,
        2
      ),
    });

    const parsed = extractJson(content) as {
      posts?: {
        planPostId?: string;
        title?: string;
        body?: string;
        hashtags?: string[];
        mediaHint?: string;
      }[];
    };

    const byId = new Map(
      (parsed.posts ?? []).map((p) => [p.planPostId, p] as const)
    );

    const drafts = plan.posts.map((planPost) => {
      const raw = byId.get(planPost.id);
      if (!raw?.body) return localFallback(brief, planPost);
      return mapAiPost(planPost, raw);
    });

    return { drafts, source: "deepseek" };
  } catch (error) {
    console.error("[smm]", error);
    return {
      drafts: plan.posts.map((p) => localFallback(brief, p)),
      source: "local",
    };
  }
}

export async function rewriteOneDraft(options: {
  brief: BrandBrief;
  planPost: PlannedPost;
  current: PostDraft;
  instruction?: string;
}): Promise<PostDraft> {
  const { brief, planPost, current, instruction } = options;

  if (!isDeepSeekConfigured()) {
    return { ...current, status: "pending_approval" };
  }

  const content = await deepseekChat({
    system: SYSTEM,
    temperature: 0.8,
    user: JSON.stringify({
      mode: "rewrite_one",
      instruction: instruction || "Перепиши свежее, сильнее хук, тот же смысл",
      brief: {
        brandName: brief.brandName,
        niche: brief.niche,
        toneOfVoice: brief.toneOfVoice,
        taboos: brief.taboos ?? [],
      },
      planPost,
      current: { title: current.title, body: current.body },
    }),
  });

  const parsed = extractJson(content) as {
    posts?: { title?: string; body?: string; hashtags?: string[]; mediaHint?: string }[];
    title?: string;
    body?: string;
    hashtags?: string[];
    mediaHint?: string;
  };

  const raw = parsed.posts?.[0] ?? parsed;
  return {
    ...mapAiPost(planPost, raw),
    id: current.id,
    status: "pending_approval",
  };
}
