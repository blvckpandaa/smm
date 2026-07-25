import { chargeAndSendBotReply } from "@/lib/bots/process-comment";
import { resolveVkCallbackConfirmation } from "@/lib/bots/vk-callback-setup";
import { replyVkWallComment } from "@/lib/bots/vk-reply";
import { isBotReady } from "@/lib/bots/types";
import {
  findProjectByVkGroupId,
  getCommentBot,
  getProject,
  setCommentBot,
  touchBotWebhook,
} from "@/lib/store/projects";

const inFlight = new Set<string>();

type VkCallbackBody = {
  type?: string;
  group_id?: number;
  secret?: string;
  object?: {
    id?: number;
    from_id?: number;
    post_id?: number;
    owner_id?: number;
    text?: string;
    reply_to_user?: number;
    reply_to_comment?: number;
    comment?: {
      id?: number;
      from_id?: number;
      post_id?: number;
      text?: string;
    };
  };
};

function pickComment(body: VkCallbackBody) {
  const raw = body.object?.comment ?? body.object;
  if (!raw) return null;
  const id = raw.id;
  const postId = raw.post_id ?? body.object?.post_id;
  const fromId = raw.from_id;
  const text = (raw.text ?? "").trim();
  if (id == null || postId == null) return null;
  return { id, postId, fromId, text };
}

/**
 * VK Callback API.
 * На confirmation всегда спрашиваем строку у VK (groups.getCallbackConfirmationCode).
 */
export async function POST(req: Request) {
  let body: VkCallbackBody;
  try {
    body = (await req.json()) as VkCallbackBody;
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const groupId = body.group_id != null ? String(body.group_id) : "";
  let project = groupId ? findProjectByVkGroupId(groupId) : null;
  let bot = project ? getCommentBot(project, "vk") : null;

  if (body.type === "confirmation") {
    if (!project?.channels.vk) {
      return new Response("ok", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const vk = project.channels.vk;
    const resolved = await resolveVkCallbackConfirmation({
      groupId: vk.groupId || groupId,
      communityToken: vk.accessToken,
      userToken: vk.userAccessToken,
    });

    if (!resolved.ok) {
      touchBotWebhook(project.id, "vk", {
        type: "confirmation",
        note: `Не получили code от VK: ${resolved.error}`,
      });
      const fallback = bot?.vkConfirmation?.trim();
      if (fallback) {
        return new Response(fallback, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      }
      return new Response("ok", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    setCommentBot(project.id, project.userId, "vk", {
      ...getCommentBot(project, "vk"),
      vkConfirmation: resolved.code,
    });
    touchBotWebhook(project.id, "vk", {
      type: "confirmation",
      note: `Отдали code от VK API (${resolved.via}): ${resolved.code}`,
    });

    return new Response(resolved.code, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const ack = new Response("ok", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });

  if (!project || !bot) return ack;

  touchBotWebhook(project.id, "vk", {
    type: body.type || "unknown",
    note: `secret=${body.secret ? "yes" : "no"}`,
  });
  project = getProject(project.id) ?? project;
  bot = getCommentBot(project, "vk");

  if (!isBotReady(bot)) {
    touchBotWebhook(project.id, "vk", {
      type: body.type,
      note: "Бот выключен или не оплачен — событие проигнорировано",
    });
    return ack;
  }

  if (bot.vkSecret && body.secret && body.secret !== bot.vkSecret) {
    touchBotWebhook(project.id, "vk", {
      type: body.type,
      note: "Секрет в VK отличается от кабинета — событие всё равно обрабатываем",
    });
  }

  if (body.type !== "wall_reply_new") return ack;

  const obj = pickComment(body);
  if (!obj || !obj.text) {
    touchBotWebhook(project.id, "vk", {
      type: body.type,
      note: "Пустой комментарий или нет id/post_id",
    });
    return ack;
  }

  const gidNum = Math.abs(Number(groupId));
  if (obj.fromId != null && obj.fromId < 0) return ack;
  if (obj.fromId != null && Math.abs(obj.fromId) === gidNum) return ack;

  const vk = project.channels.vk;
  if (!vk?.accessToken) {
    touchBotWebhook(project.id, "vk", {
      type: body.type,
      note: "Нет токена VK у проекта",
    });
    return ack;
  }

  const commentId = String(obj.id);
  const flightKey = `${project.id}:vk:${commentId}`;
  if (inFlight.has(flightKey)) return ack;
  if (
    (project.botReplies ?? []).some(
      (r) => r.channel === "vk" && r.commentId === commentId && r.ok
    )
  ) {
    return ack;
  }

  inFlight.add(flightKey);
  void chargeAndSendBotReply({
    project,
    channel: "vk",
    bot,
    commentId,
    commentText: obj.text,
    send: async (replyText) =>
      replyVkWallComment({
        accessToken: vk.accessToken,
        groupId: vk.groupId,
        postId: obj.postId,
        replyToComment: obj.id,
        message: replyText,
      }),
  }).finally(() => {
    inFlight.delete(flightKey);
  });

  return ack;
}
