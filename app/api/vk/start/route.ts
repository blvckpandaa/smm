import { requireSession } from "@/lib/auth/request";
import { getAppUrl } from "@/lib/meta/config";
import { getProjectForUser } from "@/lib/store/projects";
import {
  buildVkImplicitUserAuthUrl,
  getVkOAuthAppId,
  getVkRedirectUri,
  hasDedicatedVkOAuthApp,
  resolveOAuthOrigin,
  useVkStub,
} from "@/lib/vk/config";
import { savePendingVkAuth, savePendingVkUserFlow } from "@/lib/store/projects";

/**
 * OAuth только если явно задан VK_OAUTH_APP_ID (приложение «Веб-сайт»).
 * Иначе возвращаем в кабинет — основной путь: ключ сообщества, без Security Error.
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
      `${home}/plan?vk_error=${encodeURIComponent("Нет projectId")}&step=channels`
    );
  }

  if (!getProjectForUser(projectId, auth.session.userId)) {
    return Response.redirect(
      `${home}/plan?vk_error=${encodeURIComponent("Проект не найден")}&step=channels`
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

  // Без отдельного Website-приложения oauth.vk.com даёт Security Error на VK ID app
  if (!hasDedicatedVkOAuthApp()) {
    return Response.redirect(
      `${home}/plan?step=channels&vk_error=${encodeURIComponent(
        "OAuth недоступен для текущего VK_APP_ID (Security Error). Подключите сообщество ключом API: ссылка + ключ из «Работа с API»."
      )}`
    );
  }

  if (!getVkOAuthAppId()) {
    return Response.redirect(
      `${home}/plan?step=channels&vk_error=${encodeURIComponent("Нет VK_OAUTH_APP_ID")}`
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
