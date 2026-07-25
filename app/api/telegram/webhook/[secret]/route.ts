import { chargeAndSendBotReply } from "@/lib/bots/process-comment";
import { replyTelegramComment } from "@/lib/bots/telegram-reply";
import { isBotReady } from "@/lib/bots/types";
import {
  findProjectByTelegramWebhookSecret,
  getCommentBot,
} from "@/lib/store/projects";

type Ctx = { params: Promise<{ secret: string }> };

type TgUpdate = {
  message?: {
    message_id: number;
    chat: { id: number; type?: string };
    text?: string;
    from?: { id: number; is_bot?: boolean };
    reply_to_message?: {
      message_id: number;
      text?: string;
      caption?: string;
    };
  };
};

function sameChatId(a: string | number, b: string): boolean {
  return String(a).trim() === b.trim();
}

/** Webhook Telegram для ответов в группе обсуждений канала */
export async function POST(req: Request, ctx: Ctx) {
  const { secret } = await ctx.params;
  const project = findProjectByTelegramWebhookSecret(secret);
  if (!project) return Response.json({ ok: true });

  const bot = getCommentBot(project, "telegram");
  if (!isBotReady(bot)) return Response.json({ ok: true });

  const tg = project.channels.telegram;
  if (!tg?.botToken) return Response.json({ ok: true });

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return Response.json({ ok: true });
  }

  const msg = update.message;
  if (!msg?.text?.trim() || !msg.from || msg.from.is_bot) {
    return Response.json({ ok: true });
  }
  if (!msg.reply_to_message) {
    return Response.json({ ok: true });
  }

  const discussionId = bot.discussionChatId?.trim();
  if (discussionId && !sameChatId(msg.chat.id, discussionId)) {
    return Response.json({ ok: true });
  }

  const postText =
    msg.reply_to_message.text || msg.reply_to_message.caption || "";

  const commentId = `${msg.chat.id}:${msg.message_id}`;
  if (
    (project.botReplies ?? []).some(
      (r) => r.channel === "telegram" && r.commentId === commentId && r.ok
    )
  ) {
    return Response.json({ ok: true });
  }

  // Telegram tolerates slower handlers; still dedupe retries
  await chargeAndSendBotReply({
    project,
    channel: "telegram",
    bot,
    commentId,
    commentText: msg.text,
    postText,
    send: async (replyText) =>
      replyTelegramComment({
        botToken: tg.botToken,
        chatId: String(msg.chat.id),
        replyToMessageId: msg.message_id,
        text: replyText,
      }),
  });

  return Response.json({ ok: true });
}
