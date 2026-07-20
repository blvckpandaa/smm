import { requireSession } from "@/lib/auth/request";
import { buildVideoPrompt, generateVideoBytes } from "@/lib/ai/video";
import { saveProjectVideo } from "@/lib/media/store";
import {
  getProjectForUser,
  toPublicProject,
  updateProject,
} from "@/lib/store/projects";

type Ctx = { params: Promise<{ id: string }> };

/** Сгенерировать короткое ИИ-видео для черновика */
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
    if (draft.channel === "threads") {
      return Response.json(
        { error: "Threads — только текст, без видео" },
        { status: 400 }
      );
    }

    const prompt = await buildVideoPrompt({ brief: project.brief, draft });
    const bytes = await generateVideoBytes(prompt);
    const saved = saveProjectVideo(id, draft.id, bytes, "mp4");

    const drafts = project.drafts.map((d) =>
      d.id === draft.id
        ? {
            ...d,
            needsVideo: true,
            videoPrompt: prompt,
            videoPath: saved.relativePath,
          }
        : d
    );
    const updated = updateProject(id, auth.session.userId, { drafts });
    return Response.json({
      ok: true,
      videoPath: saved.relativePath,
      project: toPublicProject(updated!),
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Не удалось сгенерировать видео";
    return Response.json({ error: message }, { status: 500 });
  }
}
