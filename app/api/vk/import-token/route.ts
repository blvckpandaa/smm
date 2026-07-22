import { requireSession } from "@/lib/auth/request";
import {
  getProjectForUser,
  savePendingVkAuth,
} from "@/lib/store/projects";
import { listVkAdminGroups } from "@/lib/vk/oauth";
import { parseVkAccessToken } from "@/lib/vk/parse-group-id";
import { VK_STUB_GROUPS, useVkStub } from "@/lib/vk/config";

/**
 * Импорт личного токена (Kate Mobile / OAuth) → список сообществ для выбора.
 * Тело: { projectId, accessToken } — токен или URL с access_token=.
 */
export async function POST(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json()) as {
      projectId?: string;
      accessToken?: string;
    };
    const projectId = body.projectId?.trim();
    const accessToken = parseVkAccessToken(body.accessToken || "");

    if (!projectId || !accessToken) {
      return Response.json(
        { error: "Нужны projectId и токен (или ссылка с access_token)" },
        { status: 400 }
      );
    }

    if (!getProjectForUser(projectId, auth.session.userId)) {
      return Response.json({ error: "Проект не найден" }, { status: 404 });
    }

    if (useVkStub()) {
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
        groups: VK_STUB_GROUPS.map((g) => ({
          id: g.id,
          name: g.name,
          screenName: g.screenName,
          photo50: g.photo50,
        })),
      });
    }

    // Проверка: это пользовательский токен
    const meParams = new URLSearchParams({
      access_token: accessToken,
      v: "5.199",
    });
    const meRes = await fetch(
      `https://api.vk.com/method/users.get?${meParams}`
    );
    const meData = (await meRes.json()) as {
      response?: { id: number }[];
      error?: { error_msg?: string; error_code?: number };
    };

    if (meData.error || !meData.response?.[0]?.id) {
      // Возможно ключ сообщества — сразу понятная ошибка
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
              "Это ключ сообщества из «Работа с API» — им нельзя публиковать на стену. Нажмите «Войти через VK» и получите личный токен (Kate Mobile).",
          },
          { status: 400 }
        );
      }
      return Response.json(
        {
          error:
            meData.error?.error_msg ||
            "Токен недействителен. Нажмите «Войти через VK» ещё раз и вставьте новую ссылку.",
        },
        { status: 400 }
      );
    }

    const vkUserId = meData.response[0].id;
    const groups = await listVkAdminGroups(accessToken);
    if (!groups.length) {
      return Response.json(
        {
          error:
            "Нет сообществ, где вы администратор. Создайте сообщество или получите права админа.",
          groups: [],
        },
        { status: 404 }
      );
    }

    savePendingVkAuth({
      projectId,
      userId: auth.session.userId,
      accessToken,
      vkUserId,
    });

    return Response.json({
      ok: true,
      stub: false,
      groups,
      projectId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка импорта токена VK";
    return Response.json({ error: message }, { status: 500 });
  }
}
