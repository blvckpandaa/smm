import { requireSession } from "@/lib/auth/request";
import { getAppUrl } from "@/lib/meta/config";
import { getProjectForUser, savePendingVkAuth } from "@/lib/store/projects";
import {
  buildVkAuthUrl,
  signVkState,
  useVkStub,
} from "@/lib/vk/config";

/** Старт OAuth VK: ?projectId= */
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

  const state = signVkState({
    projectId,
    userId: auth.session.userId,
  });

  return Response.redirect(buildVkAuthUrl(state));
}
