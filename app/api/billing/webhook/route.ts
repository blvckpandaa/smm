import {
  creditUserBalance,
  findPendingTopUp,
  markTopUpSucceeded,
} from "@/lib/store/projects";
import { getYooPayment, isYooKassaConfigured } from "@/lib/billing/yookassa";

type WebhookBody = {
  event?: string;
  object?: {
    id?: string;
    status?: string;
    paid?: boolean;
    amount?: { value?: string; currency?: string };
    metadata?: Record<string, string>;
  };
};

/** HTTP-уведомления ЮKassa: payment.succeeded → зачисление на баланс */
export async function POST(req: Request) {
  try {
    if (!isYooKassaConfigured()) {
      return Response.json({ error: "YooKassa not configured" }, { status: 503 });
    }

    const body = (await req.json()) as WebhookBody;
    if (body.event !== "payment.succeeded" || !body.object?.id) {
      return Response.json({ ok: true });
    }

    const paymentId = body.object.id;
    const pending = findPendingTopUp(paymentId);
    if (!pending) {
      // Неизвестный платёж — не доверяем payload (анти-подделка)
      return Response.json({ ok: true });
    }

    const userId = pending.userId;
    let amountRub = pending.amountRub;

    // Обязательная проверка статуса у ЮKassa — без неё не зачисляем
    let live;
    try {
      live = await getYooPayment(paymentId);
    } catch {
      return Response.json({ error: "verify failed" }, { status: 502 });
    }

    if (live.status !== "succeeded" && !live.paid) {
      return Response.json({ ok: true });
    }

    if (live.amount?.value) {
      amountRub = Math.round(parseFloat(live.amount.value));
    }

    if (!amountRub || amountRub <= 0) {
      return Response.json({ ok: true });
    }

    creditUserBalance({
      userId,
      amountRub,
      description: `Пополнение через ЮKassa ${amountRub} ₽`,
      yooPaymentId: paymentId,
    });
    markTopUpSucceeded(paymentId);

    return Response.json({ ok: true });
  } catch {
    // ЮKassa повторит при 5xx; при битом JSON отвечаем 400
    return Response.json({ error: "bad request" }, { status: 400 });
  }
}
