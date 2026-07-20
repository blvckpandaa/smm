import { requireSession } from "@/lib/auth/request";
import { publishDueDrafts } from "@/lib/schedule/publish-due";
import {
  getProjectForUser,
  toPublicProject,
} from "@/lib/store/projects";

type Ctx = { params: Promise<{ id: string }> };

/** Проверить и отправить посты, у которых подошло время */
export async function POST(_req: Request, ctx: Ctx) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  const project = getProjectForUser(id, auth.session.userId);
  if (!project) {
    return Response.json({ error: "Проект не найден" }, { status: 404 });
  }

  const result = await publishDueDrafts(id);
  const fresh = getProjectForUser(id, auth.session.userId);

  return Response.json({
    ...result,
    project: fresh ? toPublicProject(fresh) : null,
  });
}
