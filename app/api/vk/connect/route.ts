import { requireSession } from "@/lib/auth/request";
import {
  clearPendingVkAuth,
  getPendingVkAuth,
  getProjectForUser,
  setVkChannel,
  toPublicProject,
} from "@/lib/store/projects";
import { useVkStub, VK_STUB_GROUPS } from "@/lib/vk/config";
import { verifyVkPublishToken } from "@/lib/vk/oauth";

/** Выбор сообщества после входа: сохранить личный токен + проверить wall.post. */
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
        { error: "Сессия VK истекла — нажмите «Подключить VK» снова" },
        { status: 401 }
      );
    }

    if (pending.isStub || useVkStub()) {
      const stub = VK_STUB_GROUPS.find((g) => String(g.id) === groupId);
      if (!stub) {
        return Response.json({ error: "Сообщество не найдено" }, { status: 404 });
      }
      const updated = setVkChannel(projectId, auth.session.userId, {
        accessToken: pending.accessToken,
        groupId,
        groupName: stub.name,
        vkUserId: pending.vkUserId,
        expiresAt: pending.expiresAt,
        isStub: true,
      });
      clearPendingVkAuth(projectId, auth.session.userId);
      return Response.json({
        ok: true,
        project: toPublicProject(updated!),
        stub: true,
      });
    }

    const verified = await verifyVkPublishToken({
      accessToken: pending.accessToken,
      groupId,
    });
    if (!verified.ok) {
      return Response.json({ error: verified.error }, { status: 400 });
    }

    const updated = setVkChannel(projectId, auth.session.userId, {
      accessToken: pending.accessToken,
      groupId: String(verified.group.id),
      groupName: verified.group.name,
      vkUserId: verified.vkUserId ?? pending.vkUserId,
      userAccessToken:
        verified.mode === "user" ? pending.accessToken : undefined,
      expiresAt: pending.expiresAt,
    });

    clearPendingVkAuth(projectId, auth.session.userId);

    return Response.json({
      ok: true,
      project: toPublicProject(updated!),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка подключения VK";
    return Response.json({ error: message }, { status: 500 });
  }
}
