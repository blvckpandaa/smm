import { requireSession } from "@/lib/auth/request";
import { getProjectForUser, getPendingVkAuth } from "@/lib/store/projects";
import { VK_STUB_GROUPS } from "@/lib/vk/config";
import { listVkAdminGroups } from "@/lib/vk/oauth";

/** Список сообществ VK, где пользователь — администратор */
export async function GET(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId")?.trim();
  if (!projectId) {
    return Response.json({ error: "Нужен projectId" }, { status: 400 });
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

  try {
    if (pending.isStub) {
      return Response.json({
        stub: true,
        groups: VK_STUB_GROUPS.map((g) => ({
          id: g.id,
          name: g.name,
          screenName: g.screenName,
          photo50: g.photo50,
        })),
      });
    }

    const groups = await listVkAdminGroups(pending.accessToken);
    if (!groups.length) {
      return Response.json(
        {
          error:
            "Нет сообществ, где вы администратор. Создайте группу в VK или получите права администратора.",
          groups: [],
          needsCommunityToken: true,
        },
        { status: 404 }
      );
    }

    return Response.json({ groups, stub: false });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка VK API";
    const needsCommunityToken =
      /profile type|unavailable|Method is not available|недоступ/i.test(
        message
      );
    return Response.json(
      {
        error: needsCommunityToken
          ? "Вход через VK ID прошёл, но список сообществ через него недоступен. Подключите сообщество по ключу API (поле ниже): Управление → Дополнительно → Работа с API."
          : message,
        needsCommunityToken,
      },
      { status: needsCommunityToken ? 422 : 500 }
    );
  }
}
