import { getAppUrl } from "@/lib/meta/config";
import { VK_COMMUNITY_CALLBACK_HTML } from "@/lib/vk/community-callback-html";
import {
  clearPendingVkOAuthFlow,
  clearPendingVkUserFlow,
  getPendingVkOAuthFlow,
  getPendingVkUserFlow,
  getProjectForUser,
  savePendingVkAuth,
  setVkUserAccessToken,
} from "@/lib/store/projects";
import { exchangeVkCode, exchangeVkIdCode, verifyVkUserPhotoAccess } from "@/lib/vk/oauth";

function parseVkIdCallback(url: URL): {
  code?: string;
  state?: string;
  deviceId?: string;
  error?: string;
} {
  const err =
    url.searchParams.get("error_description") ||
    url.searchParams.get("error") ||
    undefined;
  if (err) return { error: err };

  const payloadRaw = url.searchParams.get("payload");
  if (payloadRaw) {
    try {
      const decoded = (() => {
        try {
          return JSON.parse(payloadRaw) as Record<string, unknown>;
        } catch {
          const json = Buffer.from(
            payloadRaw.replace(/-/g, "+").replace(/_/g, "/"),
            "base64"
          ).toString("utf8");
          return JSON.parse(json) as Record<string, unknown>;
        }
      })();
      return {
        code: typeof decoded.code === "string" ? decoded.code : undefined,
        state: typeof decoded.state === "string" ? decoded.state : undefined,
        deviceId:
          typeof decoded.device_id === "string" ? decoded.device_id : undefined,
        error:
          typeof decoded.error_description === "string"
            ? decoded.error_description
            : typeof decoded.error === "string"
              ? decoded.error
              : undefined,
      };
    } catch {
      /* fall through */
    }
  }

  return {
    code: url.searchParams.get("code") || undefined,
    state: url.searchParams.get("state") || undefined,
    deviceId: url.searchParams.get("device_id") || undefined,
  };
}

function communityCallbackPage(): Response {
  return new Response(VK_COMMUNITY_CALLBACK_HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function planUrl(pathQuery: string, preferredOrigin?: string): string {
  const base = (preferredOrigin || getAppUrl()).replace(/\/$/, "");
  return `${base}/plan?${pathQuery}`;
}

/** OAuth callback: legacy code / VK ID code / токен сообщества (fragment). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = parseVkIdCallback(url);
  const reqOrigin = `${url.protocol}//${url.host}`;

  if (parsed.error) {
    const friendly =
      /security error/i.test(parsed.error)
        ? "VK Security Error: в настройках приложения VK ID добавьте Redirect URI http://localhost:3000/api/vk/callback (и https://smm-agents.ru/api/vk/callback для прода). Тип входа — VK ID, не oauth.vk.com."
        : parsed.error;
    return Response.redirect(
      planUrl(`vk_error=${encodeURIComponent(friendly)}&step=channels`, reqOrigin)
    );
  }

  // Legacy oauth.vk.com authorization code (state в pendingVkUser)
  if (parsed.code && parsed.state && !parsed.deviceId) {
    const userFlow = getPendingVkUserFlow(parsed.state);
    if (userFlow) {
      try {
        const tokens = await exchangeVkCode(
          parsed.code,
          userFlow.redirectUri || getAppUrl() + "/api/vk/callback"
        );
        clearPendingVkUserFlow(parsed.state);
        savePendingVkAuth({
          projectId: userFlow.projectId,
          userId: userFlow.userId,
          accessToken: tokens.accessToken,
          vkUserId: tokens.userId,
          expiresAt: tokens.expiresIn
            ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
            : undefined,
        });
        return Response.redirect(
          planUrl(
            `vk_pick=1&projectId=${encodeURIComponent(userFlow.projectId)}&step=channels`,
            reqOrigin
          )
        );
      } catch (e) {
        clearPendingVkUserFlow(parsed.state);
        const message = e instanceof Error ? e.message : "Ошибка VK OAuth";
        return Response.redirect(
          planUrl(`vk_error=${encodeURIComponent(message)}&step=channels`, reqOrigin)
        );
      }
    }
  }

  // oauth.vk.com implicit flow — токен в #fragment
  if (!parsed.code) {
    return communityCallbackPage();
  }

  if (!parsed.state || !parsed.deviceId) {
    return Response.redirect(
      planUrl(
        `vk_error=${encodeURIComponent("VK не вернул state или device_id")}`,
        reqOrigin
      )
    );
  }

  const flow = getPendingVkOAuthFlow(parsed.state);
  if (!flow) {
    return Response.redirect(
      planUrl(
        `vk_error=${encodeURIComponent(
          "Сессия VK истекла — нажмите «Подключить VK» ещё раз"
        )}`,
        reqOrigin
      )
    );
  }

  const project = getProjectForUser(flow.projectId, flow.userId);
  if (!project) {
    clearPendingVkOAuthFlow(parsed.state);
    return Response.redirect(
      planUrl(`vk_error=${encodeURIComponent("Проект не найден")}`, reqOrigin)
    );
  }

  try {
    const tokens = await exchangeVkIdCode({
      code: parsed.code,
      codeVerifier: flow.codeVerifier,
      deviceId: parsed.deviceId,
      state: parsed.state,
      redirectUri: flow.redirectUri,
    });

    clearPendingVkOAuthFlow(parsed.state);

    if (flow.purpose === "photo") {
      const vk = project.channels.vk;
      if (!vk) {
        return Response.redirect(
          planUrl(
            `vk_error=${encodeURIComponent("Сначала подключите сообщество VK")}&step=channels`,
            reqOrigin
          )
        );
      }
      const check = await verifyVkUserPhotoAccess({
        accessToken: tokens.accessToken,
        groupId: vk.groupId,
      });
      if (check.ok) {
        setVkUserAccessToken(flow.projectId, flow.userId, tokens.accessToken);
        return Response.redirect(
          planUrl("step=channels&vk_photo=1", reqOrigin)
        );
      }
      return Response.redirect(
        planUrl(
          `vk_notice=${encodeURIComponent(
            "Токен VK ID не подходит для загрузки фото (нет прав photos/wall). Фото будут публиковаться автоматически как превью по ссылке — дополнительная настройка не нужна."
          )}&step=channels`,
          reqOrigin
        )
      );
    }

    savePendingVkAuth({
      projectId: flow.projectId,
      userId: flow.userId,
      accessToken: tokens.accessToken,
      vkUserId: tokens.userId,
      expiresAt: tokens.expiresIn
        ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
        : undefined,
    });

    return Response.redirect(
      planUrl(
        `vk_pick=1&projectId=${encodeURIComponent(flow.projectId)}&step=channels`,
        reqOrigin
      )
    );
  } catch (e) {
    clearPendingVkOAuthFlow(parsed.state);
    const message = e instanceof Error ? e.message : "Ошибка VK OAuth";
    return Response.redirect(
      planUrl(`vk_error=${encodeURIComponent(message)}`, reqOrigin)
    );
  }
}
