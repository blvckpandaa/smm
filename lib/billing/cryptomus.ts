import { createHash, randomUUID } from "node:crypto";
import { getAppUrl } from "@/lib/meta/config";
import type { CryptoAsset } from "@/lib/billing/crypto-assets";

export function getCryptomusMerchant(): string | undefined {
  return process.env.CRYPTOMUS_MERCHANT_ID?.trim() || undefined;
}

export function getCryptomusPaymentKey(): string | undefined {
  return process.env.CRYPTOMUS_PAYMENT_KEY?.trim() || undefined;
}

export function isCryptomusConfigured(): boolean {
  return Boolean(getCryptomusMerchant() && getCryptomusPaymentKey());
}

function signBody(bodyJson: string, apiKey: string): string {
  const encoded = Buffer.from(bodyJson).toString("base64");
  return createHash("md5").update(encoded + apiKey).digest("hex");
}

export function verifyCryptomusSign(
  bodyJson: string,
  sign: string | null | undefined
): boolean {
  const key = getCryptomusPaymentKey();
  if (!key || !sign) return false;
  const expected = signBody(bodyJson, key);
  return expected === sign.toLowerCase() || expected === sign;
}

export type CryptomusInvoice = {
  uuid: string;
  order_id: string;
  amount: string;
  currency: string;
  url: string;
  payment_status?: string;
  network?: string;
  address?: string;
};

/** Invoice in RUB → pay in selected crypto (to_currency + network). */
export async function createCryptomusInvoice(input: {
  amountRub: number;
  orderId: string;
  userId: string;
  asset?: CryptoAsset | null;
}): Promise<CryptomusInvoice> {
  const merchant = getCryptomusMerchant();
  const apiKey = getCryptomusPaymentKey();
  if (!merchant || !apiKey) {
    throw new Error("Крипто-оплата не настроена");
  }

  const appUrl = getAppUrl();
  const payload: Record<string, string | number | boolean> = {
    amount: String(input.amountRub),
    currency: "RUB",
    order_id: input.orderId,
    url_return: `${appUrl}/plan/billing?billing=return`,
    url_success: `${appUrl}/plan/billing?billing=crypto_ok`,
    url_callback: `${appUrl}/api/billing/crypto/webhook`,
    is_payment_multiple: false,
    lifetime: 3600,
    additional_data: input.userId,
  };

  if (input.asset) {
    payload.to_currency = input.asset.toCurrency;
    payload.network = input.asset.network;
  }

  const bodyJson = JSON.stringify(payload);
  const res = await fetch("https://api.cryptomus.com/v1/payment", {
    method: "POST",
    headers: {
      merchant,
      sign: signBody(bodyJson, apiKey),
      "Content-Type": "application/json",
    },
    body: bodyJson,
  });

  const data = (await res.json()) as {
    result?: CryptomusInvoice;
    message?: string | string[];
    errors?: unknown;
  };

  if (!res.ok || !data.result?.url || !data.result?.uuid) {
    const msg = Array.isArray(data.message)
      ? data.message.join(", ")
      : data.message || `Cryptomus ошибка ${res.status}`;
    throw new Error(msg);
  }

  return data.result;
}

export function newCryptoOrderId(): string {
  return `smm-${randomUUID()}`;
}
