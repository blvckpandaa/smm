import { readFileSync } from "node:fs";
import { createPublicMediaUrl } from "@/lib/media/public-url";
import type { PostDraft } from "@/lib/smm/types";
import { resolveMediaAbsolutePath } from "@/lib/media/store";

export type VkCreds = {
  /** Токен сообщества — для wall.post от имени группы */
  accessToken: string;
  groupId: string;
  /** Личный токен администратора — опционально, для нативной загрузки фото */
  userAccessToken?: string;
};

function isPhotoUploadBlocked(message?: string): boolean {
  return (
    /unavailable with group auth|group authorization failed/i.test(message || "") ||
    /no access to call this method|cannot be called with current scopes|access denied/i.test(
      message || ""
    )
  );
}

function publicImageAttachment(imagePath: string): string | null {
  const parts = imagePath.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const projectId = parts[0];
  const filename = parts[parts.length - 1];
  if (!projectId || !filename) return null;
  // VK подтягивает превью по ссылке; TTL 30 дней
  return createPublicMediaUrl(projectId, filename, 30 * 24 * 3600);
}

async function tryUploadWallPhoto(
  token: string,
  groupId: string,
  imagePath: string
): Promise<{ attachment: string } | { error: string }> {
  const absolute = resolveMediaAbsolutePath(imagePath);
  if (!absolute) return { error: "Файл фото не найден" };

  const gid = groupId.replace(/^-/, "");
  const serverParams = new URLSearchParams({
    group_id: gid,
    access_token: token,
    v: "5.199",
  });
  const serverRes = await fetch(
    `https://api.vk.com/method/photos.getWallUploadServer?${serverParams}`
  );
  const serverData = (await serverRes.json()) as {
    response?: { upload_url?: string };
    error?: { error_msg?: string; error_code?: number };
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
    group_id: gid,
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

async function uploadWallPhoto(
  creds: VkCreds,
  imagePath: string
): Promise<
  | { attachment: string; mode: "photo" }
  | { error: string; blocked?: boolean }
> {
  const tokens = [
    creds.userAccessToken?.trim(),
    creds.accessToken.trim(),
  ].filter(Boolean) as string[];

  let lastError = "Не удалось загрузить фото VK";
  let blocked = false;

  for (const token of tokens) {
    const result = await tryUploadWallPhoto(token, creds.groupId, imagePath);
    if (!("error" in result)) {
      return { attachment: result.attachment, mode: "photo" };
    }
    lastError = result.error;
    if (isPhotoUploadBlocked(result.error)) {
      blocked = true;
      continue;
    }
    return { error: result.error };
  }

  return { error: lastError, blocked };
}

export async function publishToVk(
  draft: PostDraft,
  creds: VkCreds
): Promise<{ ok: boolean; postId?: string; error?: string; warning?: string }> {
  const token =
    creds.userAccessToken?.trim() || creds.accessToken?.trim() || "";
  const groupId = creds.groupId?.trim();

  if (!token || !groupId) {
    return {
      ok: false,
      error: "Подключите VK в настройках проекта (токен + сообщество)",
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
  let message = `${draft.body}${hashtags}`.slice(0, 15000);
  const ownerId = groupId.startsWith("-") ? groupId : `-${groupId}`;

  try {
    let attachments: string | undefined;
    let warning: string | undefined;

    if (draft.imagePath) {
      const uploaded = await uploadWallPhoto(
        { accessToken: token, groupId, userAccessToken: creds.userAccessToken },
        draft.imagePath
      );

      if ("attachment" in uploaded && uploaded.mode === "photo") {
        attachments = uploaded.attachment;
      } else if ("error" in uploaded) {
        const link = publicImageAttachment(draft.imagePath);
        if (link) {
          // wall.post: одна ссылка в attachments → превью-картинка в посте
          attachments = link;
        } else if (uploaded.blocked) {
          warning =
            "Пост опубликован без фото: VK не даёт загрузить изображение этим токеном.";
        } else {
          return { ok: false, error: uploaded.error };
        }
      }
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
      const msg = data.error.error_msg || "VK API error";
      if (/profile type|unavailable with current profile|1051/i.test(msg)) {
        return {
          ok: false,
          error:
            "Токен не умеет публиковать на стену. Получите личный токен на https://vkhost.github.io/ (Kate Mobile), вставьте его в «Каналы» вместе со ссылкой на сообщество.",
        };
      }
      return { ok: false, error: msg };
    }

    return {
      ok: true,
      postId: String(data.response?.post_id ?? ""),
      warning,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Ошибка публикации VK",
    };
  }
}
