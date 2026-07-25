import {
  getVkAppId,
  getVkOAuthAppId,
  getVkRedirectUri,
  isVkConfigured,
  resolveOAuthOrigin,
  useVkStub,
} from "@/lib/vk/config";

export async function GET(req: Request) {
  const origin = resolveOAuthOrigin(req);
  return Response.json({
    configured: isVkConfigured(),
    stubMode: useVkStub(),
    appId: getVkAppId() ?? null,
    oauthAppId: getVkOAuthAppId() ?? null,
    /** Можно войти кнопкой без копирования ссылки */
    autoConnectReady: isVkConfigured(),
    redirectUri: getVkRedirectUri(origin),
  });
}
