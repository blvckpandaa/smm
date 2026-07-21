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
    const body = (await req.json()) as WebhookBody;
    if (body.event !== "payment.succeeded" || !body.object?.id) {
      return Response.json({ ok: true });
    }

    const paymentId = body.object.id;
    const pending = findPendingTopUp(paymentId);
    const metaUserId = body.object.metadata?.userId;
    const userId = pending?.userId || metaUserId;
    if (!userId) {
      return Response.json({ ok: true });
    }

    let amountRub = pending?.amountRub;
    if (!amountRub && body.object.amount?.value) {
      amountRub = Math.round(parseFloat(body.object.amount.value));
    }

    // Дополнительная проверка статуса у ЮKassa, если ключи есть
    if (isYooKassaConfigured()) {
      try {
        const live = await getYooPayment(paymentId);
        if (live.status !== "succeeded" && !live.paid) {
          return Response.json({ ok: true });
        }
        if (live.amount?.value) {
          amountRub = Math.round(parseFloat(live.amount.value));
        }
      } catch {
        /* webhook всё равно обработаем по payload */
      }
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
    // ЮKassa повторит, если не 200 — лучше 200 при сбое парсинга редких событий
    return Response.json({ ok: true });
  }
}
