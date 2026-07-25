import { requireSession } from "@/lib/auth/request";
import { getAppUrl } from "@/lib/meta/config";
import {
  getProjectForUser,
  savePendingVkAuth,
  savePendingVkUserFlow,
} from "@/lib/store/projects";
import {
  buildVkImplicitUserAuthUrl,
  getVkOAuthAppId,
  getVkRedirectUri,
  resolveOAuthOrigin,
  useVkStub,
} from "@/lib/vk/config";

/**
 * Подключение VK без копирования из адресной строки:
 * oauth.vk.com → редирект на наш /api/vk/callback#access_token=…
 * HTML сам читает hash и сохраняет сессию.
 *
 * Нужно приложение типа «Веб-сайт» / Standalone с Redirect URI =
 * http://localhost:3000/api/vk/callback (и прод).
 */
export async function GET(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId")?.trim();
  const origin = resolveOAuthOrigin(req);
  const home = origin.includes("localhost") ? origin : getAppUrl();

  if (!projectId) {
    return Response.redirect(
      `${home}/plan?vk_error=${encodeURIComponent("Нет projectId")}`
    );
  }

  const project = getProjectForUser(projectId, auth.session.userId);
  if (!project) {
    return Response.redirect(
      `${home}/plan?vk_error=${encodeURIComponent("Проект не найден")}`
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
      `${home}/plan?vk_pick=1&vk_stub=1&projectId=${encodeURIComponent(projectId)}&step=channels`
    );
  }

  if (!getVkOAuthAppId()) {
    return Response.redirect(
      `${home}/plan?vk_error=${encodeURIComponent(
        "Добавьте VK_APP_ID в .env"
      )}&step=channels`
    );
  }

  const groupId = url.searchParams.get("groupId")?.trim()?.replace(/^-/, "");
  if (groupId) {
    return Response.redirect(
      `${home}/api/vk/start-community?projectId=${encodeURIComponent(projectId)}&groupId=${encodeURIComponent(groupId)}`
    );
  }

  const redirectUri = getVkRedirectUri(origin);
  const flow = savePendingVkUserFlow({
    projectId,
    userId: auth.session.userId,
    redirectUri,
  });

  return Response.redirect(
    buildVkImplicitUserAuthUrl({ state: flow.state, redirectUri })
  );
}
