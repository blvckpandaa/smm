import { getAppUrl } from "@/lib/meta/config";
import { readXState } from "@/lib/x/config";
import { exchangeXCode, getXMe } from "@/lib/x/oauth";
import { setXChannel } from "@/lib/store/projects";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const err = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (err) {
    return Response.redirect(
      `${getAppUrl()}/plan?meta_error=${encodeURIComponent(err)}`
    );
  }

  const code = url.searchParams.get("code");
  const state = readXState(url.searchParams.get("state"));
  if (!code || !state) {
    return Response.redirect(
      `${getAppUrl()}/plan?meta_error=${encodeURIComponent(
        "Нет code/state от X"
      )}`
    );
  }

  try {
    const tokens = await exchangeXCode({
      code,
      codeVerifier: state.codeVerifier,
    });
    const me = await getXMe(tokens.accessToken);
    setXChannel(state.projectId, state.userId, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      userId: me.id,
      username: me.username,
      name: me.name,
      expiresAt: tokens.expiresIn
        ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
        : undefined,
    });
    return Response.redirect(`${getAppUrl()}/plan?meta_ok=x&step=channels`);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка X OAuth";
    return Response.redirect(
      `${getAppUrl()}/plan?meta_error=${encodeURIComponent(message)}`
    );
  }
}
