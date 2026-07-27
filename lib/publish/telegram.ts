import { readFileSync } from "node:fs";
import type { PostDraft } from "@/lib/smm/types";
import { resolveMediaAbsolutePath } from "@/lib/media/store";
import { plainSocialText } from "@/lib/text/plain-social";

export type TelegramCreds = {
  botToken: string;
  chatId: string;
};

function captionFor(draft: PostDraft): string {
  const hashtags =
    draft.hashtags.length > 0
      ? "\n\n" +
        draft.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")
      : "";
  return plainSocialText(`${draft.body}${hashtags}`).slice(0, 1024);
}

function textFor(draft: PostDraft): string {
  const hashtags =
    draft.hashtags.length > 0
      ? "\n\n" +
        draft.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")
      : "";
  return plainSocialText(`${draft.body}${hashtags}`).slice(0, 4000);
}

export async function publishToTelegram(
  draft: PostDraft,
  creds: TelegramCreds
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const token = creds.botToken?.trim();
  const chatId = creds.chatId?.trim();

  if (!token || !chatId) {
    return {
      ok: false,
      error: "Подключите Telegram в настройках проекта (bot token + chat id)",
    };
  }

  if (draft.channel !== "telegram") {
    return { ok: false, error: "Этот пост не для Telegram" };
  }

  try {
    if (draft.imagePath) {
      const absolute = resolveMediaAbsolutePath(draft.imagePath);
      if (absolute) {
        const bytes = readFileSync(absolute);
        const form = new FormData();
        form.append("chat_id", chatId);
        form.append("caption", captionFor(draft));
        form.append(
          "photo",
          new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }),
          "post.jpg"
        );

        const res = await fetch(
          `https://api.telegram.org/bot${token}/sendPhoto`,
          { method: "POST", body: form }
        );
        const data = (await res.json()) as {
          ok?: boolean;
          description?: string;
          result?: { message_id?: number };
        };
        if (!data.ok) {
          return { ok: false, error: data.description || "Telegram API error" };
        }
        return {
          ok: true,
          messageId: String(data.result?.message_id ?? ""),
        };
      }
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: textFor(draft),
        disable_web_page_preview: false,
      }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      description?: string;
      result?: { message_id?: number };
    };

    if (!data.ok) {
      return { ok: false, error: data.description || "Telegram API error" };
    }

    return {
      ok: true,
      messageId: String(data.result?.message_id ?? ""),
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Ошибка публикации",
    };
  }
}
