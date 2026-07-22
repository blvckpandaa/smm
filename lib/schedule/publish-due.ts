import { publishToFacebook } from "@/lib/publish/facebook";
import { publishToInstagram } from "@/lib/publish/instagram";
import { publishToTelegram } from "@/lib/publish/telegram";
import { publishToThreads } from "@/lib/publish/threads";
import { publishToVk } from "@/lib/publish/vk";
import { publishToX } from "@/lib/publish/x";
import type { PostDraft } from "@/lib/smm/types";
import {
  getProject,
  listProjects,
  updateProject,
  type Project,
} from "@/lib/store/projects";

/**
 * Публикует посты со статусом scheduled, у которых время уже наступило.
 */
export async function publishDueDrafts(projectId?: string): Promise<{
  published: number;
  errors: string[];
}> {
  const projects = projectId
    ? ([getProject(projectId)].filter(Boolean) as Project[])
    : listProjects().filter((p) => p.userId);

  let published = 0;
  const errors: string[] = [];
  const now = Date.now();

  for (const project of projects) {
    let changed = false;
    const drafts: PostDraft[] = [];

    for (const draft of project.drafts) {
      const due =
        draft.status === "scheduled" &&
        new Date(draft.scheduledAtIso).getTime() <= now;

      if (!due) {
        drafts.push(draft);
        continue;
      }

      if (draft.channel === "telegram") {
        const creds = project.channels.telegram;
        if (!creds) {
          drafts.push({
            ...draft,
            status: "failed",
            publishError: "Telegram не подключён",
          });
          changed = true;
          errors.push(`${draft.id}: нет Telegram`);
          continue;
        }
        const result = await publishToTelegram(draft, creds);
        if (!result.ok) {
          drafts.push({
            ...draft,
            status: "failed",
            publishError: result.error,
          });
          changed = true;
          errors.push(`${draft.id}: ${result.error}`);
          continue;
        }
        drafts.push({
          ...draft,
          status: "published",
          publishedExternalId: result.messageId,
          publishError: undefined,
        });
        published += 1;
        changed = true;
        continue;
      }

      if (draft.channel === "vk") {
        const creds = project.channels.vk;
        if (!creds) {
          drafts.push({
            ...draft,
            status: "failed",
            publishError: "VK не подключён",
          });
          changed = true;
          errors.push(`${draft.id}: нет VK`);
          continue;
        }
        const result = await publishToVk(draft, creds);
        if (!result.ok) {
          drafts.push({
            ...draft,
            status: "failed",
            publishError: result.error,
          });
          changed = true;
          errors.push(`${draft.id}: ${result.error}`);
          continue;
        }
        drafts.push({
          ...draft,
          status: "published",
          publishedExternalId: result.postId,
          publishError: result.warning,
        });
        published += 1;
        changed = true;
        continue;
      }

      if (draft.channel === "facebook") {
        const creds = project.channels.facebook;
        if (!creds) {
          drafts.push({
            ...draft,
            status: "failed",
            publishError: "Facebook не подключён",
          });
          changed = true;
          errors.push(`${draft.id}: нет Facebook`);
          continue;
        }
        const result = await publishToFacebook(draft, creds);
        if (!result.ok) {
          drafts.push({
            ...draft,
            status: "failed",
            publishError: result.error,
          });
          changed = true;
          errors.push(`${draft.id}: ${result.error}`);
          continue;
        }
        drafts.push({
          ...draft,
          status: "published",
          publishedExternalId: result.postId,
          publishError: undefined,
        });
        published += 1;
        changed = true;
        continue;
      }

      if (draft.channel === "instagram") {
        const creds = project.channels.instagram;
        if (!creds) {
          drafts.push({
            ...draft,
            status: "failed",
            publishError: "Instagram не подключён",
          });
          changed = true;
          errors.push(`${draft.id}: нет Instagram`);
          continue;
        }
        const result = await publishToInstagram(draft, creds);
        if (!result.ok) {
          drafts.push({
            ...draft,
            status: "failed",
            publishError: result.error,
          });
          changed = true;
          errors.push(`${draft.id}: ${result.error}`);
          continue;
        }
        drafts.push({
          ...draft,
          status: "published",
          publishedExternalId: result.postId,
          publishError: undefined,
        });
        published += 1;
        changed = true;
        continue;
      }

      if (draft.channel === "threads") {
        const creds = project.channels.threads;
        if (!creds) {
          drafts.push({
            ...draft,
            status: "failed",
            publishError: "Threads не подключён",
          });
          changed = true;
          errors.push(`${draft.id}: нет Threads`);
          continue;
        }
        const result = await publishToThreads(draft, creds);
        if (!result.ok) {
          drafts.push({
            ...draft,
            status: "failed",
            publishError: result.error,
          });
          changed = true;
          errors.push(`${draft.id}: ${result.error}`);
          continue;
        }
        drafts.push({
          ...draft,
          status: "published",
          publishedExternalId: result.postId,
          publishError: undefined,
        });
        published += 1;
        changed = true;
        continue;
      }

      if (draft.channel === "x") {
        const creds = project.channels.x;
        if (!creds) {
          drafts.push({
            ...draft,
            status: "failed",
            publishError: "X не подключён",
          });
          changed = true;
          errors.push(`${draft.id}: нет X`);
          continue;
        }
        const result = await publishToX(draft, creds);
        if (result.refreshedCreds) {
          updateProject(project.id, project.userId, {
            channels: {
              ...project.channels,
              x: { ...creds, ...result.refreshedCreds },
            },
          });
        }
        if (!result.ok) {
          drafts.push({
            ...draft,
            status: "failed",
            publishError: result.error,
          });
          changed = true;
          errors.push(`${draft.id}: ${result.error}`);
          continue;
        }
        drafts.push({
          ...draft,
          status: "published",
          publishedExternalId: result.postId,
          publishError: undefined,
        });
        published += 1;
        changed = true;
        continue;
      }

      drafts.push(draft);
    }

    if (changed) {
      updateProject(project.id, project.userId, { drafts });
    }
  }

  return { published, errors };
}
