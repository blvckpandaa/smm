import { requireSession } from "@/lib/auth/request";
import { getAppUrl } from "@/lib/meta/config";
import { setTelegramWebhook } from "@/lib/bots/telegram-reply";
import {
  getCommentBot,
  getProjectForUser,
  newBotSecrets,
  setCommentBot,
  toPublicProject,
  type BotChannel,
  type BotReplyMode,
  type FaqItem,
} from "@/lib/store/projects";

type Ctx = { params: Promise<{ id: string }> };

/** Обновить настройки бота (режим, FAQ, вкл/выкл, discussionChatId) */
export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const project = getProjectForUser(id, auth.session.userId);
  if (!project) {
    return Response.json({ error: "Проект не найден" }, { status: 404 });
  }

  try {
    const body = (await req.json()) as {
      channel?: BotChannel;
      enabled?: boolean;
      mode?: BotReplyMode;
      faq?: FaqItem[];
      discussionChatId?: string;
      vkConfirmation?: string;
      vkSecret?: string;
      refreshVkSecrets?: boolean;
      refreshTelegramWebhook?: boolean;
    };

    const channel = body.channel;
    if (channel !== "vk" && channel !== "telegram") {
      return Response.json({ error: "channel: vk | telegram" }, { status: 400 });
    }

    const current = getCommentBot(project, channel);
    const secrets = newBotSecrets();
    let next = { ...current };

    if (typeof body.enabled === "boolean") next.enabled = body.enabled;
    if (body.mode === "faq" || body.mode === "ai") next.mode = body.mode;
    if (Array.isArray(body.faq)) {
      next.faq = body.faq
        .slice(0, 30)
        .map((f) => ({
          q: String(f.q ?? "").trim().slice(0, 300),
          a: String(f.a ?? "").trim().slice(0, 1000),
        }))
        .filter((f) => f.q && f.a);
    }
    if (typeof body.discussionChatId === "string") {
      next.discussionChatId = body.discussionChatId.trim() || undefined;
    }

    if (channel === "vk") {
      if (typeof body.vkConfirmation === "string") {
        const c = body.vkConfirmation.trim().slice(0, 64);
        if (c) next.vkConfirmation = c;
      }
      if (typeof body.vkSecret === "string") {
        next.vkSecret = body.vkSecret.trim().slice(0, 128) || undefined;
      }
      if (body.refreshVkSecrets) {
        next.vkConfirmation = secrets.vkConfirmation;
        next.vkSecret = secrets.vkSecret;
      } else if (!next.vkConfirmation) {
        next.vkConfirmation = secrets.vkConfirmation;
        if (!next.vkSecret) next.vkSecret = secrets.vkSecret;
      }
    }

    if (channel === "telegram") {
      if (!next.webhookSecret) next.webhookSecret = secrets.webhookSecret;
      if (
        body.refreshTelegramWebhook &&
        project.channels.telegram &&
        next.webhookSecret
      ) {
        const hook = await setTelegramWebhook({
          botToken: project.channels.telegram.botToken,
          secret: next.webhookSecret,
        });
        if (!hook.ok) {
          return Response.json(
            { error: hook.error || "setWebhook failed" },
            { status: 502 }
          );
        }
      }
    }

    setCommentBot(id, auth.session.userId, channel, next);
    const updated = getProjectForUser(id, auth.session.userId);

    return Response.json({
      ok: true,
      project: updated ? toPublicProject(updated) : null,
      callbackUrl:
        channel === "vk" ? `${getAppUrl()}/api/vk/comments/webhook` : undefined,
      confirmation: channel === "vk" ? next.vkConfirmation : undefined,
      secret: channel === "vk" ? next.vkSecret : undefined,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка настроек бота";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const project = getProjectForUser(id, auth.session.userId);
  if (!project) {
    return Response.json({ error: "Проект не найден" }, { status: 404 });
  }
  return Response.json({
    project: toPublicProject(project),
    callbackUrl: `${getAppUrl()}/api/vk/comments/webhook`,
    vk: {
      confirmation: project.bots?.vk?.vkConfirmation,
      secret: project.bots?.vk?.vkSecret,
    },
  });
}
