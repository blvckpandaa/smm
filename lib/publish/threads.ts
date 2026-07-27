import type { ThreadsConnection } from "@/lib/store/projects";
import type { PostDraft } from "@/lib/smm/types";
import { plainSocialText } from "@/lib/text/plain-social";

/** Threads публикуем только текстом, без фото. */
function textFor(draft: PostDraft): string {
  const title = draft.title?.trim();
  const body = draft.body?.trim() || "";
  const hashtags =
    draft.hashtags.length > 0
      ? "\n\n" +
        draft.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")
      : "";
  const core = title && !body.startsWith(title) ? `${title}\n\n${body}` : body;
  return plainSocialText(`${core}${hashtags}`).slice(0, 500);
}

async function waitThreadsContainer(
  creationId: string,
  accessToken: string
): Promise<boolean> {
  for (let i = 0; i < 10; i++) {
    const params = new URLSearchParams({
      fields: "status,error_message",
      access_token: accessToken,
    });
    const res = await fetch(
      `https://graph.threads.net/v1.0/${creationId}?${params}`
    );
    const data = (await res.json()) as {
      status?: string;
      error_message?: string;
    };
    if (data.status === "FINISHED") return true;
    if (data.status === "ERROR") return false;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return true;
}

export async function publishToThreads(
  draft: PostDraft,
  creds: ThreadsConnection
): Promise<{ ok: boolean; postId?: string; error?: string }> {
  if (creds.isStub || creds.accessToken === "stub") {
    return { ok: true, postId: `stub-th-${Date.now()}` };
  }
  try {
    const createParams = new URLSearchParams({
      media_type: "TEXT",
      text: textFor(draft),
      access_token: creds.accessToken,
    });

    const createRes = await fetch(
      `https://graph.threads.net/v1.0/${creds.threadsUserId}/threads`,
      { method: "POST", body: createParams }
    );
    const created = (await createRes.json()) as {
      id?: string;
      error?: { message?: string };
    };
    if (!created.id) {
      return {
        ok: false,
        error: created.error?.message || "Не удалось создать Threads контейнер",
      };
    }

    await waitThreadsContainer(created.id, creds.accessToken);

    const pubParams = new URLSearchParams({
      creation_id: created.id,
      access_token: creds.accessToken,
    });
    const pubRes = await fetch(
      `https://graph.threads.net/v1.0/${creds.threadsUserId}/threads_publish`,
      { method: "POST", body: pubParams }
    );
    const published = (await pubRes.json()) as {
      id?: string;
      error?: { message?: string };
    };
    if (!published.id) {
      return {
        ok: false,
        error: published.error?.message || "Ошибка публикации Threads",
      };
    }
    return { ok: true, postId: published.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Ошибка Threads",
    };
  }
}
