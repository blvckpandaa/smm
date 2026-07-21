import { createHmac, timingSafeEqual } from "node:crypto";
import { getAppUrl } from "@/lib/meta/config";

export function getVkAppId(): string | undefined {
  return process.env.VK_APP_ID?.trim() || undefined;
}

export function getVkAppSecret(): string | undefined {
  return process.env.VK_APP_SECRET?.trim() || undefined;
}

export function isVkConfigured(): boolean {
  return Boolean(getVkAppId() && getVkAppSecret());
}

export function useVkStub(): boolean {
  const force =
    process.env.VK_USE_STUB?.trim().toLowerCase() === "1" ||
    process.env.VK_USE_STUB?.trim().toLowerCase() === "true";
  if (force) return true;
  return !isVkConfigured();
}

export function getVkRedirectUri(): string {
  return `${getAppUrl()}/api/vk/callback`;
}

export const VK_SCOPES = ["wall", "photos", "groups", "offline"].join(",");

function stateSecret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    getVkAppSecret() ||
    "smm-agents-vk-state"
  );
}

export function signVkState(payload: {
  projectId: string;
  userId: string;
}): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + 15 * 60_000 })
  ).toString("base64url");
  const sig = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readVkState(state: string | null): {
  projectId: string;
  userId: string;
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
    ) as { projectId?: string; userId?: string; exp?: number };
    if (!data.projectId || !data.userId || !data.exp) return null;
    if (data.exp < Date.now()) return null;
    return { projectId: data.projectId, userId: data.userId };
  } catch {
    return null;
  }
}

export function buildVkAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getVkAppId()!,
    display: "page",
    redirect_uri: getVkRedirectUri(),
    scope: VK_SCOPES,
    response_type: "code",
    state,
    v: "5.199",
  });
  return `https://oauth.vk.com/authorize?${params}`;
}

export const VK_STUB_GROUPS = [
  {
    id: 22822305,
    name: "Тестовое сообщество",
    screenName: "test_community",
    photo50: "",
  },
  {
    id: 22822306,
    name: "Мой бренд",
    screenName: "my_brand",
    photo50: "",
  },
] as const;
