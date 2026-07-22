import { requireSession } from "@/lib/auth/request";
import { publishToFacebook } from "@/lib/publish/facebook";
import { publishToInstagram } from "@/lib/publish/instagram";
import { publishToTelegram } from "@/lib/publish/telegram";
import { publishToThreads } from "@/lib/publish/threads";
import { publishToVk } from "@/lib/publish/vk";
import { publishToX } from "@/lib/publish/x";
import type { Channel } from "@/lib/marketer/types";
import type { PostDraft } from "@/lib/smm/types";
import {
  getProjectForUser,
  toPublicProject,
  updateProject,
} from "@/lib/store/projects";

type Ctx = { params: Promise<{ id: string }> };

type PublishChannel = Extract<
  Channel,
  "telegram" | "vk" | "facebook" | "instagram" | "threads" | "x"
>;

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const project = getProjectForUser(id, auth.session.userId);
  if (!project) return Response.json({ error: "Проект не найден" }, { status: 404 });

  try {
    const body = (await req.json()) as {
      draftId?: string;
      draft?: PostDraft;
      channel?: PublishChannel;
    };

    const draft =
      body.draft ?? project.drafts.find((d) => d.id === body.draftId);

    if (!draft?.body) {
      return Response.json({ error: "Выберите пост для публикации" }, { status: 400 });
    }

    const channel = (body.channel || draft.channel) as PublishChannel;
    const userId = auth.session.userId;

    let result: {
      ok: boolean;
      postId?: string;
      messageId?: string;
      error?: string;
      warning?: string;
      refreshedCreds?: Record<string, unknown>;
    };

    if (channel === "telegram") {
      if (!project.channels.telegram) {
        return Response.json(
          { ok: false, error: "Сначала подключите Telegram" },
          { status: 400 }
        );
      }
      result = await publishToTelegram(
        { ...draft, channel: "telegram" },
        project.channels.telegram
      );
    } else if (channel === "vk") {
      if (!project.channels.vk) {
        return Response.json(
          { ok: false, error: "Сначала подключите VK" },
          { status: 400 }
        );
      }
      result = await publishToVk(
        { ...draft, channel: "vk" },
        {
          accessToken: project.channels.vk.accessToken,
          groupId: project.channels.vk.groupId,
          userAccessToken: project.channels.vk.userAccessToken,
        }
      );
    } else if (channel === "facebook") {
      if (!project.channels.facebook) {
        return Response.json(
          { ok: false, error: "Сначала подключите Facebook" },
          { status: 400 }
        );
      }
      result = await publishToFacebook(
        { ...draft, channel: "facebook" },
        project.channels.facebook
      );
    } else if (channel === "instagram") {
      if (!project.channels.instagram) {
        return Response.json(
          { ok: false, error: "Сначала подключите Instagram" },
          { status: 400 }
        );
      }
      result = await publishToInstagram(
        { ...draft, channel: "instagram" },
        project.channels.instagram
      );
    } else if (channel === "threads") {
      if (!project.channels.threads) {
        return Response.json(
          { ok: false, error: "Сначала подключите Threads" },
          { status: 400 }
        );
      }
      result = await publishToThreads(
        { ...draft, channel: "threads" },
        project.channels.threads
      );
    } else if (channel === "x") {
      if (!project.channels.x) {
        return Response.json(
          { ok: false, error: "Сначала подключите X" },
          { status: 400 }
        );
      }
      result = await publishToX({ ...draft, channel: "x" }, project.channels.x);
      if (result.refreshedCreds && project.channels.x) {
        updateProject(id, userId, {
          channels: {
            ...project.channels,
            x: { ...project.channels.x, ...result.refreshedCreds },
          },
        });
      }
    } else {
      return Response.json({ error: "Неизвестный канал" }, { status: 400 });
    }

    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: 400 });
    }

    const externalId = result.postId || result.messageId || "";
    const fresh = getProjectForUser(id, userId) || project;
    const drafts = fresh.drafts.map((d) =>
      d.id === draft.id
        ? {
            ...d,
            ...draft,
            status: "published" as const,
            publishedExternalId: externalId,
            publishError: result.warning,
          }
        : d
    );
    const updated = updateProject(id, userId, { drafts });
    return Response.json({
      ok: true,
      externalId,
      channel,
      warning: result.warning,
      project: toPublicProject(updated!),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка публикации";
    return Response.json({ error: message }, { status: 500 });
  }
}
