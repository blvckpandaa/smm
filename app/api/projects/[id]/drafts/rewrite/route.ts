import { requireSession } from "@/lib/auth/request";
import { REWRITE_TEXT_PRICE_RUB } from "@/lib/billing/pricing";
import { rewriteOneDraft } from "@/lib/smm/writer";
import {
  chargeUserFixed,
  creditUserBalance,
  getProjectForUser,
  getUserById,
  toPublicProject,
  updateProject,
} from "@/lib/store/projects";

type Ctx = { params: Promise<{ id: string }> };

/** Переписать текст одного поста (25 ₽) */
export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const project = getProjectForUser(id, auth.session.userId);
  if (!project) {
    return Response.json({ error: "Проект не найден" }, { status: 404 });
  }

  let chargedRub = 0;
  try {
    const body = (await req.json()) as {
      draftId?: string;
      instruction?: string;
    };
    if (!body.draftId) {
      return Response.json({ error: "Укажите draftId" }, { status: 400 });
    }

    const draft = project.drafts.find((d) => d.id === body.draftId);
    if (!draft) {
      return Response.json({ error: "Черновик не найден" }, { status: 404 });
    }

    const planPost =
      project.plan?.posts.find((p) => p.id === draft.planPostId) ?? null;
    if (!planPost) {
      return Response.json(
        { error: "Не найден слот плана для этого поста" },
        { status: 400 }
      );
    }

    const charge = chargeUserFixed({
      userId: auth.session.userId,
      amountRub: REWRITE_TEXT_PRICE_RUB,
      projectId: id,
      description: `Переписать текст · ${REWRITE_TEXT_PRICE_RUB} ₽`,
    });
    if (!charge.ok) {
      return Response.json(
        {
          error: charge.error,
          balanceRub: charge.balanceRub,
          needRub: charge.needRub,
          rewritePriceRub: REWRITE_TEXT_PRICE_RUB,
        },
        { status: 402 }
      );
    }
    chargedRub = charge.chargedRub;

    const rewritten = await rewriteOneDraft({
      brief: project.brief,
      planPost,
      current: draft,
      instruction: body.instruction,
    });

    const drafts = project.drafts.map((d) => {
      if (d.id !== draft.id) return d;
      const nextStatus =
        d.status === "published" || d.status === "scheduled"
          ? d.status
          : ("pending_approval" as const);
      return {
        ...d,
        title: rewritten.title,
        body: rewritten.body,
        hashtags: rewritten.hashtags,
        mediaHint: rewritten.mediaHint ?? d.mediaHint,
        status: nextStatus,
        publishError: undefined,
      };
    });

    const updated = updateProject(id, auth.session.userId, { drafts });
    const user = getUserById(auth.session.userId);
    return Response.json({
      ok: true,
      draft: drafts.find((d) => d.id === draft.id),
      project: toPublicProject(updated!),
      billing: {
        chargedRub,
        balanceRub: user?.balanceRub ?? charge.balanceRub,
        rewritePriceRub: REWRITE_TEXT_PRICE_RUB,
      },
    });
  } catch (e) {
    if (chargedRub > 0) {
      creditUserBalance({
        userId: auth.session.userId,
        amountRub: chargedRub,
        description: `Возврат: не удалось переписать текст`,
        yooPaymentId: `refund-rewrite-${id}-${Date.now()}`,
      });
    }
    const message =
      e instanceof Error ? e.message : "Не удалось переписать текст";
    return Response.json({ error: message }, { status: 500 });
  }
}
