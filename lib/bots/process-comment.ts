import { generateAiCommentReply } from "@/lib/bots/ai-reply";
import { matchFaqAnswer } from "@/lib/bots/faq";
import { allowBotReply } from "@/lib/bots/rate-limit";
import {
  isBotReady,
  type BotChannel,
  type BotReplyMode,
  type CommentBot,
} from "@/lib/bots/types";
import { botReplyPriceRuntime } from "@/lib/billing/runtime-pricing";
import type { BrandBrief } from "@/lib/marketer/types";
import {
  appendBotReplyLog,
  chargeUserFixed,
  creditUserBalance,
  type Project,
} from "@/lib/store/projects";

export async function buildCommentReplyText(input: {
  bot: CommentBot;
  brief: BrandBrief;
  comment: string;
  postText?: string;
}): Promise<{ text: string; mode: BotReplyMode } | { skip: true; reason: string }> {
  const mode = input.bot.mode === "ai" ? "ai" : "faq";
  const comment = input.comment.trim();
  if (!comment) return { skip: true, reason: "empty" };

  if (mode === "faq") {
    const hit = matchFaqAnswer(comment, input.bot.faq ?? []);
    if (!hit) return { skip: true, reason: "no_faq_match" };
    return { text: hit, mode };
  }

  const text = await generateAiCommentReply({
    brief: input.brief,
    comment,
    postText: input.postText,
    faq: input.bot.faq ?? [],
  });
  if (!text.trim()) return { skip: true, reason: "empty_ai" };
  return { text: text.trim(), mode };
}

export async function chargeAndSendBotReply(input: {
  project: Project;
  channel: BotChannel;
  bot: CommentBot;
  commentId: string;
  commentText: string;
  postText?: string;
  send: (replyText: string) => Promise<{ ok: boolean; error?: string }>;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const { project, channel, bot } = input;
  if (!isBotReady(bot)) {
    return { ok: false, skipped: true, error: "bot_inactive" };
  }
  if (!allowBotReply(project.id)) {
    return { ok: false, skipped: true, error: "rate_limit" };
  }

  let built: Awaited<ReturnType<typeof buildCommentReplyText>>;
  try {
    built = await buildCommentReplyText({
      bot,
      brief: project.brief,
      comment: input.commentText,
      postText: input.postText,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "reply_build_failed";
    appendBotReplyLog(project.id, {
      channel,
      mode: bot.mode,
      commentId: input.commentId,
      commentPreview: input.commentText.slice(0, 120),
      replyPreview: "",
      chargedRub: 0,
      ok: false,
      error: message,
    });
    return { ok: false, error: message };
  }

  if ("skip" in built) {
    appendBotReplyLog(project.id, {
      channel,
      mode: bot.mode,
      commentId: input.commentId,
      commentPreview: input.commentText.slice(0, 120),
      replyPreview: "",
      chargedRub: 0,
      ok: false,
      error:
        built.reason === "no_faq_match"
          ? "Нет совпадения в FAQ — добавьте пару или включите ИИ"
          : built.reason,
    });
    return { ok: true, skipped: true, error: built.reason };
  }

  const price = botReplyPriceRuntime(built.mode);
  const charge = chargeUserFixed({
    userId: project.userId,
    amountRub: price,
    projectId: project.id,
    description:
      built.mode === "ai"
        ? `Бот ${channel}: ответ ИИ · ${price} ₽`
        : `Бот ${channel}: ответ FAQ · ${price} ₽`,
  });

  if (!charge.ok) {
    appendBotReplyLog(project.id, {
      channel,
      mode: built.mode,
      commentId: input.commentId,
      commentPreview: input.commentText.slice(0, 120),
      replyPreview: "",
      chargedRub: 0,
      ok: false,
      error: charge.error,
    });
    return { ok: false, error: charge.error };
  }

  const sent = await input.send(built.text);
  if (!sent.ok) {
    if (charge.chargedRub > 0) {
      creditUserBalance({
        userId: project.userId,
        amountRub: charge.chargedRub,
        description: `Возврат: бот ${channel} не отправил ответ`,
        yooPaymentId: `refund-bot-${project.id}-${Date.now()}`,
      });
    }
    appendBotReplyLog(project.id, {
      channel,
      mode: built.mode,
      commentId: input.commentId,
      commentPreview: input.commentText.slice(0, 120),
      replyPreview: built.text.slice(0, 160),
      chargedRub: 0,
      ok: false,
      error: sent.error || "send_failed",
    });
    return { ok: false, error: sent.error || "send_failed" };
  }

  appendBotReplyLog(project.id, {
    channel,
    mode: built.mode,
    commentId: input.commentId,
    commentPreview: input.commentText.slice(0, 120),
    replyPreview: built.text.slice(0, 160),
    chargedRub: charge.chargedRub,
    ok: true,
  });

  return { ok: true };
}
