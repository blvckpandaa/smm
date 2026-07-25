import { requireSession } from "@/lib/auth/request";
import {
  getProjectForUser,
  savePendingVkAuth,
  setVkChannel,
  toPublicProject,
} from "@/lib/store/projects";
import { useVkStub, VK_STUB_GROUPS } from "@/lib/vk/config";
import {
  listVkAdminGroups,
  verifyVkPublishToken,
} from "@/lib/vk/oauth";
import {
  parseVkAccessToken,
  parseVkGroupId,
} from "@/lib/vk/parse-group-id";

/**
 * Универсальное подключение VK — любой рабочий вариант:
 * - личный токен / URL blank.html#access_token=… (+ опционально сообщество)
 * - ключ сообщества + ссылка/ID (если wall.post реально проходит)
 *
 * Всегда проверяем публикацию на стену перед сохранением.
 */
export async function POST(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json()) as {
      projectId?: string;
      accessToken?: string;
      groupId?: string;
      raw?: string;
    };

    const projectId = body.projectId?.trim();
    if (!projectId) {
      return Response.json({ error: "Нужен projectId" }, { status: 400 });
    }
    if (!getProjectForUser(projectId, auth.session.userId)) {
      return Response.json({ error: "Проект не найден" }, { status: 404 });
    }

    const rawBlob = [body.raw, body.accessToken, body.groupId]
      .filter(Boolean)
      .join("\n");
    const accessToken =
      parseVkAccessToken(body.accessToken || body.raw || "") ||
      parseVkAccessToken(rawBlob);
    // groupId только из явного поля — не парсить из blank.html URL
    const groupId = parseVkGroupId(body.groupId || "") || null;

    if (!accessToken) {
      return Response.json(
        {
          error:
            "Нужен код доступа VK: откройте вход, нажмите «Разрешить» и вставьте длинную ссылку (начинается с oauth.vk.com).",
        },
        { status: 400 }
      );
    }

    if (useVkStub()) {
      if (groupId) {
        const stub =
          VK_STUB_GROUPS.find((g) => String(g.id) === groupId) ||
          VK_STUB_GROUPS[0];
        const updated = setVkChannel(projectId, auth.session.userId, {
          accessToken: "vk-stub-token",
          groupId: String(stub.id),
          groupName: stub.name,
          vkUserId: 0,
          isStub: true,
        });
        return Response.json({
          ok: true,
          stub: true,
          project: toPublicProject(updated!),
        });
      }
      savePendingVkAuth({
        projectId,
        userId: auth.session.userId,
        accessToken: "vk-stub-token",
        vkUserId: 0,
        isStub: true,
      });
      return Response.json({
        ok: true,
        stub: true,
        pickGroups: true,
        projectId,
        groups: VK_STUB_GROUPS.map((g) => ({
          id: g.id,
          name: g.name,
          screenName: g.screenName,
          photo50: g.photo50,
        })),
      });
    }

    // Есть и токен, и сообщество — сразу проверяем wall.post и сохраняем
    if (groupId) {
      const verified = await verifyVkPublishToken({
        accessToken,
        groupId,
      });
      if (!verified.ok) {
        return Response.json({ error: verified.error }, { status: 400 });
      }
      const updated = setVkChannel(projectId, auth.session.userId, {
        accessToken,
        groupId: String(verified.group.id),
        groupName: verified.group.name,
        vkUserId: verified.vkUserId,
        userAccessToken:
          verified.mode === "user" ? accessToken : undefined,
      });
      return Response.json({
        ok: true,
        project: toPublicProject(updated!),
        mode: verified.mode,
      });
    }

    // Только токен — если личный, отдаём список сообществ
    const meParams = new URLSearchParams({
      access_token: accessToken,
      v: "5.199",
    });
    const meRes = await fetch(
      `https://api.vk.com/method/users.get?${meParams}`
    );
    const meData = (await meRes.json()) as {
      response?: { id: number }[];
      error?: { error_msg?: string };
    };

    if (meData.response?.[0]?.id) {
      const vkUserId = meData.response[0].id;
      const groups = await listVkAdminGroups(accessToken);
      if (!groups.length) {
        return Response.json(
          {
            error:
              "Нет сообществ, где вы администратор. Войдите аккаунтом, которым управляете сообществом, или создайте сообщество во ВКонтакте.",
            groups: [],
          },
          { status: 404 }
        );
      }

      // Одно сообщество — сразу проверяем и подключаем
      if (groups.length === 1) {
        const verified = await verifyVkPublishToken({
          accessToken,
          groupId: String(groups[0].id),
        });
        if (!verified.ok) {
          return Response.json({ error: verified.error }, { status: 400 });
        }
        const updated = setVkChannel(projectId, auth.session.userId, {
          accessToken,
          groupId: String(verified.group.id),
          groupName: verified.group.name,
          vkUserId: verified.vkUserId ?? vkUserId,
          userAccessToken: accessToken,
        });
        return Response.json({
          ok: true,
          project: toPublicProject(updated!),
          mode: "user",
        });
      }

      savePendingVkAuth({
        projectId,
        userId: auth.session.userId,
        accessToken,
        vkUserId,
      });

      return Response.json({
        ok: true,
        pickGroups: true,
        projectId,
        groups,
      });
    }

    // Похоже на ключ сообщества без groupId
    const permRes = await fetch(
      `https://api.vk.com/method/groups.getTokenPermissions?${meParams}`
    );
    const permData = (await permRes.json()) as {
      response?: unknown;
      error?: unknown;
    };
    if (permData.response && !permData.error) {
      return Response.json(
        {
          error:
            "Это ключ из настроек сообщества — им нельзя публиковать на стену. Нужен другой способ: откройте вход VK, нажмите «Разрешить» и вставьте длинную ссылку сюда.",
          needsGroupId: true,
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        error:
          meData.error?.error_msg ||
          "Ссылка не подходит. Откройте вход VK ещё раз, нажмите «Разрешить» и вставьте новую длинную ссылку сверху того окна.",
      },
      { status: 400 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка подключения VK";
    return Response.json({ error: message }, { status: 500 });
  }
}
