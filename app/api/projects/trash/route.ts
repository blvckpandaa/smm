import { requireSession } from "@/lib/auth/request";
import {
  listTrashForUser,
  restoreProjectFromTrash,
  toPublicProject,
} from "@/lib/store/projects";

/** Список удалённых бизнесов (корзина) */
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const trash = listTrashForUser(auth.session.userId).map((t) => ({
    ...toPublicProject(t),
    deletedAt: t.deletedAt,
  }));
  return Response.json({ trash });
}

/** Восстановить бизнес из корзины */
export async function POST(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json()) as { id?: string };
    if (!body.id) {
      return Response.json({ error: "Укажите id" }, { status: 400 });
    }
    const project = restoreProjectFromTrash(body.id, auth.session.userId);
    if (!project) {
      return Response.json(
        { error: "В корзине такого бизнеса нет" },
        { status: 404 }
      );
    }
    return Response.json({ project: toPublicProject(project) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка";
    return Response.json({ error: message }, { status: 500 });
  }
}
