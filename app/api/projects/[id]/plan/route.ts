import { requireSession } from "@/lib/auth/request";
import { buildContentPlan } from "@/lib/ai/deepseek";
import { POST_PRICE_RUB } from "@/lib/billing/pricing";
import { resolvePostFrequency } from "@/lib/marketer/frequency";
import { isValidTimeZone } from "@/lib/marketer/timezone";
import { slotFromLocalInput } from "@/lib/schedule/pick-time";
import type { BrandBrief, ContentPlan, PlannedPost } from "@/lib/marketer/types";
import type { PostDraft } from "@/lib/smm/types";
import {
  chargeUserForPosts,
  creditUserBalance,
  getProjectForUser,
  getUserById,
  toPublicProject,
  updateProject,
} from "@/lib/store/projects";

type Ctx = { params: Promise<{ id: string }> };

const PLAN_JOB_TTL_MS = 15 * 60_000;

function isPlanJobFresh(
  job: { status: string; startedAt: string } | null | undefined
): boolean {
  if (!job || job.status !== "running") return false;
  const started = Date.parse(job.startedAt);
  if (!Number.isFinite(started)) return false;
  return Date.now() - started < PLAN_JOB_TTL_MS;
}

async function runPlanJob(input: {
  projectId: string;
  userId: string;
  brief: BrandBrief;
  chargedRub: number;
  postsCount: number;
}) {
  const { projectId, userId, brief, chargedRub, postsCount } = input;
  try {
    const { plan, source } = await buildContentPlan(brief);
    updateProject(projectId, userId, {
      brief,
      plan,
      planSource: source,
      drafts: [],
      draftsSource: null,
      draftsJob: null,
      planJob: null,
      ...(brief.brandName ? { name: brief.brandName } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка плана";
    if (chargedRub > 0) {
      creditUserBalance({
        userId,
        amountRub: chargedRub,
        description: `Возврат: не удалось собрать план (${postsCount} постов)`,
        yooPaymentId: `refund-plan-${projectId}-${Date.now()}`,
      });
    }
    const user = getUserById(userId);
    updateProject(projectId, userId, {
      planJob: {
        status: "failed",
        startedAt: new Date().toISOString(),
        error: message,
        chargedRub,
        postsCount,
        balanceRub: user?.balanceRub,
      },
    });
  }
}

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const project = getProjectForUser(id, auth.session.userId);
  if (!project) return Response.json({ error: "Проект не найден" }, { status: 404 });

  try {
    if (isPlanJobFresh(project.planJob)) {
      return Response.json(
        {
          ok: true,
          status: "running",
          project: toPublicProject(project),
          billing: {
            chargedRub: project.planJob?.chargedRub ?? 0,
            balanceRub:
              project.planJob?.balanceRub ??
              getUserById(auth.session.userId)?.balanceRub ??
              0,
            postsCount: project.planJob?.postsCount ?? 0,
            postPriceRub: POST_PRICE_RUB,
          },
        },
        { status: 202 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      brief?: typeof project.brief;
    };

    const brief = { ...project.brief, ...body.brief };
    if (!isValidTimeZone(brief.timezone)) brief.timezone = "Europe/Moscow";
    if (!brief.startDate) brief.startDate = new Date().toISOString().slice(0, 10);
    if (!brief.channels?.length) brief.channels = ["telegram"];

    const freq = resolvePostFrequency(brief);
    brief.postsPerDay = freq.postsPerDay;
    brief.postsPerWeek = freq.postsPerWeek;

    const postsCount = freq.postsPerWeek;
    const charge = chargeUserForPosts({
      userId: auth.session.userId,
      postsCount,
      pricePerPost: POST_PRICE_RUB,
      projectId: id,
      description: `Маркетолог: план ${freq.postsPerDay}/день (${postsCount} постов) × ${POST_PRICE_RUB} ₽`,
    });
    if (!charge.ok) {
      return Response.json(
        {
          error: charge.error,
          code: "INSUFFICIENT_BALANCE",
          balanceRub: charge.balanceRub,
          needRub: charge.needRub,
          postPriceRub: POST_PRICE_RUB,
        },
        { status: 402 }
      );
    }

    const user = getUserById(auth.session.userId);
    const startedAt = new Date().toISOString();
    const updated = updateProject(id, auth.session.userId, {
      brief,
      plan: null,
      planSource: null,
      drafts: [],
      draftsSource: null,
      draftsJob: null,
      name: brief.brandName || project.name,
      planJob: {
        status: "running",
        startedAt,
        chargedRub: charge.chargedRub,
        postsCount,
        balanceRub: user?.balanceRub ?? charge.balanceRub,
      },
    });

    // Фоновая генерация: не ждём DeepSeek в HTTP-ответе,
    // чтобы обновление страницы не отменяло работу.
    void runPlanJob({
      projectId: id,
      userId: auth.session.userId,
      brief,
      chargedRub: charge.chargedRub,
      postsCount,
    });

    return Response.json(
      {
        ok: true,
        status: "running",
        project: toPublicProject(updated!),
        billing: {
          chargedRub: charge.chargedRub,
          balanceRub: user?.balanceRub ?? charge.balanceRub,
          postsCount,
          postsPerDay: freq.postsPerDay,
          postPriceRub: POST_PRICE_RUB,
        },
      },
      { status: 202 }
    );
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
