/** Ответ на комментарий VK от имени сообщества */
export async function replyVkWallComment(input: {
  accessToken: string;
  groupId: string;
  postId: number;
  replyToComment: number;
  message: string;
}): Promise<{ ok: boolean; commentId?: number; error?: string }> {
  const ownerId = -Math.abs(Number(String(input.groupId).replace(/^-/, "")));
  const params = new URLSearchParams({
    owner_id: String(ownerId),
    post_id: String(input.postId),
    reply_to_comment: String(input.replyToComment),
    from_group: String(Math.abs(ownerId)),
    message: input.message.slice(0, 4000),
    access_token: input.accessToken,
    v: "5.199",
  });

  try {
    const res = await fetch(`https://api.vk.com/method/wall.createComment?${params}`);
    const data = (await res.json()) as {
      response?: number;
      error?: { error_msg?: string; error_code?: number };
    };
    if (data.error || data.response == null) {
      return {
        ok: false,
        error: data.error?.error_msg || "VK wall.createComment failed",
      };
    }
    return { ok: true, commentId: data.response };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "VK network error",
    };
  }
}
