import { getAppUrl } from "@/lib/meta/config";
import { readVkState } from "@/lib/vk/config";
import { exchangeVkCode } from "@/lib/vk/oauth";
import { getProjectForUser, savePendingVkAuth } from "@/lib/store/projects";

/** OAuth callback от VK */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const err =
    url.searchParams.get("error_description") || url.searchParams.get("error");
  if (err) {
    return Response.redirect(
      `${getAppUrl()}/plan?vk_error=${encodeURIComponent(err)}`
    );
  }

  const code = url.searchParams.get("code");
  const state = readVkState(url.searchParams.get("state"));
  if (!code || !state) {
    return Response.redirect(
      `${getAppUrl()}/plan?vk_error=${encodeURIComponent(
        "Нет code/state от VK — попробуйте ещё раз"
      )}`
    );
  }

  const project = getProjectForUser(state.projectId, state.userId);
  if (!project) {
    return Response.redirect(
      `${getAppUrl()}/plan?vk_error=${encodeURIComponent("Проект не найден")}`
    );
  }

  try {
    const tokens = await exchangeVkCode(code);
    savePendingVkAuth({
      projectId: state.projectId,
      userId: state.userId,
      accessToken: tokens.accessToken,
      vkUserId: tokens.userId,
      expiresAt: tokens.expiresIn
        ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
        : undefined,
    });

    return Response.redirect(
      `${getAppUrl()}/plan?vk_pick=1&projectId=${encodeURIComponent(state.projectId)}&step=channels`
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка VK OAuth";
    return Response.redirect(
      `${getAppUrl()}/plan?vk_error=${encodeURIComponent(message)}`
    );
  }
}
