import { readFileSync } from "node:fs";
import type { PostDraft } from "@/lib/smm/types";
import { resolveMediaAbsolutePath } from "@/lib/media/store";

export type VkCreds = {
  accessToken: string;
  groupId: string;
};

async function uploadWallPhoto(
  creds: VkCreds,
  imagePath: string
): Promise<{ attachment: string } | { error: string }> {
  const absolute = resolveMediaAbsolutePath(imagePath);
  if (!absolute) return { error: "Файл фото не найден" };

  const groupId = creds.groupId.replace(/^-/, "");
  const token = creds.accessToken;

  const serverParams = new URLSearchParams({
    group_id: groupId,
    access_token: token,
    v: "5.199",
  });
  const serverRes = await fetch(
    `https://api.vk.com/method/photos.getWallUploadServer?${serverParams}`
  );
  const serverData = (await serverRes.json()) as {
    response?: { upload_url?: string };
    error?: { error_msg?: string };
  };
  if (serverData.error || !serverData.response?.upload_url) {
    return {
      error: serverData.error?.error_msg || "Не удалось получить upload URL VK",
    };
  }

  const bytes = readFileSync(absolute);
  const form = new FormData();
  form.append(
    "photo",
    new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }),
    "post.jpg"
  );

  const uploadRes = await fetch(serverData.response.upload_url, {
    method: "POST",
    body: form,
  });
  const uploadJson = (await uploadRes.json()) as {
    server?: number;
    photo?: string;
    hash?: string;
  };
  if (!uploadJson.photo || uploadJson.server == null || !uploadJson.hash) {
    return { error: "VK не принял загрузку фото" };
  }

  const saveParams = new URLSearchParams({
    group_id: groupId,
    server: String(uploadJson.server),
    photo: uploadJson.photo,
    hash: uploadJson.hash,
    access_token: token,
    v: "5.199",
  });
  const saveRes = await fetch(
    `https://api.vk.com/method/photos.saveWallPhoto?${saveParams}`,
    { method: "POST" }
  );
  const saveData = (await saveRes.json()) as {
    response?: { id: number; owner_id: number }[];
    error?: { error_msg?: string };
  };
  const photo = saveData.response?.[0];
  if (saveData.error || !photo) {
    return {
      error: saveData.error?.error_msg || "Не удалось сохранить фото VK",
    };
  }

  return { attachment: `photo${photo.owner_id}_${photo.id}` };
}

export async function publishToVk(
  draft: PostDraft,
  creds: VkCreds
): Promise<{ ok: boolean; postId?: string; error?: string }> {
  const token = creds.accessToken?.trim();
  const groupId = creds.groupId?.trim();

  if (!token || !groupId) {
    return {
      ok: false,
      error: "Подключите VK в настройках проекта (token + group id)",
    };
  }

  if (draft.channel !== "vk") {
    return { ok: false, error: "Этот пост не для VK" };
  }

  const hashtags =
    draft.hashtags.length > 0
      ? "\n\n" +
        draft.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")
      : "";
  const message = `${draft.body}${hashtags}`.slice(0, 15000);
  const ownerId = groupId.startsWith("-") ? groupId : `-${groupId}`;

  try {
    let attachments: string | undefined;
    if (draft.imagePath) {
      const uploaded = await uploadWallPhoto(
        { accessToken: token, groupId },
        draft.imagePath
      );
      if ("error" in uploaded) {
        return { ok: false, error: uploaded.error };
      }
      attachments = uploaded.attachment;
    }

    const params = new URLSearchParams({
      owner_id: ownerId,
      from_group: "1",
      message,
      access_token: token,
      v: "5.199",
    });
    if (attachments) params.set("attachments", attachments);

    const res = await fetch(`https://api.vk.com/method/wall.post?${params}`, {
      method: "POST",
    });
    const data = (await res.json()) as {
      response?: { post_id?: number };
      error?: { error_msg?: string };
    };

    if (data.error) {
      return { ok: false, error: data.error.error_msg || "VK API error" };
    }

    return {
      ok: true,
      postId: String(data.response?.post_id ?? ""),
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Ошибка публикации VK",
    };
  }
}
