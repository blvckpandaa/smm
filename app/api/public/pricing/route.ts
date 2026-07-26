import { getRuntimePricing } from "@/lib/billing/runtime-pricing";

/** Публичные цены/бонусы для лендинга и регистрации (без секретов). */
export async function GET() {
  const p = getRuntimePricing();
  return Response.json({
    newUserBonusRub: p.newUserBonusRub,
    referralPercent: p.referralPercent,
    postPriceRub: p.postPriceRub,
  });
}
