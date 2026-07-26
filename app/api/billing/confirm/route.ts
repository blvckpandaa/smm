import { requireSession } from "@/lib/auth/request";
import { getYooPayment, isYooKassaConfigured } from "@/lib/billing/yookassa";
import {
  creditUserBalance,
  findPendingTopUp,
  getUserById,
  markTopUpSucceeded,
  payReferrerOnTopup,
} from "@/lib/store/projects";

/** После return_url: проверить платёж и зачислить, если webhook ещё не пришёл */
export async function POST(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json()) as { paymentId?: string };
    if (!body.paymentId) {
      return Response.json({ error: "Нужен paymentId" }, { status: 400 });
    }

    if (!isYooKassaConfigured()) {
      const user = getUserById(auth.session.userId);
      return Response.json({
        ok: true,
        balanceRub: user?.balanceRub ?? 0,
      });
    }

    const payment = await getYooPayment(body.paymentId);
    if (payment.status === "succeeded" || payment.paid) {
      const pending = findPendingTopUp(body.paymentId);
      const amountRub =
        pending?.amountRub ||
        Math.round(parseFloat(payment.amount?.value || "0"));
      const userId =
        pending?.userId ||
        payment.metadata?.userId ||
        auth.session.userId;

      if (amountRub > 0 && userId === auth.session.userId) {
        creditUserBalance({
          userId,
          amountRub,
          description: `Пополнение через ЮKassa ${amountRub} ₽`,
          yooPaymentId: body.paymentId,
        });
        markTopUpSucceeded(body.paymentId);
        payReferrerOnTopup({
          payerUserId: userId,
          amountRub,
          paymentId: body.paymentId,
        });
      }
    }

    const user = getUserById(auth.session.userId);
    return Response.json({
      ok: true,
      status: payment.status,
      balanceRub: user?.balanceRub ?? 0,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка";
    return Response.json({ error: message }, { status: 500 });
  }
}
