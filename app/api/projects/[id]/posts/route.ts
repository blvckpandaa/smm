import { requireSession } from "@/lib/auth/request";
import { generateImageBytes } from "@/lib/ai/image";
import { saveProjectImage } from "@/lib/media/store";
import { writePostsFromPlan } from "@/lib/smm/writer";
import { draftNeedsPhoto } from "@/lib/smm/photo";
import type { BrandBrief } from "@/lib/marketer/types";
import type { PostDraft } from "@/lib/smm/types";
import {
  getProjectForUser,
  toPublicProject,
  updateProject,
} from "@/lib/store/projects";

type Ctx = { params: Promise<{ id: string }> };

const DRAFTS_JOB_TTL_MS = 30 * 60_000;
const PHOTO_CONCURRENCY = 3;

function isDraftsJobFresh(
  job: { status: string; startedAt: string } | null | undefined
): boolean {
  if (!job || job.status !== "running") return false;
  const started = Date.parse(job.startedAt);
  if (!Number.isFinite(started)) return false;
  return Date.now() - started < DRAFTS_JOB_TTL_MS;
}

/** Задача «зависла» (например, после перезапуска сервера) — можно запустить заново. */
function isDraftsJobStale(
  job: { status: string; startedAt: string; phase?: string } | null | undefined,
  drafts: PostDraft[]
): boolean {
  if (!job || job.status !== "running") return false;
  const started = Date.parse(job.startedAt);
  if (!Number.isFinite(started)) return true;
  const ageMs = Date.now() - started;
  if (ageMs < 3 * 60_000) return false;
  if (!drafts.length && ageMs > 3 * 60_000) return true;
  if (job.phase === "photos" && ageMs > 25 * 60_000) return true;
  return false;
}

function needsPhotoForDraft(draft: PostDraft): boolean {
  return draftNeedsPhoto({
    channel: draft.channel,
    format: draft.format,
    needsPhoto: draft.needsPhoto,
  });
}

/** Быстрый промпт без второго вызова DeepSeek — mediaHint уже есть из плана. */
function fastImagePrompt(brief: BrandBrief, draft: PostDraft): string {
  const hint =
    draft.mediaHint?.trim() ||
    `Visual for social post about: ${draft.topic}. Brand: ${brief.brandName}.`;
  return [
    "Professional social media photo, high quality, clean composition,",
    brief.niche ? `niche ${brief.niche},` : "",
    hint,
    "realistic editorial style, no watermarks, no readable text, no logos",
  ]
    .filter(Boolean)
    .join(" ");
}

async function attachPhotoToDraft(
  projectId: string,
  brief: BrandBrief,
  draft: PostDraft
): Promise<PostDraft> {
  if (!needsPhotoForDraft(draft)) {
    return {
      ...draft,
      needsPhoto: false,
      imagePath: draft.channel === "threads" ? undefined : draft.imagePath,
      imagePrompt: draft.channel === "threads" ? undefined : draft.imagePrompt,
    };
  }

  try {
    const withFlag = { ...draft, needsPhoto: true };
    const prompt = fastImagePrompt(brief, withFlag);
    const bytes = await generateImageBytes(prompt);
    const saved = saveProjectImage(projectId, draft.id, bytes, "jpg");
    return {
      ...withFlag,
      imagePrompt: prompt,
      imagePath: saved.relativePath,
      mediaHint: draft.mediaHint || prompt.slice(0, 200),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ошибка фото";
    return {
      ...draft,
      needsPhoto: true,
      publishError: `Фото не создалось: ${msg}`,
    };
  }
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<void>
): Promise<void> {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
    }
  }
  const workers = Math.min(concurrency, items.length);
  if (workers <= 0) return;
  await Promise.all(Array.from({ length: workers }, worker));
}

async function runDraftsJob(input: { projectId: string; userId: string }) {
  const { projectId, userId } = input;
  const startedAt = new Date().toISOString();

  try {
    const project = getProjectForUser(projectId, userId);
    if (!project?.plan?.posts?.length) {
      throw new Error("Сначала составьте план публикаций");
    }

    updateProject(projectId, userId, {
      draftsJob: { status: "running", startedAt, phase: "texts" },
    });

    const { drafts, source } = await writePostsFromPlan({
      brief: project.brief,
      plan: project.plan,
    });

    const photoIndexes = drafts
      .map((d, i) => (needsPhotoForDraft(d) ? i : -1))
      .filter((i) => i >= 0);

    updateProject(projectId, userId, {
      drafts,
      draftsSource: source,
      draftsJob: {
        status: "running",
        startedAt,
        phase: "photos",
        photoDone: 0,
        photoTotal: photoIndexes.length,
      },
    });

    const result = [...drafts];
    let photoDone = 0;

    await mapPool(photoIndexes, PHOTO_CONCURRENCY, async (draftIndex) => {
      result[draftIndex] = await attachPhotoToDraft(
        projectId,
        project.brief,
        result[draftIndex]
      );
      photoDone += 1;
      updateProject(projectId, userId, {
        drafts: [...result],
        draftsJob: {
          status: "running",
          startedAt,
          phase: "photos",
          photoDone,
          photoTotal: photoIndexes.length,
        },
      });
    });

    updateProject(projectId, userId, {
      drafts: result,
      draftsSource: source,
      draftsJob: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка";
    updateProject(projectId, userId, {
      draftsJob: {
        status: "failed",
        startedAt,
        error: message,
      },
    });
  }
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
    if (isDraftsJobFresh(project.draftsJob) && !isDraftsJobStale(project.draftsJob, project.drafts)) {
      return Response.json(
        {
          ok: true,
          status: "running",
          project: toPublicProject(project),
        },
        { status: 202 }
      );
    }

    const startedAt = new Date().toISOString();
    const updated = updateProject(id, auth.session.userId, {
      draftsJob: {
        status: "running",
        startedAt,
        phase: "texts",
      },
    });

    void runDraftsJob({
      projectId: id,
      userId: auth.session.userId,
    });

    return Response.json(
      {
        ok: true,
        status: "running",
        project: toPublicProject(updated!),
      },
      { status: 202 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка";
    return Response.json({ error: message }, { status: 500 });
  }
}
