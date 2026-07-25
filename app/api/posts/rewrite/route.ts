import { requireSession } from "@/lib/auth/request";
import { REWRITE_TEXT_PRICE_RUB } from "@/lib/billing/pricing";
import type { BrandBrief, PlannedPost } from "@/lib/marketer/types";
import type { PostDraft } from "@/lib/smm/types";
import { rewriteOneDraft } from "@/lib/smm/writer";
import {
  chargeUserFixed,
  creditUserBalance,
  getUserById,
} from "@/lib/store/projects";

/** @deprecated Предпочитайте /api/projects/[id]/drafts/rewrite */
export async function POST(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  let chargedRub = 0;
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

    const charge = chargeUserFixed({
      userId: auth.session.userId,
      amountRub: REWRITE_TEXT_PRICE_RUB,
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

    const draft = await rewriteOneDraft({
      brief: body.brief,
      planPost: body.planPost,
      current: body.draft,
      instruction: body.instruction,
    });

    const user = getUserById(auth.session.userId);
    return Response.json({
      draft,
      billing: {
        chargedRub,
        balanceRub: user?.balanceRub ?? charge.balanceRub,
        rewritePriceRub: REWRITE_TEXT_PRICE_RUB,
      },
    });
  } catch (error) {
    if (chargedRub > 0) {
      creditUserBalance({
        userId: auth.session.userId,
        amountRub: chargedRub,
        description: `Возврат: не удалось переписать текст`,
        yooPaymentId: `refund-rewrite-legacy-${Date.now()}`,
      });
    }
    const message = error instanceof Error ? error.message : "Ошибка rewrite";
    return Response.json({ error: message }, { status: 500 });
  }
}
