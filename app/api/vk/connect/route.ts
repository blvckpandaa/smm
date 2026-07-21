import { requireSession } from "@/lib/auth/request";
import {
  clearPendingVkAuth,
  getPendingVkAuth,
  getProjectForUser,
  setVkChannel,
  toPublicProject,
} from "@/lib/store/projects";
import { VK_STUB_GROUPS } from "@/lib/vk/config";
import { listVkAdminGroups } from "@/lib/vk/oauth";

/** Выбор сообщества и финальное подключение VK */
export async function POST(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json()) as {
      projectId?: string;
      groupId?: number | string;
    };
    const projectId = body.projectId?.trim();
    const groupId = body.groupId != null ? String(body.groupId).trim() : "";

    if (!projectId || !groupId) {
      return Response.json(
        { error: "Нужны projectId и groupId" },
        { status: 400 }
      );
    }

    if (!getProjectForUser(projectId, auth.session.userId)) {
      return Response.json({ error: "Проект не найден" }, { status: 404 });
    }

    const pending = getPendingVkAuth(projectId, auth.session.userId);
    if (!pending) {
      return Response.json(
        { error: "Сессия VK истекла — подключите VK заново" },
        { status: 401 }
      );
    }

    let groupName: string | undefined;
    if (pending.isStub) {
      const stub = VK_STUB_GROUPS.find((g) => String(g.id) === groupId);
      if (!stub) {
        return Response.json({ error: "Сообщество не найдено" }, { status: 404 });
      }
      groupName = stub.name;
    } else {
      const groups = await listVkAdminGroups(pending.accessToken);
      const found = groups.find((g) => String(g.id) === groupId);
      if (!found) {
        return Response.json(
          { error: "Нет доступа к этому сообществу" },
          { status: 403 }
        );
      }
      groupName = found.name;
    }

    const updated = setVkChannel(projectId, auth.session.userId, {
      accessToken: pending.accessToken,
      groupId,
      groupName,
      vkUserId: pending.vkUserId,
      expiresAt: pending.expiresAt,
      isStub: pending.isStub,
    });

    clearPendingVkAuth(projectId, auth.session.userId);

    return Response.json({
      project: toPublicProject(updated!),
      stub: Boolean(pending.isStub),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка подключения VK";
    return Response.json({ error: message }, { status: 500 });
  }
}
