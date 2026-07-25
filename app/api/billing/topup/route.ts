import { randomUUID } from "node:crypto";
import { requireSession } from "@/lib/auth/request";
import { TOPUP_PRESETS_RUB } from "@/lib/billing/pricing";
import {
  billingReturnUrl,
  createYooPayment,
  isYooKassaConfigured,
} from "@/lib/billing/yookassa";
import {
  creditUserBalance,
  getUserById,
  savePendingTopUp,
} from "@/lib/store/projects";

/** Создать пополнение: ЮKassa redirect или демо-зачисление без ключей */
export async function POST(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json()) as { amountRub?: number };
    const amountRub = Math.round(Number(body.amountRub) || 0);
    if (amountRub < 50 || amountRub > 100_000) {
      return Response.json(
        { error: "Сумма пополнения: от 50 до 100 000 ₽" },
        { status: 400 }
      );
    }

    const user = getUserById(auth.session.userId);
    if (!user) {
      return Response.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    if (!isYooKassaConfigured()) {
      // В проде демо-зачисление запрещено (иначе любой юзер может накрутить баланс)
      if (
        process.env.NODE_ENV === "production" &&
        process.env.ALLOW_DEMO_TOPUP !== "1"
      ) {
        return Response.json(
          { error: "Оплата временно недоступна. ЮKassa не настроена." },
          { status: 503 }
        );
      }
      const credited = creditUserBalance({
        userId: auth.session.userId,
        amountRub,
        description: `Демо-пополнение ${amountRub} ₽ (ЮKassa не настроена)`,
        yooPaymentId: `demo-${randomUUID()}`,
      });
      if (!credited.ok) {
        return Response.json({ error: credited.error }, { status: 400 });
      }
      return Response.json({
        ok: true,
        demo: true,
        balanceRub: credited.balanceRub,
        message: `Баланс пополнен на ${amountRub} ₽ (тестовый режим без ЮKassa)`,
      });
    }

    const payment = await createYooPayment({
      amountRub,
      description: `Пополнение SMM-Agents на ${amountRub} ₽`,
      returnUrl: billingReturnUrl(),
      customerEmail: user.email,
      metadata: {
        userId: auth.session.userId,
        purpose: "balance_topup",
        amountRub: String(amountRub),
      },
    });

    savePendingTopUp({
      userId: auth.session.userId,
      amountRub,
      yooPaymentId: payment.id,
    });

    const url = payment.confirmation?.confirmation_url;
    if (!url) {
      return Response.json(
        { error: "ЮKassa не вернула ссылку на оплату" },
        { status: 502 }
      );
    }

    return Response.json({
      ok: true,
      paymentId: payment.id,
      confirmationUrl: url,
      amountRub,
      presets: TOPUP_PRESETS_RUB,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка оплаты";
    return Response.json({ error: message }, { status: 500 });
  }
}
