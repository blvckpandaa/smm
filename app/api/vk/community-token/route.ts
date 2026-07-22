import { requireSession } from "@/lib/auth/request";
import {
  clearPendingVkCommunityFlow,
  clearPendingVkAuth,
  getPendingVkCommunityFlow,
  getProjectForUser,
  setVkChannel,
  toPublicProject,
} from "@/lib/store/projects";
import {
  verifyVkPublishToken,
} from "@/lib/vk/oauth";

/** Сохранить токен сообщества после implicit OAuth (вызывается из community-callback). */
export async function POST(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json()) as {
      state?: string;
      accessToken?: string;
      groupId?: string;
    };

    const state = body.state?.trim();
    const accessToken = body.accessToken?.trim();
    if (!state || !accessToken) {
      return Response.json({ error: "Нет state или токена" }, { status: 400 });
    }

    const flow = getPendingVkCommunityFlow(state);
    if (!flow || flow.userId !== auth.session.userId) {
      return Response.json(
        { error: "Сессия VK истекла — попробуйте снова" },
        { status: 401 }
      );
    }

    if (!getProjectForUser(flow.projectId, auth.session.userId)) {
      clearPendingVkCommunityFlow(state);
      return Response.json({ error: "Проект не найден" }, { status: 404 });
    }

    const groupId = (body.groupId || flow.groupId).replace(/^-/, "").trim();
    const verified = await verifyVkPublishToken({ accessToken, groupId });
    if (!verified.ok) {
      clearPendingVkCommunityFlow(state);
      return Response.json({ error: verified.error }, { status: 400 });
    }

    const updated = setVkChannel(flow.projectId, auth.session.userId, {
      accessToken,
      groupId: String(verified.group.id),
      groupName: verified.group.name,
      vkUserId: verified.vkUserId,
      userAccessToken:
        verified.mode === "user" ? accessToken : undefined,
    });

    clearPendingVkCommunityFlow(state);
    clearPendingVkAuth(flow.projectId, auth.session.userId);

    return Response.json({ ok: true, project: toPublicProject(updated!) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка подключения VK";
    return Response.json({ error: message }, { status: 500 });
  }
}
