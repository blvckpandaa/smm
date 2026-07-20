import type { BrandBrief, PlannedPost } from "@/lib/marketer/types";
import type { PostDraft } from "@/lib/smm/types";
import { rewriteOneDraft } from "@/lib/smm/writer";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      brief?: BrandBrief;
      planPost?: PlannedPost;
      draft?: PostDraft;
      instruction?: string;
    };

    if (!body.brief || !body.planPost || !body.draft) {
      return Response.json(
        { error: "Нужны brief, planPost и draft" },
        { status: 400 }
      );
    }

    const draft = await rewriteOneDraft({
      brief: body.brief,
      planPost: body.planPost,
      current: body.draft,
      instruction: body.instruction,
    });

    return Response.json({ draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка rewrite";
    return Response.json({ error: message }, { status: 500 });
  }
}
