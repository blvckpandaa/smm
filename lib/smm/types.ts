import type { BrandBrief, ContentPlan, PlannedPost } from "@/lib/marketer/types";

export type DraftStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "rejected"
  | "published"
  | "failed";

export interface PostDraft {
  id: string;
  planPostId: string;
  channel: PlannedPost["channel"];
  day: string;
  weekday: string;
  timeLocal: string;
  scheduledAtIso: string;
  topic: string;
  goal: string;
  format: string;
  cta: string;
  title: string;
  body: string;
  hashtags: string[];
  status: DraftStatus;
  /** Решение маркетолога: нужен ли визуал */
  needsPhoto?: boolean;
  mediaHint?: string;
  /** Промпт, по которому сгенерировали фото */
  imagePrompt?: string;
  /** Относительный путь в data/media: projectId/file.jpg */
  imagePath?: string;
  /** Промпт для видео */
  videoPrompt?: string;
  /** Относительный путь к ролику: projectId/file-video.mp4 */
  videoPath?: string;
  /** Маркетолог: нужен короткий ролик */
  needsVideo?: boolean;
  scheduleWhy?: string;
  publishError?: string;
  publishedExternalId?: string;
}

export interface WritePostsInput {
  brief: BrandBrief;
  plan: ContentPlan;
}
