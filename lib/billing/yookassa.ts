import { randomUUID } from "node:crypto";
import { getAppUrl } from "@/lib/meta/config";

export function getYooShopId(): string | undefined {
  return process.env.YOOKASSA_SHOP_ID?.trim() || undefined;
}

export function getYooSecretKey(): string | undefined {
  return process.env.YOOKASSA_SECRET_KEY?.trim() || undefined;
}

export function isYooKassaConfigured(): boolean {
  return Boolean(getYooShopId() && getYooSecretKey());
}

type YooAmount = { value: string; currency: string };

export type YooPayment = {
  id: string;
  status: string;
  paid?: boolean;
  amount: YooAmount;
  confirmation?: { type?: string; confirmation_url?: string };
  metadata?: Record<string, string>;
  description?: string;
};

function authHeader(): string {
  const id = getYooShopId();
  const secret = getYooSecretKey();
  if (!id || !secret) throw new Error("ЮKassa не настроена");
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

export async function createYooPayment(input: {
  amountRub: number;
  description: string;
  returnUrl: string;
  metadata: Record<string, string>;
}): Promise<YooPayment> {
  const value = input.amountRub.toFixed(2);
  const res = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      "Idempotence-Key": randomUUID(),
    },
    body: JSON.stringify({
      amount: { value, currency: "RUB" },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: input.returnUrl,
      },
      description: input.description.slice(0, 128),
      metadata: input.metadata,
    }),
  });

  const data = (await res.json()) as YooPayment & {
    type?: string;
    description?: string;
    code?: string;
  };

  if (!res.ok) {
    throw new Error(
      data.description || `ЮKassa ошибка ${res.status}`
    );
  }
  return data;
}

export async function getYooPayment(paymentId: string): Promise<YooPayment> {
  const res = await fetch(
    `https://api.yookassa.ru/v3/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: { Authorization: authHeader() },
    }
  );
  const data = (await res.json()) as YooPayment & { description?: string };
  if (!res.ok) {
    throw new Error(data.description || `ЮKassa get error ${res.status}`);
  }
  return data;
}

export function billingReturnUrl(): string {
  return `${getAppUrl()}/plan?billing=return`;
}
