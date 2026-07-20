import { requireSession } from "@/lib/auth/request";
import { buildImagePrompt, generateImageBytes } from "@/lib/ai/image";
import { saveProjectImage } from "@/lib/media/store";
import { writePostsFromPlan } from "@/lib/smm/writer";
import { draftNeedsPhoto } from "@/lib/smm/photo";
import type { PostDraft } from "@/lib/smm/types";
import {
  getProjectForUser,
  toPublicProject,
  updateProject,
} from "@/lib/store/projects";

type Ctx = { params: Promise<{ id: string }> };

async function attachPhotos(
  projectId: string,
  brief: Parameters<typeof buildImagePrompt>[0]["brief"],
  drafts: PostDraft[]
): Promise<PostDraft[]> {
  const out: PostDraft[] = [];
  for (const draft of drafts) {
    const needs = draftNeedsPhoto({
      channel: draft.channel,
      format: draft.format,
      needsPhoto: draft.needsPhoto,
    });
    if (!needs) {
      out.push({
        ...draft,
        needsPhoto: false,
        // Threads и текстовые посты — без фото
        imagePath: draft.channel === "threads" ? undefined : draft.imagePath,
        imagePrompt:
          draft.channel === "threads" ? undefined : draft.imagePrompt,
      });
      continue;
    }
    try {
      const withFlag = { ...draft, needsPhoto: true };
      const prompt = await buildImagePrompt({ brief, draft: withFlag });
      const bytes = await generateImageBytes(prompt);
      const saved = saveProjectImage(projectId, draft.id, bytes, "jpg");
      out.push({
        ...withFlag,
        imagePrompt: prompt,
        imagePath: saved.relativePath,
        mediaHint: draft.mediaHint || prompt.slice(0, 200),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "ошибка фото";
      out.push({
        ...draft,
        needsPhoto: true,
        publishError: `Фото не создалось: ${msg}`,
      });
    }
  }
  return out;
}

export async function POST(_req: Request, ctx: Ctx) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const project = getProjectForUser(id, auth.session.userId);
  if (!project) return Response.json({ error: "Проект не найден" }, { status: 404 });
  if (!project.plan?.posts?.length) {
    return Response.json(
      { error: "Сначала составьте план публикаций" },
      { status: 400 }
    );
  }

  try {
    const { drafts, source } = await writePostsFromPlan({
      brief: project.brief,
      plan: project.plan,
    });

    const withPhotos = await attachPhotos(id, project.brief, drafts);

    const updated = updateProject(id, auth.session.userId, {
      drafts: withPhotos,
      draftsSource: source,
    });

    return Response.json({
      project: toPublicProject(updated!),
      drafts: withPhotos,
      source,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка";
    return Response.json({ error: message }, { status: 500 });
  }
}
