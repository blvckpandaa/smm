import type { InstagramConnection } from "@/lib/store/projects";
import type { PostDraft } from "@/lib/smm/types";
import { createPublicMediaUrl } from "@/lib/media/public-url";
import { plainSocialText } from "@/lib/text/plain-social";

function captionFor(draft: PostDraft): string {
  const title = draft.title?.trim();
  const body = draft.body?.trim() || "";
  const hashtags =
    draft.hashtags.length > 0
      ? "\n\n" +
        draft.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")
      : "";
  // Описание поста в Instagram = текст (заголовок + body)
  const core =
    title && body && !body.startsWith(title) ? `${title}\n\n${body}` : body || title || "";
  return plainSocialText(`${core}${hashtags}`).slice(0, 2200);
}

async function waitContainerReady(
  creationId: string,
  accessToken: string
): Promise<boolean> {
  for (let i = 0; i < 12; i++) {
    const params = new URLSearchParams({
      fields: "status_code",
      access_token: accessToken,
    });
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${creationId}?${params}`
    );
    const data = (await res.json()) as { status_code?: string };
    if (data.status_code === "FINISHED") return true;
    if (data.status_code === "ERROR") return false;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

export async function publishToInstagram(
  draft: PostDraft,
  creds: InstagramConnection
): Promise<{ ok: boolean; postId?: string; error?: string }> {
  if (creds.isStub || creds.pageAccessToken === "stub") {
    if (!draft.imagePath) {
      return {
        ok: false,
        error: "Для Instagram нужно фото (даже в режиме заглушки)",
      };
    }
    return { ok: true, postId: `stub-ig-${Date.now()}` };
  }
  try {
    if (!draft.imagePath) {
      return {
        ok: false,
        error: "Для Instagram нужно фото. Сгенерируйте или приложите изображение.",
      };
    }
    const file = draft.imagePath.split("/").pop();
    const projectId = draft.imagePath.split("/")[0];
    if (!file || !projectId) {
      return { ok: false, error: "Некорректный путь к фото" };
    }

    const imageUrl = createPublicMediaUrl(projectId, file);
    const createParams = new URLSearchParams({
      image_url: imageUrl,
      caption: captionFor(draft),
      access_token: creds.pageAccessToken,
    });
    const createRes = await fetch(
      `https://graph.facebook.com/v21.0/${creds.igUserId}/media`,
      { method: "POST", body: createParams }
    );
    const created = (await createRes.json()) as {
      id?: string;
      error?: { message?: string };
    };
    if (!created.id) {
      return {
        ok: false,
        error: created.error?.message || "Не удалось создать контейнер IG",
      };
    }

    const ready = await waitContainerReady(created.id, creds.pageAccessToken);
    if (!ready) {
      return { ok: false, error: "Контейнер Instagram не готов к публикации" };
    }

    const publishParams = new URLSearchParams({
      creation_id: created.id,
      access_token: creds.pageAccessToken,
    });
    const pubRes = await fetch(
      `https://graph.facebook.com/v21.0/${creds.igUserId}/media_publish`,
      { method: "POST", body: publishParams }
    );
    const published = (await pubRes.json()) as {
      id?: string;
      error?: { message?: string };
    };
    if (!published.id) {
      return {
        ok: false,
        error: published.error?.message || "Ошибка публикации Instagram",
      };
    }
    return { ok: true, postId: published.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Ошибка Instagram",
    };
  }
}
