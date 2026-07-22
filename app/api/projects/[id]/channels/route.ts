import { requireSession } from "@/lib/auth/request";
import {
  getProjectForUser,
  removeChannel,
  setMetaStubChannel,
  setTelegramChannel,
  setVkChannel,
  toPublicProject,
} from "@/lib/store/projects";
import { verifyVkPublishToken } from "@/lib/vk/oauth";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const userId = auth.session.userId;

  if (!getProjectForUser(id, userId)) {
    return Response.json({ error: "Проект не найден" }, { status: 404 });
  }

  try {
    const body = (await req.json()) as {
      channel?: "telegram" | "vk" | "facebook" | "instagram" | "threads";
      stub?: boolean;
      botToken?: string;
      chatId?: string;
      accessToken?: string;
      groupId?: string;
      groupName?: string;
    };

    if (
      body.stub &&
      (body.channel === "facebook" ||
        body.channel === "instagram" ||
        body.channel === "threads")
    ) {
      const updated = setMetaStubChannel(id, userId, body.channel);
      return Response.json({
        project: toPublicProject(updated!),
        stub: true,
      });
    }

    if (body.channel === "telegram") {
      if (!body.botToken?.trim() || !body.chatId?.trim()) {
        return Response.json(
          { error: "Нужны токен бота и ID канала" },
          { status: 400 }
        );
      }
      const updated = setTelegramChannel(id, userId, {
        botToken: body.botToken,
        chatId: body.chatId,
      });
      return Response.json({ project: toPublicProject(updated!) });
    }

    if (body.channel === "vk") {
      if (!body.accessToken?.trim() || !body.groupId?.trim()) {
        return Response.json(
          { error: "Нужны токен и ссылка/ID сообщества VK" },
          { status: 400 }
        );
      }
      const verified = await verifyVkPublishToken({
        accessToken: body.accessToken,
        groupId: body.groupId,
      });
      if (!verified.ok) {
        return Response.json({ error: verified.error }, { status: 400 });
      }
      const updated = setVkChannel(id, userId, {
        accessToken: body.accessToken,
        groupId: String(verified.group.id),
        groupName: body.groupName?.trim() || verified.group.name,
        vkUserId: verified.vkUserId,
        // Личный токен — и для постов, и для фото
        userAccessToken:
          verified.mode === "user" ? body.accessToken.trim() : undefined,
      });
      return Response.json({ project: toPublicProject(updated!) });
    }

    return Response.json(
      { error: "Выберите канал или stub для Meta" },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const channel = url.searchParams.get("channel") as
    | "telegram"
    | "vk"
    | "facebook"
    | "instagram"
    | "threads"
    | "x"
    | null;
  if (
    channel !== "telegram" &&
    channel !== "vk" &&
    channel !== "facebook" &&
    channel !== "instagram" &&
    channel !== "threads" &&
    channel !== "x"
  ) {
    return Response.json(
      { error: "Укажите channel=telegram|vk|facebook|instagram|threads|x" },
      { status: 400 }
    );
  }
  const updated = removeChannel(id, auth.session.userId, channel);
  if (!updated) {
    return Response.json({ error: "Проект не найден" }, { status: 404 });
  }
  return Response.json({ project: toPublicProject(updated) });
}
