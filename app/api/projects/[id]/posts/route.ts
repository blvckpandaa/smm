import { requireSession } from "@/lib/auth/request";
import { writePostsFromPlan } from "@/lib/smm/writer";
import {
  getProjectForUser,
  toPublicProject,
  updateProject,
} from "@/lib/store/projects";

type Ctx = { params: Promise<{ id: string }> };

const DRAFTS_JOB_TTL_MS = 30 * 60_000;

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
  drafts: { id: string }[]
): boolean {
  if (!job || job.status !== "running") return false;
  const started = Date.parse(job.startedAt);
  if (!Number.isFinite(started)) return true;
  const ageMs = Date.now() - started;
  if (ageMs < 3 * 60_000) return false;
  if (!drafts.length && ageMs > 3 * 60_000) return true;
  return ageMs > 25 * 60_000;
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

    updateProject(projectId, userId, {
      drafts,
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
    if (
      isDraftsJobFresh(project.draftsJob) &&
      !isDraftsJobStale(project.draftsJob, project.drafts)
    ) {
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
