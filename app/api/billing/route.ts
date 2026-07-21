import { requireSession } from "@/lib/auth/request";
import { POST_PRICE_RUB, TOPUP_PRESETS_RUB } from "@/lib/billing/pricing";
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
    topupPresets: TOPUP_PRESETS_RUB,
    yookassaConfigured: isYooKassaConfigured(),
    ledger: listLedgerForUser(auth.session.userId, 15),
  });
}
