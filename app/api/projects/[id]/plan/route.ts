import { requireSession } from "@/lib/auth/request";
import { buildContentPlan } from "@/lib/ai/deepseek";
import { isValidTimeZone } from "@/lib/marketer/timezone";
import { slotFromLocalInput } from "@/lib/schedule/pick-time";
import type { ContentPlan, PlannedPost } from "@/lib/marketer/types";
import type { PostDraft } from "@/lib/smm/types";
import {
  getProjectForUser,
  toPublicProject,
  updateProject,
} from "@/lib/store/projects";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const project = getProjectForUser(id, auth.session.userId);
  if (!project) return Response.json({ error: "Проект не найден" }, { status: 404 });

  try {
    const body = (await req.json().catch(() => ({}))) as {
      brief?: typeof project.brief;
    };

    const brief = { ...project.brief, ...body.brief };
    if (!isValidTimeZone(brief.timezone)) brief.timezone = "Europe/Moscow";
    if (!brief.startDate) brief.startDate = new Date().toISOString().slice(0, 10);
    if (!brief.channels?.length) brief.channels = ["telegram"];
    if (!brief.postsPerWeek) brief.postsPerWeek = 7;

    const { plan, source } = await buildContentPlan(brief);

    const updated = updateProject(id, auth.session.userId, {
      brief,
      plan,
      planSource: source,
      drafts: [],
      draftsSource: null,
      name: brief.brandName || project.name,
    });

    return Response.json({
      project: toPublicProject(updated!),
      plan,
      source,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка плана";
    return Response.json({ error: message }, { status: 500 });
  }
}

/** Изменить дату/время поста в плане (и синхронизировать черновик, если есть) */
export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const project = getProjectForUser(id, auth.session.userId);
  if (!project?.plan) {
    return Response.json({ error: "План не найден" }, { status: 404 });
  }

  try {
    const body = (await req.json()) as {
      postId?: string;
      day?: string;
      timeLocal?: string;
    };

    if (!body.postId || !body.day || !body.timeLocal) {
      return Response.json(
        { error: "Нужны postId, day и timeLocal" },
        { status: 400 }
      );
    }

    const post = project.plan.posts.find((p) => p.id === body.postId);
    if (!post) {
      return Response.json({ error: "Пост не найден в плане" }, { status: 404 });
    }

    const slot = slotFromLocalInput({
      day: body.day,
      timeLocal: body.timeLocal,
      timeZone: project.plan.timezone,
      channel: post.channel,
    });

    const nextPost: PlannedPost = {
      ...post,
      day: slot.day,
      timeLocal: slot.timeLocal,
      scheduledAtIso: slot.scheduledAtIso,
      weekday: slot.weekday,
      whyThisTime: slot.why,
    };

    const plan: ContentPlan = {
      ...project.plan,
      posts: project.plan.posts.map((p) => (p.id === post.id ? nextPost : p)),
    };

    const drafts: PostDraft[] = project.drafts.map((d) =>
      d.planPostId === post.id
        ? {
            ...d,
            day: slot.day,
            timeLocal: slot.timeLocal,
            scheduledAtIso: slot.scheduledAtIso,
            weekday: slot.weekday,
            scheduleWhy: slot.why,
          }
        : d
    );

    const updated = updateProject(id, auth.session.userId, { plan, drafts });
    return Response.json({ project: toPublicProject(updated!) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка обновления";
    return Response.json({ error: message }, { status: 500 });
  }
}
