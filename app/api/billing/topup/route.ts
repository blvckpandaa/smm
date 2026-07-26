import { randomUUID } from "node:crypto";
import { requireSession } from "@/lib/auth/request";
import { getCryptoAsset } from "@/lib/billing/crypto-assets";
import {
  createCryptomusInvoice,
  isCryptomusConfigured,
  newCryptoOrderId,
} from "@/lib/billing/cryptomus";
import { getRuntimePricing } from "@/lib/billing/runtime-pricing";
import {
  billingReturnUrl,
  createYooPayment,
  isYooKassaConfigured,
} from "@/lib/billing/yookassa";
import {
  creditUserBalance,
  getUserById,
  payReferrerOnTopup,
  savePendingTopUp,
} from "@/lib/store/projects";

type TopupMethod = "card" | "crypto";

/** Создать пополнение: карта (ЮKassa) или крипта (Cryptomus) */
export async function POST(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json()) as {
      amountRub?: number;
      method?: TopupMethod;
      cryptoAsset?: string;
    };
    const amountRub = Math.round(Number(body.amountRub) || 0);
    const method: TopupMethod =
      body.method === "crypto" ? "crypto" : "card";
    const asset =
      method === "crypto" ? getCryptoAsset(body.cryptoAsset) : null;
    const presets = getRuntimePricing().topupPresetsRub;

    if (method === "crypto" && !asset) {
      return Response.json(
        {
          error:
            "Выберите криптовалюту: BTC, USDT (TRC-20 / TON / BEP-20), TON или ETH.",
        },
        { status: 400 }
      );
    }

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

    if (method === "crypto") {
      if (!isCryptomusConfigured()) {
        if (
          process.env.NODE_ENV === "production" &&
          process.env.ALLOW_DEMO_TOPUP !== "1"
        ) {
          return Response.json(
            {
              error:
                "Крипто-оплата пока не настроена. Выберите карту/СБП или напишите в поддержку.",
            },
            { status: 503 }
          );
        }
        const paymentId = `demo-crypto-${randomUUID()}`;
        const assetLabel = asset
          ? `${asset.symbol} (${asset.networkLabel})`
          : "крипта";
        const credited = creditUserBalance({
          userId: auth.session.userId,
          amountRub,
          description: `Демо-пополнение ${assetLabel} ${amountRub} ₽`,
          yooPaymentId: paymentId,
        });
        if (!credited.ok) {
          return Response.json({ error: credited.error }, { status: 400 });
        }
        payReferrerOnTopup({
          payerUserId: auth.session.userId,
          amountRub,
          paymentId,
        });
        return Response.json({
          ok: true,
          demo: true,
          method: "crypto",
          cryptoAsset: asset?.id ?? null,
          balanceRub: credited.balanceRub,
          message: `Баланс пополнен на ${amountRub} ₽ (демо без Cryptomus)`,
          presets,
        });
      }

      const orderId = newCryptoOrderId();
      const invoice = await createCryptomusInvoice({
        amountRub,
        orderId,
        userId: auth.session.userId,
        asset,
      });

      savePendingTopUp({
        userId: auth.session.userId,
        amountRub,
        yooPaymentId: orderId,
      });

      return Response.json({
        ok: true,
        method: "crypto",
        cryptoAsset: asset?.id ?? null,
        paymentId: invoice.uuid,
        orderId,
        confirmationUrl: invoice.url,
        amountRub,
        presets,
      });
    }

    if (!isYooKassaConfigured()) {
      if (
        process.env.NODE_ENV === "production" &&
        process.env.ALLOW_DEMO_TOPUP !== "1"
      ) {
        return Response.json(
          { error: "Оплата временно недоступна. ЮKassa не настроена." },
          { status: 503 }
        );
      }
      const paymentId = `demo-${randomUUID()}`;
      const credited = creditUserBalance({
        userId: auth.session.userId,
        amountRub,
        description: `Демо-пополнение ${amountRub} ₽ (ЮKassa не настроена)`,
        yooPaymentId: paymentId,
      });
      if (!credited.ok) {
        return Response.json({ error: credited.error }, { status: 400 });
      }
      payReferrerOnTopup({
        payerUserId: auth.session.userId,
        amountRub,
        paymentId,
      });
      return Response.json({
        ok: true,
        demo: true,
        method: "card",
        balanceRub: credited.balanceRub,
        message: `Баланс пополнен на ${amountRub} ₽ (тестовый режим без ЮKassa)`,
        presets,
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
      method: "card",
      paymentId: payment.id,
      confirmationUrl: url,
      amountRub,
      presets,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка оплаты";
    return Response.json({ error: message }, { status: 500 });
  }
}
