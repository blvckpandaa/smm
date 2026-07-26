import { requireSession } from "@/lib/auth/request";
import { isCryptomusConfigured } from "@/lib/billing/cryptomus";
import { CRYPTO_ASSETS } from "@/lib/billing/crypto-assets";
import { getRuntimePricing } from "@/lib/billing/runtime-pricing";
import { isYooKassaConfigured } from "@/lib/billing/yookassa";
import { getAppUrl } from "@/lib/meta/config";
import {
  getMyReferralStats,
  getUserById,
  listLedgerForUser,
} from "@/lib/store/projects";

/** Баланс и история платежей текущего пользователя */
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const user = getUserById(auth.session.userId);
  if (!user) {
    return Response.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const pricing = getRuntimePricing();
  const ledger = listLedgerForUser(auth.session.userId, 40);
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let spentMonthRub = 0;
  let topupMonthRub = 0;
  for (const row of ledger) {
    if (!row.createdAt.startsWith(monthPrefix)) continue;
    if (row.amountRub < 0) spentMonthRub += Math.abs(row.amountRub);
    if (row.amountRub > 0) topupMonthRub += row.amountRub;
  }

  const daysWithUs = Math.max(
    1,
    Math.ceil(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  const referral = getMyReferralStats(auth.session.userId);
  const appUrl = getAppUrl().replace(/\/$/, "");

  return Response.json({
    balanceRub: user.balanceRub,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      daysWithUs,
      referralCode: user.referralCode,
    },
    postPriceRub: pricing.postPriceRub,
    rewritePriceRub: pricing.rewritePriceRub,
    imagePriceRub: pricing.imagePriceRub,
    botVkPeriodRub: pricing.botVkPeriodRub,
    botTgPeriodRub: pricing.botTgPeriodRub,
    botFaqReplyRub: pricing.botFaqReplyRub,
    botAiReplyRub: pricing.botAiReplyRub,
    botPeriodDays: pricing.botPeriodDays,
    topupPresets: pricing.topupPresetsRub,
    newUserBonusRub: pricing.newUserBonusRub,
    referralPercent: pricing.referralPercent,
    spentMonthRub,
    topupMonthRub,
    yookassaConfigured: isYooKassaConfigured(),
    cryptoConfigured: isCryptomusConfigured(),
    cryptoAssets: CRYPTO_ASSETS.map((a) => ({
      id: a.id,
      symbol: a.symbol,
      label: a.label,
      labelEn: a.labelEn,
      network: a.network,
      networkLabel: a.networkLabel,
      wallets: a.wallets,
    })),
    referral: {
      ...referral,
      inviteUrl: referral.referralCode
        ? `${appUrl}/register?ref=${encodeURIComponent(referral.referralCode)}`
        : "",
    },
    ledger,
  });
}
