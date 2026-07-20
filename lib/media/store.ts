import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MEDIA_ROOT = join(process.cwd(), "data", "media");

export function mediaDir(projectId: string): string {
  const dir = join(MEDIA_ROOT, projectId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function saveProjectImage(
  projectId: string,
  draftId: string,
  bytes: Buffer,
  ext = "jpg"
): { relativePath: string; absolutePath: string } {
  const safeDraft = draftId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${safeDraft}.${ext}`;
  const absolutePath = join(mediaDir(projectId), filename);
  writeFileSync(absolutePath, bytes);
  return {
    relativePath: `${projectId}/${filename}`,
    absolutePath,
  };
}

export function saveProjectVideo(
  projectId: string,
  draftId: string,
  bytes: Buffer,
  ext = "mp4"
): { relativePath: string; absolutePath: string } {
  const safeDraft = draftId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${safeDraft}-video.${ext}`;
  const absolutePath = join(mediaDir(projectId), filename);
  writeFileSync(absolutePath, bytes);
  return {
    relativePath: `${projectId}/${filename}`,
    absolutePath,
  };
}

export function readProjectImage(
  projectId: string,
  filename: string
): { bytes: Buffer; contentType: string } | null {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safe || safe !== filename) return null;
  const absolutePath = join(MEDIA_ROOT, projectId, safe);
  if (!existsSync(absolutePath)) return null;
  const lower = safe.toLowerCase();
  const contentType = lower.endsWith(".png")
    ? "image/png"
    : lower.endsWith(".webp")
      ? "image/webp"
      : lower.endsWith(".mp4")
        ? "video/mp4"
        : lower.endsWith(".webm")
          ? "video/webm"
          : "image/jpeg";
  return { bytes: readFileSync(absolutePath), contentType };
}

export function resolveMediaAbsolutePath(relativePath: string): string | null {
  const parts = relativePath.split("/").filter(Boolean);
  if (parts.length !== 2) return null;
  const [projectId, filename] = parts;
  const safeProject = projectId.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeFile = filename.replace(/[^a-zA-Z0-9._-]/g, "");
  if (safeProject !== projectId || safeFile !== filename) return null;
  const absolutePath = join(MEDIA_ROOT, safeProject, safeFile);
  return existsSync(absolutePath) ? absolutePath : null;
}
