import { getVkAppId, getVkAppSecret, getVkRedirectUri } from "./config";

export type VkGroup = {
  id: number;
  name: string;
  screenName?: string;
  photo50?: string;
};

export async function exchangeVkCode(code: string): Promise<{
  accessToken: string;
  userId: number;
  expiresIn?: number;
}> {
  const params = new URLSearchParams({
    client_id: getVkAppId()!,
    client_secret: getVkAppSecret()!,
    redirect_uri: getVkRedirectUri(),
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
    error?: { error_msg?: string };
  };
  if (data.error) {
    throw new Error(data.error.error_msg || "Не удалось получить список сообществ");
  }
  return (data.response?.items ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    screenName: g.screen_name,
    photo50: g.photo_50,
  }));
}
