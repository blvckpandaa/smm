import type { FacebookConnection } from "@/lib/store/projects";
import type { PostDraft } from "@/lib/smm/types";
import { createPublicMediaUrl } from "@/lib/media/public-url";
import { plainSocialText } from "@/lib/text/plain-social";

function messageFor(draft: PostDraft): string {
  const hashtags =
    draft.hashtags.length > 0
      ? "\n\n" +
        draft.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")
      : "";
  return plainSocialText(`${draft.body}${hashtags}`).slice(0, 6000);
}

export async function publishToFacebook(
  draft: PostDraft,
  creds: FacebookConnection
): Promise<{ ok: boolean; postId?: string; error?: string }> {
  if (creds.isStub || creds.pageAccessToken === "stub") {
    return {
      ok: true,
      postId: `stub-fb-${Date.now()}`,
    };
  }
  try {
    if (draft.imagePath) {
      const file = draft.imagePath.split("/").pop();
      const projectId = draft.imagePath.split("/")[0];
      if (file && projectId) {
        const url = createPublicMediaUrl(projectId, file);
        const params = new URLSearchParams({
          url,
          caption: messageFor(draft),
          access_token: creds.pageAccessToken,
        });
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${creds.pageId}/photos`,
          { method: "POST", body: params }
        );
        const data = (await res.json()) as {
          id?: string;
          post_id?: string;
          error?: { message?: string };
        };
        if (data.error || (!data.id && !data.post_id)) {
          return {
            ok: false,
            error: data.error?.message || "Facebook photo error",
          };
        }
        return { ok: true, postId: String(data.post_id || data.id) };
      }
    }

    const params = new URLSearchParams({
      message: messageFor(draft),
      access_token: creds.pageAccessToken,
    });
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${creds.pageId}/feed`,
      { method: "POST", body: params }
    );
    const data = (await res.json()) as {
      id?: string;
      error?: { message?: string };
    };
    if (!data.id) {
      return { ok: false, error: data.error?.message || "Facebook feed error" };
    }
    return { ok: true, postId: data.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Ошибка Facebook",
    };
  }
}
