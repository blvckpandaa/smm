import {
  getVkAppId,
  getVkOAuthAppId,
  hasDedicatedVkOAuthApp,
  isVkConfigured,
  useVkStub,
} from "@/lib/vk/config";

export async function GET() {
  return Response.json({
    configured: isVkConfigured(),
    stubMode: useVkStub(),
    appId: getVkAppId() ?? null,
    oauthAppId: getVkOAuthAppId() ?? null,
    autoConnectReady: hasDedicatedVkOAuthApp(),
    /** Быстрый вход через Kate Mobile доступен всегда */
    quickConnectReady: true,
  });
}
