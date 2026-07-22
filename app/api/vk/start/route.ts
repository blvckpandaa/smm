import { requireSession } from "@/lib/auth/request";
import { getAppUrl } from "@/lib/meta/config";
import {
  getProjectForUser,
  savePendingVkAuth,
  savePendingVkUserFlow,
} from "@/lib/store/projects";
import {
  buildVkLegacyUserAuthUrl,
  getVkOAuthAppId,
  hasDedicatedVkOAuthApp,
  useVkStub,
} from "@/lib/vk/config";

/** Автоподключение VK: oauth.vk.com → выбор сообщества → токен сообщества. */
export async function GET(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId")?.trim();
  if (!projectId) {
    return Response.redirect(
      `${getAppUrl()}/plan?vk_error=${encodeURIComponent("Нет projectId")}`
    );
  }

  const project = getProjectForUser(projectId, auth.session.userId);
  if (!project) {
    return Response.redirect(
      `${getAppUrl()}/plan?vk_error=${encodeURIComponent("Проект не найден")}`
    );
  }

  if (useVkStub()) {
    savePendingVkAuth({
      projectId,
      userId: auth.session.userId,
      accessToken: "vk-stub-token",
      vkUserId: 0,
      isStub: true,
    });
    return Response.redirect(
      `${getAppUrl()}/plan?vk_pick=1&vk_stub=1&projectId=${encodeURIComponent(projectId)}&step=channels`
    );
  }

  if (!getVkOAuthAppId()) {
    return Response.redirect(
      `${getAppUrl()}/plan?vk_error=${encodeURIComponent(
        "VK не настроен на сервере"
      )}`
    );
  }

  const groupId = url.searchParams.get("groupId")?.trim()?.replace(/^-/, "");
  if (groupId) {
    return Response.redirect(
      `${getAppUrl()}/api/vk/start-community?projectId=${encodeURIComponent(projectId)}&groupId=${encodeURIComponent(groupId)}`
    );
  }

  if (!hasDedicatedVkOAuthApp()) {
    return Response.redirect(
      `${getAppUrl()}/plan?step=channels&vk_error=${encodeURIComponent(
        "Укажите ссылку или ID сообщества VK в поле ниже"
      )}`
    );
  }

  const flow = savePendingVkUserFlow({
    projectId,
    userId: auth.session.userId,
  });

  return Response.redirect(buildVkLegacyUserAuthUrl({ state: flow.state }));
}
