import { requireSession } from "@/lib/auth/request";
import {
  createProject,
  listProjectsForUser,
  toPublicProject,
} from "@/lib/store/projects";
import type { BrandBrief } from "@/lib/marketer/types";

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const projects = listProjectsForUser(auth.session.userId).map(toPublicProject);
  return Response.json({ projects });
}

export async function POST(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      brief?: Partial<BrandBrief>;
    };
    const project = createProject(auth.session.userId, {
      name: body.name,
      brief: body.brief,
    });
    return Response.json({ project: toPublicProject(project) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка создания";
    return Response.json({ error: message }, { status: 500 });
  }
}
