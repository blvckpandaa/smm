import type { BrandBrief } from "@/lib/marketer/types";
import { buildContentPlan, isDeepSeekConfigured } from "@/lib/ai/deepseek";

export async function POST(req: Request) {
  try {
    const brief = (await req.json()) as BrandBrief;

    if (!brief?.brandName || !brief?.niche || !brief?.channels?.length) {
      return Response.json(
        { error: "Нужны brandName, niche и хотя бы один канал" },
        { status: 400 }
      );
    }

    if (!brief.startDate) {
      brief.startDate = new Date().toISOString().slice(0, 10);
    }
    if (!brief.timezone) brief.timezone = "Europe/Moscow";
    if (!brief.postsPerWeek) brief.postsPerWeek = 7;
    if (!brief.ctaOptions?.length) {
      brief.ctaOptions = ["Написать в комментарии", "Перейти на сайт", "Узнать подробнее"];
    }
    if (!brief.toneOfVoice?.length) brief.toneOfVoice = ["понятный", "дружелюбный"];
    if (!brief.audience) {
      brief.audience = { who: "клиенты бренда", pain: "", desire: "" };
    }
    if (!brief.facts) brief.facts = {};

    const { plan, source } = await buildContentPlan(brief);

    return Response.json({
      plan,
      source,
      aiConfigured: isDeepSeekConfigured(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка плана";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({
    aiConfigured: isDeepSeekConfigured(),
    provider: "deepseek",
  });
}
