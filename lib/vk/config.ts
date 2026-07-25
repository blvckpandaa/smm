import { createHash, randomBytes } from "node:crypto";
import { getAppUrl } from "@/lib/meta/config";
import {
  savePendingVkOAuthFlow,
  type PendingVkOAuthFlow,
} from "@/lib/store/projects";

export function getVkAppId(): string | undefined {
  return process.env.VK_APP_ID?.trim() || undefined;
}

export function getVkAppSecret(): string | undefined {
  return process.env.VK_APP_SECRET?.trim() || undefined;
}

/** Legacy OAuth-приложение «Веб-сайт» на vk.com — для wall.post и автоподключения сообществ. */
export function getVkOAuthAppId(): string | undefined {
  return process.env.VK_OAUTH_APP_ID?.trim() || getVkAppId();
}

export function getVkOAuthAppSecret(): string | undefined {
  return process.env.VK_OAUTH_APP_SECRET?.trim() || getVkAppSecret();
}

export function hasDedicatedVkOAuthApp(): boolean {
  /** Отдельное legacy-приложение «Веб-сайт» на oauth.vk.com */
  return Boolean(process.env.VK_OAUTH_APP_ID?.trim());
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

export function getVkRedirectUri(origin?: string): string {
  const base = (origin || getAppUrl()).replace(/\/$/, "");
  return `${base}/api/vk/callback`;
}

/** Origin для OAuth: на localhost берём хост запроса, иначе APP_URL. */
export function resolveOAuthOrigin(req: Request): string {
  const reqUrl = new URL(req.url);
  if (
    reqUrl.hostname === "localhost" ||
    reqUrl.hostname === "127.0.0.1"
  ) {
    return `${reqUrl.protocol}//${reqUrl.host}`;
  }
  const forwarded =
    req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (reqUrl.protocol === "https:" ? "https" : "http");
  if (forwarded && !forwarded.includes("localhost")) {
    return `${proto}://${forwarded.split(",")[0].trim()}`;
  }
  return getAppUrl();
}

/** VK ID: логин + scope groups для списка сообществ (если VK разрешит). */
export const VK_ID_SCOPES = ["vkid.personal_info", "groups"].join(" ");

/** VK ID: личный токен для загрузки фото на стену сообщества. */
export const VK_ID_PHOTO_SCOPES = ["vkid.personal_info", "photos", "wall"].join(
  " "
);

/** Права токена сообщества для постов на стену. */
export const VK_COMMUNITY_SCOPES = ["wall", "photos", "manage", "docs"].join(",");

/** Права пользователя — список сообществ и публикация от имени администратора. */
export const VK_LEGACY_USER_SCOPES = ["wall", "photos", "groups", "offline"].join(
  ","
);

/** Kate Mobile — публичное Standalone-приложение с правом wall (для быстрого входа пользователей). */
export const VK_KATE_MOBILE_APP_ID = "2685278";

/** URL входа через Kate Mobile (токен окажется в адресной строке blank.html). */
export function buildVkKateMobileAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: VK_KATE_MOBILE_APP_ID,
    display: "page",
    redirect_uri: "https://oauth.vk.com/blank.html",
    scope: VK_LEGACY_USER_SCOPES,
    response_type: "token",
    v: "5.199",
  });
  return `https://oauth.vk.com/authorize?${params}`;
}

/** OAuth ВКонтакте: токен сообщества (redirect_uri = /api/vk/callback). */
export function buildVkCommunityAuthUrl(input: {
  groupId: string;
  state: string;
  redirectUri?: string;
}): string {
  const groupId = input.groupId.replace(/^-/, "").trim();
  const params = new URLSearchParams({
    client_id: getVkOAuthAppId()!,
    group_ids: groupId,
    display: "page",
    redirect_uri: input.redirectUri || getVkRedirectUri(),
    scope: VK_COMMUNITY_SCOPES,
    response_type: "token",
    state: input.state,
    v: "5.199",
  });
  return `https://oauth.vk.com/authorize?${params}`;
}

/** Implicit OAuth: токен сразу на наш /api/vk/callback#access_token=… — без blank.html и без копирования. */
export function buildVkImplicitUserAuthUrl(input: {
  state: string;
  redirectUri: string;
}): string {
  const params = new URLSearchParams({
    client_id: getVkOAuthAppId()!,
    display: "page",
    redirect_uri: input.redirectUri,
    scope: VK_LEGACY_USER_SCOPES,
    response_type: "token",
    state: input.state,
    v: "5.199",
  });
  return `https://oauth.vk.com/authorize?${params}`;
}

/** Шаг 1: вход пользователя VK → список сообществ (authorization code). */
export function buildVkLegacyUserAuthUrl(input: {
  state: string;
  redirectUri?: string;
}): string {
  const params = new URLSearchParams({
    client_id: getVkOAuthAppId()!,
    display: "page",
    redirect_uri: input.redirectUri || getVkRedirectUri(),
    scope: VK_LEGACY_USER_SCOPES,
    response_type: "code",
    state: input.state,
    v: "5.199",
  });
  return `https://oauth.vk.com/authorize?${params}`;
}

function base64Url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

/** Сохраняет PKCE на сервере, возвращает state без спецсимволов для VK ID. */
export function beginVkOAuthFlow(input: {
  projectId: string;
  userId: string;
  purpose?: "connect" | "photo";
  redirectUri?: string;
}): { state: string; codeChallenge: string; codeVerifier: string } {
  const { verifier, challenge } = createPkcePair();
  const flow = savePendingVkOAuthFlow({
    projectId: input.projectId,
    userId: input.userId,
    codeVerifier: verifier,
    purpose: input.purpose,
    redirectUri: input.redirectUri,
  });
  return { state: flow.state, codeChallenge: challenge, codeVerifier: verifier };
}

export type VkOAuthFlow = PendingVkOAuthFlow;

/** Авторизация через VK ID (новые приложения с id.vk.com). */
export function buildVkAuthUrl(input: {
  state: string;
  codeChallenge: string;
  scope?: string;
  redirectUri?: string;
}): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: getVkAppId()!,
    redirect_uri: input.redirectUri || getVkRedirectUri(),
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
    scope: input.scope || VK_ID_SCOPES,
  });
  return `https://id.vk.ru/authorize?${params}`;
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
