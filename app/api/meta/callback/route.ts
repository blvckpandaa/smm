import { getAppUrl, readOAuthState } from "@/lib/meta/config";
import {
  exchangeFacebookCode,
  exchangeThreadsCode,
  getThreadsUserId,
  listFacebookPages,
  toLongLivedFacebookToken,
  toLongLivedThreadsToken,
} from "@/lib/meta/oauth";
import {
  setFacebookChannel,
  setInstagramChannel,
  setThreadsChannel,
} from "@/lib/store/projects";

/** OAuth callback от Meta / Threads */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const err = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (err) {
    return Response.redirect(
      `${getAppUrl()}/plan?meta_error=${encodeURIComponent(err)}`
    );
  }

  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const state = readOAuthState(stateRaw);

  if (!code || !state) {
    return Response.redirect(
      `${getAppUrl()}/plan?meta_error=${encodeURIComponent(
        "Нет code/state от Meta — попробуйте ещё раз"
      )}`
    );
  }

  try {
    if (state.target === "threads") {
      const short = await exchangeThreadsCode(code);
      const long = await toLongLivedThreadsToken(short);
      const me = await getThreadsUserId(long.accessToken);
      const expiresAt = long.expiresIn
        ? new Date(Date.now() + long.expiresIn * 1000).toISOString()
        : undefined;

      setThreadsChannel(state.projectId, state.userId, {
        accessToken: long.accessToken,
        threadsUserId: me.id,
        username: me.username,
        expiresAt,
      });

      return Response.redirect(
        `${getAppUrl()}/plan?meta_ok=threads&step=channels`
      );
    }

    const short = await exchangeFacebookCode(code);
    const long = await toLongLivedFacebookToken(short);
    const pages = await listFacebookPages(long.accessToken);
    const expiresAt = long.expiresIn
      ? new Date(Date.now() + long.expiresIn * 1000).toISOString()
      : undefined;

    if (!pages.length) {
      return Response.redirect(
        `${getAppUrl()}/plan?meta_error=${encodeURIComponent(
          "Нет Facebook Page у аккаунта. Создайте Page и свяжите Instagram."
        )}`
      );
    }

    if (state.target === "facebook") {
      const page = pages[0];
      setFacebookChannel(state.projectId, state.userId, {
        userAccessToken: long.accessToken,
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token,
        expiresAt,
      });
      return Response.redirect(
        `${getAppUrl()}/plan?meta_ok=facebook&step=channels`
      );
    }

    // instagram
    const withIg = pages.find((p) => p.instagram_business_account?.id);
    if (!withIg?.instagram_business_account?.id) {
      return Response.redirect(
        `${getAppUrl()}/plan?meta_error=${encodeURIComponent(
          "У Page нет Instagram Professional. Свяжите IG Business/Creator с Page."
        )}`
      );
    }

    setInstagramChannel(state.projectId, state.userId, {
      userAccessToken: long.accessToken,
      pageId: withIg.id,
      pageName: withIg.name,
      pageAccessToken: withIg.access_token,
      igUserId: withIg.instagram_business_account.id,
      expiresAt,
    });

    return Response.redirect(
      `${getAppUrl()}/plan?meta_ok=instagram&step=channels`
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка Meta OAuth";
    return Response.redirect(
      `${getAppUrl()}/plan?meta_error=${encodeURIComponent(message)}`
    );
  }
}
