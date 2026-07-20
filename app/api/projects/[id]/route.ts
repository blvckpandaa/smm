import { requireSession } from "@/lib/auth/request";
import {
  deleteProject,
  getProjectForUser,
  toPublicProject,
  updateProject,
} from "@/lib/store/projects";
import type { BrandBrief } from "@/lib/marketer/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const project = getProjectForUser(id, auth.session.userId);
  if (!project) return Response.json({ error: "Проект не найден" }, { status: 404 });
  return Response.json({ project: toPublicProject(project) });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  try {
    const body = (await req.json()) as {
      name?: string;
      brief?: Partial<BrandBrief>;
    };
    const existing = getProjectForUser(id, auth.session.userId);
    if (!existing) {
      return Response.json({ error: "Проект не найден" }, { status: 404 });
    }

    const project = updateProject(id, auth.session.userId, {
      name: body.name ?? existing.name,
      brief: body.brief ? { ...existing.brief, ...body.brief } : existing.brief,
    });

    return Response.json({ project: toPublicProject(project!) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка обновления";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  let confirmName = "";
  try {
    const body = (await req.json()) as { confirmName?: string };
    confirmName = body.confirmName ?? "";
  } catch {
    return Response.json(
      {
        error:
          "Чтобы удалить бизнес, подтвердите название в теле запроса (confirmName)",
      },
      { status: 400 }
    );
  }

  const result = deleteProject(id, auth.session.userId, { confirmName });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({
    ok: true,
    message: "Бизнес перемещён в корзину. Его можно восстановить.",
  });
}
