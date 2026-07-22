import { getAppUrl } from "@/lib/meta/config";
import { VK_COMMUNITY_CALLBACK_HTML } from "@/lib/vk/community-callback-html";
import {
  clearPendingVkOAuthFlow,
  getPendingVkOAuthFlow,
  getProjectForUser,
  savePendingVkAuth,
  setVkUserAccessToken,
} from "@/lib/store/projects";
import { exchangeVkIdCode, verifyVkUserPhotoAccess } from "@/lib/vk/oauth";

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

/** OAuth callback: VK ID (code) или токен сообщества (fragment → HTML). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = parseVkIdCallback(url);

  if (parsed.error) {
    return Response.redirect(
      `${getAppUrl()}/plan?vk_error=${encodeURIComponent(parsed.error)}`
    );
  }

  // oauth.vk.com implicit flow — токен в #fragment, отдаём HTML-обработчик
  if (!parsed.code) {
    return communityCallbackPage();
  }

  if (!parsed.state || !parsed.deviceId) {
    return Response.redirect(
      `${getAppUrl()}/plan?vk_error=${encodeURIComponent(
        "VK не вернул state или device_id"
      )}`
    );
  }

  const flow = getPendingVkOAuthFlow(parsed.state);
  if (!flow) {
    return Response.redirect(
      `${getAppUrl()}/plan?vk_error=${encodeURIComponent(
        "Сессия VK истекла — нажмите «Подключить VK» ещё раз"
      )}`
    );
  }

  const project = getProjectForUser(flow.projectId, flow.userId);
  if (!project) {
    clearPendingVkOAuthFlow(parsed.state);
    return Response.redirect(
      `${getAppUrl()}/plan?vk_error=${encodeURIComponent("Проект не найден")}`
    );
  }

  try {
    const tokens = await exchangeVkIdCode({
      code: parsed.code,
      codeVerifier: flow.codeVerifier,
      deviceId: parsed.deviceId,
      state: parsed.state,
    });

    clearPendingVkOAuthFlow(parsed.state);

    if (flow.purpose === "photo") {
      const vk = project.channels.vk;
      if (!vk) {
        return Response.redirect(
          `${getAppUrl()}/plan?vk_error=${encodeURIComponent(
            "Сначала подключите сообщество VK"
          )}&step=channels`
        );
      }
      const check = await verifyVkUserPhotoAccess({
        accessToken: tokens.accessToken,
        groupId: vk.groupId,
      });
      if (check.ok) {
        setVkUserAccessToken(flow.projectId, flow.userId, tokens.accessToken);
        return Response.redirect(`${getAppUrl()}/plan?step=channels&vk_photo=1`);
      }
      return Response.redirect(
        `${getAppUrl()}/plan?vk_notice=${encodeURIComponent(
          "Токен VK ID не подходит для загрузки фото (нет прав photos/wall). Фото будут публиковаться автоматически как превью по ссылке — дополнительная настройка не нужна."
        )}&step=channels`
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
      `${getAppUrl()}/plan?vk_pick=1&projectId=${encodeURIComponent(flow.projectId)}&step=channels`
    );
  } catch (e) {
    clearPendingVkOAuthFlow(parsed.state);
    const message = e instanceof Error ? e.message : "Ошибка VK OAuth";
    return Response.redirect(
      `${getAppUrl()}/plan?vk_error=${encodeURIComponent(message)}`
    );
  }
}
