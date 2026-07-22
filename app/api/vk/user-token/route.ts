import { requireSession } from "@/lib/auth/request";
import {
  clearPendingVkUserFlow,
  getPendingVkUserFlow,
  getProjectForUser,
  setVkUserAccessToken,
  toPublicProject,
} from "@/lib/store/projects";
import { verifyVkUserPhotoAccess } from "@/lib/vk/oauth";

/** Сохранить личный токен VK для загрузки фото. */
export async function POST(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json()) as {
      state?: string;
      accessToken?: string;
      projectId?: string;
    };

    const accessToken = body.accessToken?.trim();
    if (!accessToken) {
      return Response.json({ error: "Нужен токен" }, { status: 400 });
    }

    let projectId: string | undefined;

    if (body.state?.trim()) {
      const flow = getPendingVkUserFlow(body.state.trim());
      if (!flow || flow.userId !== auth.session.userId) {
        return Response.json(
          { error: "Сессия VK истекла — попробуйте снова" },
          { status: 401 }
        );
      }
      projectId = flow.projectId;
      clearPendingVkUserFlow(body.state.trim());
    } else {
      projectId = body.projectId?.trim();
    }

    if (!projectId) {
      return Response.json({ error: "Не указан проект" }, { status: 400 });
    }

    const project = getProjectForUser(projectId, auth.session.userId);
    const vk = project?.channels.vk;
    if (!vk) {
      return Response.json(
        { error: "Сначала подключите сообщество VK" },
        { status: 400 }
      );
    }

    const check = await verifyVkUserPhotoAccess({
      accessToken,
      groupId: vk.groupId,
    });
    if (!check.ok) {
      return Response.json(
        {
          error: `${check.error}. Для публикации с фото достаточно токена сообщества — фото идут как превью по ссылке.`,
        },
        { status: 400 }
      );
    }

    const updated = setVkUserAccessToken(
      projectId,
      auth.session.userId,
      accessToken
    );

    if (!updated) {
      return Response.json({ error: "Не удалось сохранить токен" }, { status: 500 });
    }

    return Response.json({ ok: true, project: toPublicProject(updated) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка сохранения токена VK";
    return Response.json({ error: message }, { status: 500 });
  }
}
