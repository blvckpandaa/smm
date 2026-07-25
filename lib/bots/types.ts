export type BotReplyMode = "faq" | "ai";

export type BotChannel = "vk" | "telegram";

export type FaqItem = { q: string; a: string };

export type CommentBot = {
  enabled: boolean;
  mode: BotReplyMode;
  paidUntil: string | null;
  faq: FaqItem[];
  /** Telegram: id группы обсуждений канала */
  discussionChatId?: string;
  /** VK Callback API confirmation string */
  vkConfirmation?: string;
  /** VK Callback secret */
  vkSecret?: string;
  /** Telegram webhook path secret */
  webhookSecret?: string;
  /** Последний входящий Callback/webhook (диагностика) */
  lastWebhookAt?: string;
  lastWebhookType?: string;
  lastWebhookNote?: string;
};

export type ProjectBots = {
  vk?: CommentBot;
  telegram?: CommentBot;
};

export type BotReplyLog = {
  id: string;
  channel: BotChannel;
  mode: BotReplyMode;
  commentId: string;
  commentPreview: string;
  replyPreview: string;
  chargedRub: number;
  createdAt: string;
  ok: boolean;
  error?: string;
};

export function defaultCommentBot(): CommentBot {
  return {
    enabled: false,
    mode: "faq",
    paidUntil: null,
    faq: [],
  };
}

export function isBotPaidActive(bot: CommentBot | undefined | null): boolean {
  if (!bot?.paidUntil) return false;
  const t = Date.parse(bot.paidUntil);
  return Number.isFinite(t) && t > Date.now();
}

export function isBotReady(bot: CommentBot | undefined | null): boolean {
  return Boolean(bot?.enabled && isBotPaidActive(bot));
}

export function toPublicCommentBot(bot: CommentBot | undefined) {
  if (!bot) {
    return {
      enabled: false,
      mode: "faq" as BotReplyMode,
      paidUntil: null as string | null,
      faq: [] as FaqItem[],
      discussionChatId: undefined as string | undefined,
      hasVkCallback: false,
      paidActive: false,
    };
  }
  return {
    enabled: bot.enabled,
    mode: bot.mode,
    paidUntil: bot.paidUntil,
    faq: bot.faq ?? [],
    discussionChatId: bot.discussionChatId,
    hasVkCallback: Boolean(bot.vkConfirmation && bot.vkSecret),
    paidActive: isBotPaidActive(bot),
    lastWebhookAt: bot.lastWebhookAt ?? null,
    lastWebhookType: bot.lastWebhookType ?? null,
    lastWebhookNote: bot.lastWebhookNote ?? null,
  };
}
