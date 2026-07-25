import {
  getVkAppId,
  getVkAppSecret,
  getVkOAuthAppId,
  getVkOAuthAppSecret,
  getVkRedirectUri,
} from "./config";

export type VkGroup = {
  id: number;
  name: string;
  screenName?: string;
  photo50?: string;
};

export async function exchangeVkIdCode(input: {
  code: string;
  codeVerifier: string;
  deviceId: string;
  state?: string;
  redirectUri?: string;
}): Promise<{
  accessToken: string;
  userId: number;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    code_verifier: input.codeVerifier,
    client_id: getVkAppId()!,
    device_id: input.deviceId,
    redirect_uri: input.redirectUri || getVkRedirectUri(),
  });
  if (input.state) body.set("state", input.state);
  const secret = getVkAppSecret();
  if (secret) body.set("client_secret", secret);

  const res = await fetch("https://id.vk.ru/oauth2/auth", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    user_id?: number | string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (data.error || !data.access_token || data.user_id == null) {
    throw new Error(
      data.error_description || data.error || "VK ID не выдал токен доступа"
    );
  }

  return {
    accessToken: data.access_token,
    userId: Number(data.user_id),
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/** Legacy oauth.vk.com exchange (старые приложения «Веб-сайт»). */
export async function exchangeVkCode(
  code: string,
  redirectUri?: string
): Promise<{
  accessToken: string;
  userId: number;
  expiresIn?: number;
}> {
  const params = new URLSearchParams({
    client_id: getVkOAuthAppId() || getVkAppId()!,
    client_secret: getVkOAuthAppSecret() || getVkAppSecret()!,
    redirect_uri: redirectUri || getVkRedirectUri(),
    code,
  });
  const res = await fetch(`https://oauth.vk.com/access_token?${params}`);
  const data = (await res.json()) as {
    access_token?: string;
    user_id?: number;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (data.error || !data.access_token || !data.user_id) {
    throw new Error(
      data.error_description || data.error || "VK не выдал токен доступа"
    );
  }
  return {
    accessToken: data.access_token,
    userId: data.user_id,
    expiresIn: data.expires_in,
  };
}

export async function listVkAdminGroups(accessToken: string): Promise<VkGroup[]> {
  const params = new URLSearchParams({
    extended: "1",
    filter: "admin",
    fields: "name,screen_name,photo_50",
    access_token: accessToken,
    v: "5.199",
  });
  const res = await fetch(`https://api.vk.com/method/groups.get?${params}`);
  const data = (await res.json()) as {
    response?: {
      items?: {
        id: number;
        name: string;
        screen_name?: string;
        photo_50?: string;
      }[];
    };
    error?: { error_msg?: string; error_code?: number };
  };
  if (data.error) {
    throw new Error(
      data.error.error_msg ||
        "Не удалось получить список сообществ. Укажите токен сообщества вручную."
    );
  }
  return (data.response?.items ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    screenName: g.screen_name,
    photo50: g.photo_50,
  }));
}

/** Проверка: личный токен может вызвать photos.getWallUploadServer для группы. */
export async function verifyVkUserPhotoAccess(input: {
  accessToken: string;
  groupId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const groupId = input.groupId.replace(/^-/, "").trim();
  const params = new URLSearchParams({
    group_id: groupId,
    access_token: input.accessToken.trim(),
    v: "5.199",
  });
  const res = await fetch(
    `https://api.vk.com/method/photos.getWallUploadServer?${params}`
  );
  const data = (await res.json()) as {
    response?: { upload_url?: string };
    error?: { error_msg?: string; error_code?: number };
  };
  if (data.response?.upload_url) return { ok: true };
  const msg = data.error?.error_msg || "Токен не подходит для загрузки фото";
  return { ok: false, error: msg };
}

const VK_USER_TOKEN_HINT =
  "Нужен личный токен администратора: откройте https://vkhost.github.io/ → Kate Mobile → разрешите доступ → скопируйте access_token из адресной строки. Ключ из «Работа с API» сообщества для публикации на стену больше не подходит.";

type VkApiError = { error_msg?: string; error_code?: number };

function extractGroups(
  response:
    | { id: number; name: string }[]
    | { groups?: { id: number; name: string }[] }
    | undefined
): { id: number; name: string }[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  return response.groups ?? [];
}

async function vkMethod<T>(
  method: string,
  params: Record<string, string>
): Promise<{ response?: T; error?: VkApiError }> {
  const qs = new URLSearchParams({ ...params, v: "5.199" });
  const isPost = method === "wall.post" || method === "wall.delete";
  const res = await fetch(
    isPost
      ? `https://api.vk.com/method/${method}`
      : `https://api.vk.com/method/${method}?${qs}`,
    isPost
      ? {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: qs,
        }
      : undefined
  );
  return (await res.json()) as { response?: T; error?: VkApiError };
}

async function resolveGroupId(
  token: string,
  raw: string
): Promise<string> {
  let groupId = raw.replace(/^-/, "").trim();
  if (!groupId || /^\d+$/.test(groupId)) return groupId;

  const data = await vkMethod<{ type?: string; object_id?: number }>(
    "utils.resolveScreenName",
    { screen_name: groupId, access_token: token }
  );
  const type = data.response?.type;
  const objectId = data.response?.object_id;
  if (
    objectId &&
    (type === "group" || type === "page" || type === "event")
  ) {
    return String(objectId);
  }
  return groupId;
}

async function fetchGroupName(
  token: string,
  groupId: string
): Promise<{ id: number; name: string } | null> {
  const data = await vkMethod<
    { id: number; name: string }[] | { groups?: { id: number; name: string }[] }
  >("groups.getById", {
    group_ids: groupId,
    group_id: groupId,
    fields: "name,screen_name",
    access_token: token,
  });
  const groups = extractGroups(data.response);
  if (groups[0]) return { id: groups[0].id, name: groups[0].name };

  // Community token: own group without ids
  const own = await vkMethod<
    { id: number; name: string }[] | { groups?: { id: number; name: string }[] }
  >("groups.getById", {
    fields: "name",
    access_token: token,
  });
  const ownGroups = extractGroups(own.response);
  if (ownGroups.length === 1) {
    return { id: ownGroups[0].id, name: ownGroups[0].name };
  }
  return null;
}

/** Тестовый wall.post + удаление. */
async function tryWallPost(
  token: string,
  groupId: string
): Promise<{ ok: true } | { ok: false; code?: number; msg: string }> {
  const ownerId = `-${groupId}`;
  const post = await vkMethod<{ post_id?: number }>("wall.post", {
    owner_id: ownerId,
    from_group: "1",
    message: "SMM-Agents: проверка токена (пост удалится)",
    access_token: token,
  });
  if (post.error || !post.response?.post_id) {
    return {
      ok: false,
      code: post.error?.error_code,
      msg: post.error?.error_msg || "wall.post недоступен",
    };
  }
  await vkMethod("wall.delete", {
    owner_id: ownerId,
    post_id: String(post.response.post_id),
    access_token: token,
  }).catch(() => null);
  return { ok: true };
}

/**
 * Проверка токена для публикации на стену сообщества.
 * Рабочий вариант в 2026: личный токен админа (Kate Mobile / Standalone).
 * Ключ сообщества из «Работа с API» часто даёт 1051 на wall.post.
 */
export async function verifyVkCommunityCanPost(input: {
  accessToken: string;
  groupId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const check = await verifyVkPublishToken(input);
  return check.ok ? { ok: true } : { ok: false, error: check.error };
}

export async function verifyVkPublishToken(input: {
  accessToken: string;
  groupId: string;
}): Promise<
  | {
      ok: true;
      mode: "user" | "community";
      group: { id: number; name: string };
      vkUserId?: number;
    }
  | { ok: false; error: string }
> {
  const token = input.accessToken.trim();
  if (!token) {
    return { ok: false, error: "Вставьте токен доступа" };
  }
  if (token.startsWith("vk2.a.")) {
    return {
      ok: false,
      error: `Это токен VK ID — им нельзя публиковать. ${VK_USER_TOKEN_HINT}`,
    };
  }

  const groupIdRaw = await resolveGroupId(token, input.groupId);
  if (!groupIdRaw) {
    return {
      ok: false,
      error: "Укажите ссылку или ID сообщества (например vk.com/club123)",
    };
  }

  // Community token?
  const perms = await vkMethod<{
    permissions?: { name?: string }[];
    mask?: number;
  }>("groups.getTokenPermissions", { access_token: token });

  if (perms.response && !perms.error) {
    const group = await fetchGroupName(token, groupIdRaw);
    if (!group) {
      return {
        ok: false,
        error:
          "Не удалось определить сообщество по ключу. Проверьте ссылку/ID.",
      };
    }
    if (/^\d+$/.test(groupIdRaw) && String(group.id) !== groupIdRaw) {
      return {
        ok: false,
        error: `Ключ от другого сообщества (id ${group.id}), а указан ${groupIdRaw}.`,
      };
    }
    const wall = await tryWallPost(token, String(group.id));
    if (wall.ok) {
      return { ok: true, mode: "community", group };
    }
    // Типичный случай 2026: ключ сообщества есть, wall.post = 1051
    return {
      ok: false,
      error: `Ключ из «Работа с API» не умеет публиковать на стену (${wall.msg}). ${VK_USER_TOKEN_HINT}`,
    };
  }

  // User token
  const me = await vkMethod<{ id: number }[]>("users.get", {
    access_token: token,
  });
  if (me.error || !me.response?.[0]?.id) {
    return {
      ok: false,
      error: `Токен недействителен: ${me.error?.error_msg || "нет доступа"}. ${VK_USER_TOKEN_HINT}`,
    };
  }
  const vkUserId = me.response[0].id;

  const admins = await vkMethod<{
    items?: { id: number; name: string }[];
  }>("groups.get", {
    extended: "1",
    filter: "admin",
    fields: "name",
    access_token: token,
  });
  if (admins.error) {
    return {
      ok: false,
      error: `${admins.error.error_msg || "Не удалось получить список сообществ"}. ${VK_USER_TOKEN_HINT}`,
    };
  }

  let group =
    (admins.response?.items ?? []).find(
      (g) => String(g.id) === groupIdRaw
    ) || null;

  if (!group) {
    const byId = await fetchGroupName(token, groupIdRaw);
    if (!byId) {
      return {
        ok: false,
        error:
          "Сообщество не найдено. Укажите vk.com/club… или короткое имя.",
      };
    }
    // Проверим, что пользователь админ
    const isAdmin = await vkMethod<{
      member?: number;
      role?: string;
      is_admin?: number;
    }>("groups.isMember", {
      group_id: String(byId.id),
      user_id: String(vkUserId),
      extended: "1",
      access_token: token,
    });
    // Если явно не админ — предупредим, но финальное решение за wall.post
    const role = isAdmin.response?.role || "";
    const clearlyNotAdmin =
      isAdmin.response != null &&
      isAdmin.response.is_admin !== 1 &&
      role !== "administrator" &&
      role !== "creator" &&
      role !== "editor" &&
      isAdmin.response.member === 0;
    if (clearlyNotAdmin) {
      return {
        ok: false,
        error:
          "Вы не администратор этого сообщества. Получите токен аккаунтом с правами управления.",
      };
    }
    group = byId;
  }

  const groupInfo = { id: group.id, name: group.name };
  const wall = await tryWallPost(token, String(groupInfo.id));
  if (!wall.ok) {
    if (
      wall.code === 1051 ||
      /profile type|unavailable with current profile/i.test(wall.msg)
    ) {
      return {
        ok: false,
        error: `Этот токен не умеет публиковать на стену. ${VK_USER_TOKEN_HINT}`,
      };
    }
    if (wall.code === 15 || /access denied|permission|wall/i.test(wall.msg)) {
      return {
        ok: false,
        error: `Нет права wall. На vkhost.github.io выберите Kate Mobile и разрешите все права. ${VK_USER_TOKEN_HINT}`,
      };
    }
    return {
      ok: false,
      error: `${wall.msg}. ${VK_USER_TOKEN_HINT}`,
    };
  }

  return {
    ok: true,
    mode: "user",
    group: groupInfo,
    vkUserId,
  };
}

/** Проверка токена сообщества / пользователя: вернуть id и имя группы. */
export async function getVkGroupByToken(input: {
  accessToken: string;
  groupId: string;
}): Promise<{ id: number; name: string }> {
  const verified = await verifyVkPublishToken(input);
  if (!verified.ok) {
    throw new Error(verified.error);
  }
  return verified.group;
}
