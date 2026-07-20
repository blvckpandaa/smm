import { createHmac, timingSafeEqual } from "node:crypto";
import { getAppUrl } from "@/lib/meta/config";

function mediaSecret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.META_APP_SECRET?.trim() ||
    "agentmark-media"
  );
}

/** Публичный URL картинки для Meta (без cookie сессии). */
export function createPublicMediaUrl(
  projectId: string,
  filename: string,
  ttlSec = 3600
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = `${projectId}:${filename}:${exp}`;
  const sig = createHmac("sha256", mediaSecret())
    .update(payload)
    .digest("base64url");
  const params = new URLSearchParams({
    p: projectId,
    f: filename,
    exp: String(exp),
    sig,
  });
  return `${getAppUrl()}/api/public/media?${params}`;
}

export function verifyPublicMediaParams(options: {
  projectId: string;
  filename: string;
  exp: string;
  sig: string;
}): boolean {
  const expNum = Number(options.exp);
  if (!Number.isFinite(expNum) || expNum < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const payload = `${options.projectId}:${options.filename}:${options.exp}`;
  const expected = createHmac("sha256", mediaSecret())
    .update(payload)
    .digest("base64url");
  const a = Buffer.from(options.sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
