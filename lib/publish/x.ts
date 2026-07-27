import { readFileSync } from "node:fs";
import type { XConnection } from "@/lib/store/projects";
import type { PostDraft } from "@/lib/smm/types";
import { resolveMediaAbsolutePath } from "@/lib/media/store";
import { refreshXToken } from "@/lib/x/oauth";
import { plainSocialText } from "@/lib/text/plain-social";

function textFor(draft: PostDraft): string {
  const title = draft.title?.trim();
  const body = draft.body?.trim() || "";
  const hashtags =
    draft.hashtags.length > 0
      ? " " +
        draft.hashtags
          .slice(0, 3)
          .map((h) => (h.startsWith("#") ? h : `#${h}`))
          .join(" ")
      : "";
  const core =
    title && body && !body.startsWith(title) ? `${title}\n\n${body}` : body || title || "";
  return plainSocialText(`${core}${hashtags}`).slice(0, 280);
}

async function uploadMediaSimple(
  accessToken: string,
  bytes: Buffer,
  mime: string,
  category: "tweet_image" | "tweet_video"
): Promise<string> {
  // initialize
  const initRes = await fetch("https://api.x.com/2/media/upload/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      media_type: mime,
      total_bytes: bytes.length,
      media_category: category,
    }),
  });
  const initData = (await initRes.json()) as {
    data?: { id?: string };
    errors?: { detail?: string }[];
  };
  const mediaId = initData.data?.id;
  if (!mediaId) {
    // fallback: try legacy-style query init
    const legacy = new URLSearchParams({
      command: "INIT",
      total_bytes: String(bytes.length),
      media_type: mime,
      media_category: category,
    });
    const legacyRes = await fetch(
      `https://api.x.com/2/media/upload?${legacy}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const legacyData = (await legacyRes.json()) as {
      data?: { id?: string };
      media_id_string?: string;
      errors?: { detail?: string }[];
    };
    const id = legacyData.data?.id || legacyData.media_id_string;
    if (!id) {
      throw new Error(
        initData.errors?.[0]?.detail ||
          legacyData.errors?.[0]?.detail ||
          "X media INIT failed"
      );
    }
    return uploadAppendFinalize(accessToken, id, bytes, category);
  }
  return uploadAppendFinalize(accessToken, mediaId, bytes, category);
}

async function uploadAppendFinalize(
  accessToken: string,
  mediaId: string,
  bytes: Buffer,
  category: "tweet_image" | "tweet_video"
): Promise<string> {
  const chunkSize = 4 * 1024 * 1024;
  let index = 0;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    const form = new FormData();
    form.append("segment_index", String(index));
    form.append(
      "media",
      new Blob([new Uint8Array(chunk)], {
        type: category === "tweet_video" ? "video/mp4" : "image/jpeg",
      }),
      category === "tweet_video" ? "video.mp4" : "image.jpg"
    );
    const appendRes = await fetch(
      `https://api.x.com/2/media/upload/${mediaId}/append`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      }
    );
    if (!appendRes.ok) {
      const err = await appendRes.text();
      throw new Error(`X media APPEND failed: ${err.slice(0, 200)}`);
    }
    index += 1;
  }

  const finRes = await fetch(
    `https://api.x.com/2/media/upload/${mediaId}/finalize`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!finRes.ok) {
    const err = await finRes.text();
    throw new Error(`X media FINALIZE failed: ${err.slice(0, 200)}`);
  }

  // poll processing for video
  if (category === "tweet_video") {
    for (let i = 0; i < 20; i++) {
      const st = await fetch(
        `https://api.x.com/2/media/upload?command=STATUS&media_id=${mediaId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const stData = (await st.json()) as {
        data?: { processing_info?: { state?: string } };
        processing_info?: { state?: string };
      };
      const state =
        stData.data?.processing_info?.state || stData.processing_info?.state;
      if (!state || state === "succeeded") break;
      if (state === "failed") throw new Error("X video processing failed");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  return mediaId;
}

async function ensureAccessToken(
  creds: XConnection
): Promise<{ token: string; refreshed?: Partial<XConnection> }> {
  if (creds.expiresAt && new Date(creds.expiresAt).getTime() < Date.now() + 60_000) {
    if (!creds.refreshToken) {
      return { token: creds.accessToken };
    }
    const next = await refreshXToken(creds.refreshToken);
    return {
      token: next.accessToken,
      refreshed: {
        accessToken: next.accessToken,
        refreshToken: next.refreshToken,
        expiresAt: next.expiresIn
          ? new Date(Date.now() + next.expiresIn * 1000).toISOString()
          : creds.expiresAt,
      },
    };
  }
  return { token: creds.accessToken };
}

export async function publishToX(
  draft: PostDraft,
  creds: XConnection
): Promise<{
  ok: boolean;
  postId?: string;
  error?: string;
  refreshedCreds?: Partial<XConnection>;
}> {
  try {
    const { token, refreshed } = await ensureAccessToken(creds);
    const text = textFor(draft);
    const mediaIds: string[] = [];

    // Prefer video for X if present, else photo
    if (draft.videoPath) {
      const abs = resolveMediaAbsolutePath(draft.videoPath);
      if (abs) {
        const bytes = readFileSync(abs);
        const id = await uploadMediaSimple(
          token,
          bytes,
          "video/mp4",
          "tweet_video"
        );
        mediaIds.push(id);
      }
    } else if (draft.imagePath) {
      const abs = resolveMediaAbsolutePath(draft.imagePath);
      if (abs) {
        const bytes = readFileSync(abs);
        const id = await uploadMediaSimple(
          token,
          bytes,
          "image/jpeg",
          "tweet_image"
        );
        mediaIds.push(id);
      }
    }

    const body: Record<string, unknown> = { text };
    if (mediaIds.length) {
      body.media = { media_ids: mediaIds };
    }

    const res = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as {
      data?: { id?: string };
      errors?: { detail?: string; title?: string }[];
      detail?: string;
    };
    if (!data.data?.id) {
      return {
        ok: false,
        error:
          data.errors?.[0]?.detail ||
          data.errors?.[0]?.title ||
          data.detail ||
          "Ошибка публикации X",
        refreshedCreds: refreshed,
      };
    }
    return { ok: true, postId: data.data.id, refreshedCreds: refreshed };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Ошибка X",
    };
  }
}
