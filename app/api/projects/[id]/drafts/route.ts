import { requireSession } from "@/lib/auth/request";
import type { PostDraft } from "@/lib/smm/types";
import {
  getProjectForUser,
  toPublicProject,
  updateProject,
} from "@/lib/store/projects";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const project = getProjectForUser(id, auth.session.userId);
  if (!project) return Response.json({ error: "Проект не найден" }, { status: 404 });

  try {
    const body = (await req.json()) as {
      drafts?: PostDraft[];
      draft?: PostDraft;
    };

    let drafts = project.drafts;
    if (body.drafts) {
      drafts = body.drafts;
    } else if (body.draft) {
      drafts = project.drafts.map((d) =>
        d.id === body.draft!.id ? { ...d, ...body.draft } : d
      );
    } else {
      return Response.json({ error: "Нет данных для сохранения" }, { status: 400 });
    }

    const updated = updateProject(id, auth.session.userId, { drafts });
    return Response.json({ project: toPublicProject(updated!) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка";
    return Response.json({ error: message }, { status: 500 });
  }
}
