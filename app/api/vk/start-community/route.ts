import { requireSession } from "@/lib/auth/request";
import { getAppUrl } from "@/lib/meta/config";
import {
  getProjectForUser,
  savePendingVkCommunityFlow,
} from "@/lib/store/projects";
import {
  buildVkCommunityAuthUrl,
  getVkOAuthAppId,
  hasDedicatedVkOAuthApp,
  useVkStub,
} from "@/lib/vk/config";

/** Старт OAuth токена сообщества: ?projectId=&groupId= */
export async function GET(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId")?.trim();
  const groupId = url.searchParams.get("groupId")?.trim()?.replace(/^-/, "");

  if (!projectId || !groupId) {
    return Response.redirect(
      `${getAppUrl()}/plan?vk_error=${encodeURIComponent("Укажите ID сообщества VK")}`
    );
  }

  if (!getProjectForUser(projectId, auth.session.userId)) {
    return Response.redirect(
      `${getAppUrl()}/plan?vk_error=${encodeURIComponent("Проект не найден")}`
    );
  }

  if (useVkStub()) {
    return Response.redirect(
      `${getAppUrl()}/plan?vk_pick=1&vk_stub=1&projectId=${encodeURIComponent(projectId)}&step=channels`
    );
  }

  if (!getVkOAuthAppId()) {
    return Response.redirect(
      `${getAppUrl()}/plan?vk_error=${encodeURIComponent("VK не настроен")}`
    );
  }

  if (!hasDedicatedVkOAuthApp()) {
    return Response.redirect(
      `${getAppUrl()}/plan?step=channels&vk_error=${encodeURIComponent(
        "OAuth VK ID не умеет публиковать на стену. Создайте ключ в настройках сообщества (стена + фото) и вставьте его в поле ниже."
      )}`
    );
  }

  const flow = savePendingVkCommunityFlow({
    projectId,
    userId: auth.session.userId,
    groupId,
  });

  return Response.redirect(
    buildVkCommunityAuthUrl({ groupId, state: flow.state })
  );
}
