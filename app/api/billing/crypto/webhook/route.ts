import {
  isCryptomusConfigured,
  verifyCryptomusSign,
} from "@/lib/billing/cryptomus";
import {
  creditUserBalance,
  findPendingTopUp,
  markTopUpSucceeded,
  payReferrerOnTopup,
} from "@/lib/store/projects";

type CryptoWebhook = {
  uuid?: string;
  order_id?: string;
  status?: string;
  payment_status?: string;
  is_final?: boolean;
  amount?: string;
  currency?: string;
  additional_data?: string;
  sign?: string;
};

/**
 * Cryptomus webhook: paid / paid_over → credit balance.
 * Docs: https://doc.cryptomus.com/business/payments/webhook
 */
export async function POST(req: Request) {
  try {
    if (!isCryptomusConfigured()) {
      return Response.json({ error: "crypto not configured" }, { status: 503 });
    }

    const raw = await req.text();
    let body: CryptoWebhook;
    try {
      body = JSON.parse(raw) as CryptoWebhook;
    } catch {
      return Response.json({ error: "bad json" }, { status: 400 });
    }

    const headerSign = req.headers.get("sign") || req.headers.get("Sign");
    const payloadSign = headerSign || body.sign;
    const { sign: _omit, ...withoutSign } = body;
    const ok =
      verifyCryptomusSign(raw, payloadSign) ||
      verifyCryptomusSign(JSON.stringify(withoutSign), payloadSign);
    if (!ok) {
      return Response.json({ error: "bad sign" }, { status: 403 });
    }

    const status = (body.status || body.payment_status || "").toLowerCase();
    const paid =
      status === "paid" ||
      status === "paid_over" ||
      status === "complete" ||
      status === "completed";

    if (!paid) {
      return Response.json({ ok: true });
    }

    const pending =
      (body.order_id ? findPendingTopUp(body.order_id) : null) ||
      (body.uuid ? findPendingTopUp(body.uuid) : null);
    if (!pending || pending.status === "succeeded") {
      return Response.json({ ok: true });
    }

    creditUserBalance({
      userId: pending.userId,
      amountRub: pending.amountRub,
      description: `Пополнение криптой ${pending.amountRub} ₽`,
      yooPaymentId: pending.yooPaymentId,
    });
    markTopUpSucceeded(pending.yooPaymentId);
    payReferrerOnTopup({
      payerUserId: pending.userId,
      amountRub: pending.amountRub,
      paymentId: pending.yooPaymentId,
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
}
