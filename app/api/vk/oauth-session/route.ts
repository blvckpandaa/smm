import { requireSession } from "@/lib/auth/request";
import {
  clearPendingVkUserFlow,
  getPendingVkUserFlow,
  getProjectForUser,
  savePendingVkAuth,
} from "@/lib/store/projects";

/** Сохранить пользовательский токен после oauth.vk.com (шаг 1 → выбор сообщества). */
export async function POST(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json()) as {
      state?: string;
      accessToken?: string;
      userId?: string | number;
    };

    const state = body.state?.trim();
    const accessToken = body.accessToken?.trim();
    if (!state || !accessToken) {
      return Response.json({ error: "Нет state или токена" }, { status: 400 });
    }

    const flow = getPendingVkUserFlow(state);
    if (!flow || flow.userId !== auth.session.userId) {
      return Response.json(
        { error: "Сессия VK истекла — нажмите «Подключить VK» снова" },
        { status: 401 }
      );
    }

    if (!getProjectForUser(flow.projectId, auth.session.userId)) {
      clearPendingVkUserFlow(state);
      return Response.json({ error: "Проект не найден" }, { status: 404 });
    }

    const vkUserId = body.userId != null ? Number(body.userId) : 0;
    savePendingVkAuth({
      projectId: flow.projectId,
      userId: auth.session.userId,
      accessToken,
      vkUserId: Number.isFinite(vkUserId) ? vkUserId : 0,
    });

    clearPendingVkUserFlow(state);

    return Response.json({
      ok: true,
      pickGroups: true,
      projectId: flow.projectId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка VK OAuth";
    return Response.json({ error: message }, { status: 500 });
  }
}
