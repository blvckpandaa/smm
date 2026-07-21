import { createHmac, timingSafeEqual } from "node:crypto";

export type MetaTarget = "facebook" | "instagram" | "threads";

export function getMetaAppId(): string | undefined {
  return process.env.META_APP_ID?.trim() || undefined;
}

export function getMetaAppSecret(): string | undefined {
  return process.env.META_APP_SECRET?.trim() || undefined;
}

export function getAppUrl(): string {
  const raw =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://smm-agents.ru";
  return raw.replace(/\/$/, "");
}

export function getMetaRedirectUri(): string {
  return `${getAppUrl()}/api/meta/callback`;
}

export function isMetaConfigured(): boolean {
  return Boolean(getMetaAppId() && getMetaAppSecret());
}

/** Режим заглушки: нет ключей Meta или явно META_USE_STUB=1 */
export function useMetaStub(): boolean {
  const force =
    process.env.META_USE_STUB?.trim().toLowerCase() === "1" ||
    process.env.META_USE_STUB?.trim().toLowerCase() === "true";
  if (force) return true;
  return !isMetaConfigured();
}

function stateSecret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    getMetaAppSecret() ||
    "smm-agents-meta-state"
  );
}

export function signOAuthState(payload: {
  projectId: string;
  userId: string;
  target: MetaTarget;
}): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + 15 * 60_000 })
  ).toString("base64url");
  const sig = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readOAuthState(state: string | null): {
  projectId: string;
  userId: string;
  target: MetaTarget;
} | null {
  if (!state) return null;
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", stateSecret())
    .update(body)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as {
      projectId?: string;
      userId?: string;
      target?: MetaTarget;
      exp?: number;
    };
    if (!data.projectId || !data.userId || !data.target || !data.exp) return null;
    if (data.exp < Date.now()) return null;
    if (!["facebook", "instagram", "threads"].includes(data.target)) return null;
    return {
      projectId: data.projectId,
      userId: data.userId,
      target: data.target,
    };
  } catch {
    return null;
  }
}

/** Facebook Login scopes (Page + Instagram publishing) */
export const FACEBOOK_SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
].join(",");

/** Threads Login scopes */
export const THREADS_SCOPES = [
  "threads_basic",
  "threads_content_publish",
].join(",");

export function buildFacebookAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getMetaAppId()!,
    redirect_uri: getMetaRedirectUri(),
    state,
    scope: FACEBOOK_SCOPES,
    response_type: "code",
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
}

export function buildThreadsAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getMetaAppId()!,
    redirect_uri: getMetaRedirectUri(),
    state,
    scope: THREADS_SCOPES,
    response_type: "code",
  });
  return `https://threads.net/oauth/authorize?${params}`;
}
