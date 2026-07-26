import {
  BOT_AI_REPLY_RUB,
  BOT_FAQ_REPLY_RUB,
  BOT_PERIOD_DAYS,
  BOT_TG_PERIOD_RUB,
  BOT_VK_PERIOD_RUB,
  NEW_USER_BONUS_RUB,
  POST_PRICE_RUB,
  REGENERATE_IMAGE_PRICE_RUB,
  REWRITE_TEXT_PRICE_RUB,
  TOPUP_PRESETS_RUB,
} from "@/lib/billing/pricing";
import { getSettings, type StoreSettings } from "@/lib/store/projects";

export type RuntimePricing = {
  newUserBonusRub: number;
  referralPercent: number;
  postPriceRub: number;
  rewritePriceRub: number;
  imagePriceRub: number;
  botVkPeriodRub: number;
  botTgPeriodRub: number;
  botAiReplyRub: number;
  botFaqReplyRub: number;
  botPeriodDays: number;
  topupPresetsRub: number[];
};

export function defaultStoreSettings(): StoreSettings {
  return {
    newUserBonusRub: NEW_USER_BONUS_RUB,
    referralPercent: 10,
    postPriceRub: POST_PRICE_RUB,
    rewritePriceRub: REWRITE_TEXT_PRICE_RUB,
    imagePriceRub: REGENERATE_IMAGE_PRICE_RUB,
    botVkPeriodRub: BOT_VK_PERIOD_RUB,
    botTgPeriodRub: BOT_TG_PERIOD_RUB,
    botAiReplyRub: BOT_AI_REPLY_RUB,
    botFaqReplyRub: BOT_FAQ_REPLY_RUB,
    botPeriodDays: BOT_PERIOD_DAYS,
    topupPresetsRub: [...TOPUP_PRESETS_RUB],
  };
}

export function getRuntimePricing(): RuntimePricing {
  const s = getSettings();
  return {
    newUserBonusRub: s.newUserBonusRub,
    referralPercent: s.referralPercent,
    postPriceRub: s.postPriceRub,
    rewritePriceRub: s.rewritePriceRub,
    imagePriceRub: s.imagePriceRub,
    botVkPeriodRub: s.botVkPeriodRub,
    botTgPeriodRub: s.botTgPeriodRub,
    botAiReplyRub: s.botAiReplyRub,
    botFaqReplyRub: s.botFaqReplyRub,
    botPeriodDays: s.botPeriodDays,
    topupPresetsRub: s.topupPresetsRub,
  };
}

export function costForPostsRuntime(count: number): number {
  const n = Math.max(0, Math.floor(count));
  return n * getRuntimePricing().postPriceRub;
}

export function botPeriodPriceRuntime(channel: "vk" | "telegram"): number {
  const p = getRuntimePricing();
  return channel === "vk" ? p.botVkPeriodRub : p.botTgPeriodRub;
}

export function botReplyPriceRuntime(mode: "faq" | "ai"): number {
  const p = getRuntimePricing();
  return mode === "ai" ? p.botAiReplyRub : p.botFaqReplyRub;
}
