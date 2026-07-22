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

function getVatCode(): number {
  const raw = process.env.YOOKASSA_VAT_CODE?.trim();
  const n = raw ? Number(raw) : 1;
  return Number.isFinite(n) && n >= 1 && n <= 12 ? n : 1;
}

function getTaxSystemCode(): number | undefined {
  const raw = process.env.YOOKASSA_TAX_SYSTEM_CODE?.trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 && n <= 6 ? n : undefined;
}

export async function createYooPayment(input: {
  amountRub: number;
  description: string;
  returnUrl: string;
  metadata: Record<string, string>;
  /** Email покупателя для фискального чека (54-ФЗ) */
  customerEmail: string;
}): Promise<YooPayment> {
  const value = input.amountRub.toFixed(2);
  const email = input.customerEmail.trim().toLowerCase();
  if (!email.includes("@")) {
    throw new Error("Для оплаты нужен корректный email в профиле");
  }

  const receipt: Record<string, unknown> = {
    customer: { email },
    items: [
      {
        description: input.description.slice(0, 128),
        quantity: "1.00",
        amount: { value, currency: "RUB" },
        vat_code: getVatCode(),
        payment_mode: "full_payment",
        payment_subject: "service",
      },
    ],
  };
  const taxSystem = getTaxSystemCode();
  if (taxSystem != null) receipt.tax_system_code = taxSystem;

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
      receipt,
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
