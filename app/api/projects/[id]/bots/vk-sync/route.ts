import { requireSession } from "@/lib/auth/request";
import { getAppUrl } from "@/lib/meta/config";
import {
  ensureVkCallbackServer,
  resolveVkCallbackConfirmation,
} from "@/lib/bots/vk-callback-setup";
import {
  getCommentBot,
  getProjectForUser,
  newBotSecrets,
  setCommentBot,
  toPublicProject,
} from "@/lib/store/projects";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Подтянуть confirmation у VK и по возможности создать Callback-сервер.
 * Строку подтверждения пользователь не вводит — её отдаёт VK API.
 */
export async function POST(_req: Request, ctx: Ctx) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const project = getProjectForUser(id, auth.session.userId);
  if (!project) {
    return Response.json({ error: "Проект не найден" }, { status: 404 });
  }
  if (!project.channels.vk) {
    return Response.json(
      { error: "Сначала подключите VK в разделе Каналы" },
      { status: 400 }
    );
  }

  const vk = project.channels.vk;
  const current = getCommentBot(project, "vk");
  const secrets = newBotSecrets();
  const secret = current.vkSecret || secrets.vkSecret;

  const conf = await resolveVkCallbackConfirmation({
    groupId: vk.groupId,
    communityToken: vk.accessToken,
    userToken: vk.userAccessToken,
  });

  if (!conf.ok) {
    return Response.json(
      {
        error: `Не удалось получить строку подтверждения у VK: ${conf.error}. Нужен токен сообщества с правами управления или токен админа.`,
        callbackUrl: `${getAppUrl()}/api/vk/comments/webhook`,
      },
      { status: 502 }
    );
  }

  let next = {
    ...current,
    vkConfirmation: conf.code,
    vkSecret: secret,
  };

  const tokenForServer = vk.userAccessToken || vk.accessToken;
  const server = await ensureVkCallbackServer({
    accessToken: tokenForServer,
    groupId: vk.groupId,
    secret,
  });

  setCommentBot(id, auth.session.userId, "vk", next);
  const updated = getProjectForUser(id, auth.session.userId);

  return Response.json({
    ok: true,
    confirmation: conf.code,
    secret,
    callbackUrl: `${getAppUrl()}/api/vk/comments/webhook`,
    serverOk: server.ok,
    serverId: server.serverId,
    serverWarning: server.ok
      ? undefined
      : server.error ||
        "Сервер в VK не создался автоматически — добавьте URL вручную, затем нажмите «Подтвердить». Строку confirmation webhook уже знает.",
    project: updated ? toPublicProject(updated) : null,
  });
}
