import { getAppUrl } from "@/lib/meta/config";

export async function setTelegramWebhook(input: {
  botToken: string;
  secret: string;
}): Promise<{ ok: boolean; error?: string }> {
  const url = `${getAppUrl()}/api/telegram/webhook/${input.secret}`;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${input.botToken}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          allowed_updates: ["message"],
          drop_pending_updates: false,
        }),
      }
    );
    const data = (await res.json()) as { ok?: boolean; description?: string };
    if (!data.ok) {
      return { ok: false, error: data.description || "setWebhook failed" };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Telegram network error",
    };
  }
}

export async function replyTelegramComment(input: {
  botToken: string;
  chatId: string;
  replyToMessageId: number;
  text: string;
}): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${input.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: input.chatId,
          text: input.text.slice(0, 3900),
          reply_to_message_id: input.replyToMessageId,
          allow_sending_without_reply: true,
        }),
      }
    );
    const data = (await res.json()) as {
      ok?: boolean;
      result?: { message_id?: number };
      description?: string;
    };
    if (!data.ok) {
      return { ok: false, error: data.description || "sendMessage failed" };
    }
    return { ok: true, messageId: data.result?.message_id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Telegram network error",
    };
  }
}
