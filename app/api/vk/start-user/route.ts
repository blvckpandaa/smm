import { requireSession } from "@/lib/auth/request";
import { getAppUrl } from "@/lib/meta/config";
import { getProjectForUser } from "@/lib/store/projects";
import {
  beginVkOAuthFlow,
  buildVkAuthUrl,
  getVkRedirectUri,
  resolveOAuthOrigin,
  VK_ID_PHOTO_SCOPES,
  useVkStub,
} from "@/lib/vk/config";

/** Старт VK ID OAuth для личного токена загрузки фото. */
export async function GET(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId")?.trim();
  const origin = resolveOAuthOrigin(req);
  const home = origin.includes("localhost") ? origin : getAppUrl();
  const redirectUri = getVkRedirectUri(origin);

  if (!projectId) {
    return Response.redirect(
      `${home}/plan?vk_error=${encodeURIComponent("Не указан проект")}`
    );
  }

  const project = getProjectForUser(projectId, auth.session.userId);
  if (!project) {
    return Response.redirect(
      `${home}/plan?vk_error=${encodeURIComponent("Проект не найден")}`
    );
  }

  if (!project.channels.vk) {
    return Response.redirect(
      `${home}/plan?vk_error=${encodeURIComponent(
        "Сначала подключите сообщество VK"
      )}&step=channels`
    );
  }

  if (useVkStub()) {
    return Response.redirect(`${home}/plan?step=channels`);
  }

  const { state, codeChallenge } = beginVkOAuthFlow({
    projectId,
    userId: auth.session.userId,
    purpose: "photo",
    redirectUri,
  });

  return Response.redirect(
    buildVkAuthUrl({
      state,
      codeChallenge,
      redirectUri,
      scope: VK_ID_PHOTO_SCOPES,
    })
  );
}
