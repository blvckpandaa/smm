import { requireSession } from "@/lib/auth/request";
import {
  BOT_PERIOD_DAYS,
  botPeriodPrice,
} from "@/lib/billing/pricing";
import { getAppUrl } from "@/lib/meta/config";
import { setTelegramWebhook } from "@/lib/bots/telegram-reply";
import {
  chargeUserFixed,
  extendBotPaidUntil,
  getCommentBot,
  getProjectForUser,
  getUserById,
  newBotSecrets,
  setCommentBot,
  toPublicProject,
  type BotChannel,
} from "@/lib/store/projects";

type Ctx = { params: Promise<{ id: string }> };

/** Активировать / продлить бота комментариев на 30 дней */
export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const project = getProjectForUser(id, auth.session.userId);
  if (!project) {
    return Response.json({ error: "Проект не найден" }, { status: 404 });
  }

  try {
    const body = (await req.json()) as { channel?: BotChannel };
    const channel = body.channel;
    if (channel !== "vk" && channel !== "telegram") {
      return Response.json({ error: "channel: vk | telegram" }, { status: 400 });
    }

    if (channel === "vk" && !project.channels.vk) {
      return Response.json(
        { error: "Сначала подключите VK в разделе Каналы" },
        { status: 400 }
      );
    }
    if (channel === "telegram" && !project.channels.telegram) {
      return Response.json(
        { error: "Сначала подключите Telegram в разделе Каналы" },
        { status: 400 }
      );
    }

    const price = botPeriodPrice(channel);
    const charge = chargeUserFixed({
      userId: auth.session.userId,
      amountRub: price,
      projectId: id,
      description: `Бот ${channel}: активация ${BOT_PERIOD_DAYS} дн. · ${price} ₽`,
    });
    if (!charge.ok) {
      return Response.json(
        {
          error: charge.error,
          balanceRub: charge.balanceRub,
          needRub: charge.needRub,
        },
        { status: 402 }
      );
    }

    const current = getCommentBot(project, channel);
    const secrets = newBotSecrets();
    const paidUntil = extendBotPaidUntil(current.paidUntil, BOT_PERIOD_DAYS);

    const next = {
      ...current,
      enabled: true,
      paidUntil,
      vkConfirmation:
        channel === "vk"
          ? current.vkConfirmation || secrets.vkConfirmation
          : current.vkConfirmation,
      vkSecret:
        channel === "vk" ? current.vkSecret || secrets.vkSecret : current.vkSecret,
      webhookSecret:
        channel === "telegram"
          ? current.webhookSecret || secrets.webhookSecret
          : current.webhookSecret,
    };

    if (channel === "telegram" && project.channels.telegram && next.webhookSecret) {
      const hook = await setTelegramWebhook({
        botToken: project.channels.telegram.botToken,
        secret: next.webhookSecret,
      });
      if (!hook.ok) {
        // период уже оплачен — оставляем бота, но сообщаем про webhook
        setCommentBot(id, auth.session.userId, channel, next);
        const updated = getProjectForUser(id, auth.session.userId);
        const user = getUserById(auth.session.userId);
        return Response.json({
          ok: true,
          warning: hook.error || "Не удалось setWebhook — проверьте токен бота",
          project: updated ? toPublicProject(updated) : null,
          billing: {
            chargedRub: charge.chargedRub,
            balanceRub: user?.balanceRub ?? charge.balanceRub,
          },
        });
      }
    }

    setCommentBot(id, auth.session.userId, channel, next);
    const updated = getProjectForUser(id, auth.session.userId);
    const user = getUserById(auth.session.userId);

    return Response.json({
      ok: true,
      project: updated ? toPublicProject(updated) : null,
      billing: {
        chargedRub: charge.chargedRub,
        balanceRub: user?.balanceRub ?? charge.balanceRub,
      },
      callbackUrl:
        channel === "vk" ? `${getAppUrl()}/api/vk/comments/webhook` : undefined,
      confirmation: channel === "vk" ? next.vkConfirmation : undefined,
      secret: channel === "vk" ? next.vkSecret : undefined,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка активации бота";
    return Response.json({ error: message }, { status: 500 });
  }
}
