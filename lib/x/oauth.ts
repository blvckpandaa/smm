import {
  getXClientId,
  getXClientSecret,
  getXRedirectUri,
} from "./config";

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

export async function exchangeXCode(options: {
  code: string;
  codeVerifier: string;
}): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const basic = Buffer.from(
    `${getXClientId()}:${getXClientSecret()}`
  ).toString("base64");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: options.code,
    redirect_uri: getXRedirectUri(),
    code_verifier: options.codeVerifier,
    client_id: getXClientId()!,
  });

  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body,
  });
  const data = (await res.json()) as TokenResponse;
  if (!data.access_token) {
    throw new Error(
      data.error_description || data.error || "Не удалось получить X token"
    );
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function refreshXToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const basic = Buffer.from(
    `${getXClientId()}:${getXClientSecret()}`
  ).toString("base64");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: getXClientId()!,
  });
  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body,
  });
  const data = (await res.json()) as TokenResponse;
  if (!data.access_token) {
    throw new Error(
      data.error_description || data.error || "Не удалось обновить X token"
    );
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
  };
}

export async function getXMe(accessToken: string): Promise<{
  id: string;
  username?: string;
  name?: string;
}> {
  const res = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as {
    data?: { id: string; username?: string; name?: string };
    errors?: { detail?: string; title?: string }[];
  };
  if (!data.data?.id) {
    throw new Error(
      data.errors?.[0]?.detail ||
        data.errors?.[0]?.title ||
        "Не удалось получить профиль X"
    );
  }
  return data.data;
}
