import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getAppUrl } from "@/lib/meta/config";

export function getXClientId(): string | undefined {
  return (
    process.env.X_CLIENT_ID?.trim() ||
    process.env.TWITTER_CLIENT_ID?.trim() ||
    undefined
  );
}

export function getXClientSecret(): string | undefined {
  return (
    process.env.X_CLIENT_SECRET?.trim() ||
    process.env.TWITTER_CLIENT_SECRET?.trim() ||
    undefined
  );
}

export function isXConfigured(): boolean {
  return Boolean(getXClientId() && getXClientSecret());
}

export function getXRedirectUri(): string {
  return `${getAppUrl()}/api/x/callback`;
}

export const X_SCOPES = [
  "tweet.read",
  "tweet.write",
  "users.read",
  "offline.access",
  "media.write",
].join(" ");

function stateSecret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    getXClientSecret() ||
    "smm-agents-x-state"
  );
}

export function createPkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function signXState(payload: {
  projectId: string;
  userId: string;
  codeVerifier: string;
}): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + 15 * 60_000 })
  ).toString("base64url");
  const sig = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readXState(state: string | null): {
  projectId: string;
  userId: string;
  codeVerifier: string;
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
      codeVerifier?: string;
      exp?: number;
    };
    if (!data.projectId || !data.userId || !data.codeVerifier || !data.exp) {
      return null;
    }
    if (data.exp < Date.now()) return null;
    return {
      projectId: data.projectId,
      userId: data.userId,
      codeVerifier: data.codeVerifier,
    };
  } catch {
    return null;
  }
}

export function buildXAuthUrl(options: {
  state: string;
  codeChallenge: string;
}): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: getXClientId()!,
    redirect_uri: getXRedirectUri(),
    scope: X_SCOPES,
    state: options.state,
    code_challenge: options.codeChallenge,
    code_challenge_method: "S256",
  });
  return `https://twitter.com/i/oauth2/authorize?${params}`;
}
