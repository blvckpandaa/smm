import {
  getMetaAppId,
  getMetaAppSecret,
  getMetaRedirectUri,
} from "./config";

type TokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: { message?: string };
};

export type MetaPage = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
};

export async function exchangeFacebookCode(code: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: getMetaAppId()!,
    client_secret: getMetaAppSecret()!,
    redirect_uri: getMetaRedirectUri(),
    code,
  });
  const res = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${params}`
  );
  const data = (await res.json()) as TokenResponse;
  if (!data.access_token) {
    throw new Error(data.error?.message || "Не удалось получить Facebook token");
  }
  return data.access_token;
}

export async function exchangeThreadsCode(code: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: getMetaAppId()!,
    client_secret: getMetaAppSecret()!,
    redirect_uri: getMetaRedirectUri(),
    grant_type: "authorization_code",
    code,
  });
  const res = await fetch("https://graph.threads.net/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = (await res.json()) as TokenResponse & { access_token?: string };
  if (!data.access_token) {
    throw new Error(data.error?.message || "Не удалось получить Threads token");
  }
  return data.access_token;
}

export async function toLongLivedFacebookToken(
  shortToken: string
): Promise<{ accessToken: string; expiresIn?: number }> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: getMetaAppId()!,
    client_secret: getMetaAppSecret()!,
    fb_exchange_token: shortToken,
  });
  const res = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${params}`
  );
  const data = (await res.json()) as TokenResponse;
  if (!data.access_token) {
    return { accessToken: shortToken };
  }
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

export async function toLongLivedThreadsToken(
  shortToken: string
): Promise<{ accessToken: string; expiresIn?: number }> {
  const params = new URLSearchParams({
    grant_type: "th_exchange_token",
    client_secret: getMetaAppSecret()!,
    access_token: shortToken,
  });
  const res = await fetch(
    `https://graph.threads.net/access_token?${params}`
  );
  const data = (await res.json()) as TokenResponse;
  if (!data.access_token) {
    return { accessToken: shortToken };
  }
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

export async function listFacebookPages(
  userToken: string
): Promise<MetaPage[]> {
  const params = new URLSearchParams({
    fields: "id,name,access_token,instagram_business_account",
    access_token: userToken,
  });
  const res = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?${params}`
  );
  const data = (await res.json()) as {
    data?: MetaPage[];
    error?: { message?: string };
  };
  if (data.error) {
    throw new Error(data.error.message || "Не удалось получить Pages");
  }
  return data.data ?? [];
}

export async function getThreadsUserId(accessToken: string): Promise<{
  id: string;
  username?: string;
}> {
  const params = new URLSearchParams({
    fields: "id,username",
    access_token: accessToken,
  });
  const res = await fetch(`https://graph.threads.net/v1.0/me?${params}`);
  const data = (await res.json()) as {
    id?: string;
    username?: string;
    error?: { message?: string };
  };
  if (!data.id) {
    throw new Error(data.error?.message || "Не удалось получить Threads user");
  }
  return { id: data.id, username: data.username };
}

export async function getFacebookUser(
  accessToken: string
): Promise<{ id: string; name?: string }> {
  const params = new URLSearchParams({
    fields: "id,name",
    access_token: accessToken,
  });
  const res = await fetch(`https://graph.facebook.com/v21.0/me?${params}`);
  const data = (await res.json()) as {
    id?: string;
    name?: string;
    error?: { message?: string };
  };
  if (!data.id) {
    throw new Error(data.error?.message || "Не удалось получить Facebook user");
  }
  return { id: data.id, name: data.name };
}
