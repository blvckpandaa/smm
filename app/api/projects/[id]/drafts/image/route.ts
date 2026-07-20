import { requireSession } from "@/lib/auth/request";
import { buildImagePrompt, generateImageBytes } from "@/lib/ai/image";
import { saveProjectImage } from "@/lib/media/store";
import {
  getProjectForUser,
  toPublicProject,
  updateProject,
} from "@/lib/store/projects";

type Ctx = { params: Promise<{ id: string }> };

/** Сгенерировать ИИ-фото для черновика */
export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const project = getProjectForUser(id, auth.session.userId);
  if (!project) {
    return Response.json({ error: "Проект не найден" }, { status: 404 });
  }

  try {
    const body = (await req.json()) as { draftId?: string };
    if (!body.draftId) {
      return Response.json({ error: "Укажите draftId" }, { status: 400 });
    }

    const draft = project.drafts.find((d) => d.id === body.draftId);
    if (!draft) {
      return Response.json({ error: "Черновик не найден" }, { status: 404 });
    }

    const prompt = await buildImagePrompt({ brief: project.brief, draft });
    const bytes = await generateImageBytes(prompt);
    const saved = saveProjectImage(id, draft.id, bytes, "jpg");

    const drafts = project.drafts.map((d) =>
      d.id === draft.id
        ? {
            ...d,
            imagePrompt: prompt,
            imagePath: saved.relativePath,
            mediaHint: d.mediaHint || prompt.slice(0, 200),
          }
        : d
    );

    const updated = updateProject(id, auth.session.userId, { drafts });
    return Response.json({
      ok: true,
      imagePath: saved.relativePath,
      imageUrl: `/api/projects/${id}/media/${saved.relativePath.split("/")[1]}`,
      project: toPublicProject(updated!),
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Не удалось сгенерировать фото";
    return Response.json({ error: message }, { status: 500 });
  }
}
