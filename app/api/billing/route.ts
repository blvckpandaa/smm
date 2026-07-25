import { requireSession } from "@/lib/auth/request";
import {
  BOT_AI_REPLY_RUB,
  BOT_FAQ_REPLY_RUB,
  BOT_PERIOD_DAYS,
  BOT_TG_PERIOD_RUB,
  BOT_VK_PERIOD_RUB,
  POST_PRICE_RUB,
  REGENERATE_IMAGE_PRICE_RUB,
  REWRITE_TEXT_PRICE_RUB,
  TOPUP_PRESETS_RUB,
} from "@/lib/billing/pricing";
import { isYooKassaConfigured } from "@/lib/billing/yookassa";
import { getUserById, listLedgerForUser } from "@/lib/store/projects";

/** Баланс и история платежей текущего пользователя */
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const user = getUserById(auth.session.userId);
  if (!user) {
    return Response.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  return Response.json({
    balanceRub: user.balanceRub,
    postPriceRub: POST_PRICE_RUB,
    rewritePriceRub: REWRITE_TEXT_PRICE_RUB,
    imagePriceRub: REGENERATE_IMAGE_PRICE_RUB,
    botVkPeriodRub: BOT_VK_PERIOD_RUB,
    botTgPeriodRub: BOT_TG_PERIOD_RUB,
    botFaqReplyRub: BOT_FAQ_REPLY_RUB,
    botAiReplyRub: BOT_AI_REPLY_RUB,
    botPeriodDays: BOT_PERIOD_DAYS,
    topupPresets: TOPUP_PRESETS_RUB,
    yookassaConfigured: isYooKassaConfigured(),
    ledger: listLedgerForUser(auth.session.userId, 15),
  });
}
