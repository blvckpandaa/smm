import type { BrandBrief, ContentPlan } from "@/lib/marketer/types";
import { writePostsFromPlan } from "@/lib/smm/writer";
import { isDeepSeekConfigured } from "@/lib/ai/client";
import { requireSession } from "@/lib/auth/request";

export async function POST(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json()) as {
      brief?: BrandBrief;
      plan?: ContentPlan;
    };

    if (!body.brief || !body.plan?.posts?.length) {
      return Response.json(
        { error: "Нужны brief и plan с постами" },
        { status: 400 }
      );
    }

    const { drafts, source } = await writePostsFromPlan({
      brief: body.brief,
      plan: body.plan,
    });

    return Response.json({
      drafts,
      source,
      aiConfigured: isDeepSeekConfigured(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка SMM";
    return Response.json({ error: message }, { status: 500 });
  }
}
