import { getAppUrl } from "@/lib/meta/config";

const VK_API = "https://api.vk.com/method";
const VK_V = "5.199";

async function vkCall<T>(
  method: string,
  token: string,
  params: Record<string, string | number>
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const body = new URLSearchParams({
    access_token: token,
    v: VK_V,
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ),
  });
  try {
    const res = await fetch(`${VK_API}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json()) as {
      response?: T;
      error?: { error_msg?: string; error_code?: number };
    };
    if (json.error || json.response === undefined) {
      return {
        ok: false,
        error: json.error?.error_msg || `VK ${method} failed`,
      };
    }
    return { ok: true, data: json.response };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "VK network error",
    };
  }
}

function gid(groupId: string): number {
  return Math.abs(Number(String(groupId).replace(/^-/, "")));
}

/** Строка, которую VK ждёт на type=confirmation (её нельзя придумать самому). */
export async function fetchVkCallbackConfirmationCode(
  accessToken: string,
  groupId: string
): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const result = await vkCall<{ code?: string } | string>(
    "groups.getCallbackConfirmationCode",
    accessToken,
    { group_id: gid(groupId) }
  );
  if (!result.ok) return result;
  const code =
    typeof result.data === "string"
      ? result.data.trim()
      : String(result.data?.code ?? "").trim();
  if (!code) return { ok: false, error: "VK не вернул confirmation code" };
  return { ok: true, code };
}

type CallbackServer = {
  id: number;
  title?: string;
  url?: string;
  status?: string;
};

export async function ensureVkCallbackServer(input: {
  accessToken: string;
  groupId: string;
  secret: string;
  title?: string;
}): Promise<{
  ok: boolean;
  serverId?: number;
  error?: string;
  created?: boolean;
}> {
  const url = `${getAppUrl()}/api/vk/comments/webhook`;
  const group_id = gid(input.groupId);
  const title = (input.title || "SMM-Agents").slice(0, 14);

  const listed = await vkCall<{ items?: CallbackServer[]; count?: number }>(
    "groups.getCallbackServers",
    input.accessToken,
    { group_id }
  );

  if (listed.ok) {
    const existing = (listed.data.items ?? []).find(
      (s) => (s.url || "").replace(/\/$/, "") === url.replace(/\/$/, "")
    );
    if (existing?.id) {
      await vkCall("groups.editCallbackServer", input.accessToken, {
        group_id,
        server_id: existing.id,
        url,
        title,
        secret_key: input.secret,
      });
      await vkCall("groups.setCallbackSettings", input.accessToken, {
        group_id,
        server_id: existing.id,
        wall_reply_new: 1,
        api_version: VK_V,
      });
      return { ok: true, serverId: existing.id, created: false };
    }
  }

  const added = await vkCall<{ server_id?: number }>(
    "groups.addCallbackServer",
    input.accessToken,
    {
      group_id,
      url,
      title,
      secret_key: input.secret,
    }
  );
  if (!added.ok || !added.data.server_id) {
    return {
      ok: false,
      error:
        added.ok === false
          ? added.error
          : "Не удалось добавить Callback-сервер. Добавьте URL вручную в VK, confirmation подтянется сам.",
    };
  }

  await vkCall("groups.setCallbackSettings", input.accessToken, {
    group_id,
    server_id: added.data.server_id,
    wall_reply_new: 1,
    api_version: VK_V,
  });

  return { ok: true, serverId: added.data.server_id, created: true };
}

/** Попробовать community token, затем user admin token. */
export async function resolveVkCallbackConfirmation(input: {
  groupId: string;
  communityToken?: string;
  userToken?: string;
}): Promise<{ ok: true; code: string; via: string } | { ok: false; error: string }> {
  const tokens: { token: string; via: string }[] = [];
  if (input.communityToken?.trim()) {
    tokens.push({ token: input.communityToken.trim(), via: "community" });
  }
  if (input.userToken?.trim()) {
    tokens.push({ token: input.userToken.trim(), via: "user" });
  }
  let lastError = "Нет токена VK";
  for (const t of tokens) {
    const got = await fetchVkCallbackConfirmationCode(t.token, input.groupId);
    if (got.ok) return { ok: true, code: got.code, via: t.via };
    lastError = got.error;
  }
  return { ok: false, error: lastError };
}
