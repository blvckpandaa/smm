import { requireSession } from "@/lib/auth/request";
import {
  buildFacebookAuthUrl,
  buildThreadsAuthUrl,
  getAppUrl,
  signOAuthState,
  useMetaStub,
  type MetaTarget,
} from "@/lib/meta/config";
import { getProjectForUser, setMetaStubChannel } from "@/lib/store/projects";

/** Старт OAuth Meta: ?projectId=&target=facebook|instagram|threads */
export async function GET(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId")?.trim();
  const target = url.searchParams.get("target") as MetaTarget | null;

  if (
    !projectId ||
    !target ||
    !["facebook", "instagram", "threads"].includes(target)
  ) {
    return Response.redirect(
      `${getAppUrl()}/plan?meta_error=${encodeURIComponent(
        "Укажите projectId и target"
      )}`
    );
  }

  const project = getProjectForUser(projectId, auth.session.userId);
  if (!project) {
    return Response.redirect(
      `${getAppUrl()}/plan?meta_error=${encodeURIComponent("Проект не найден")}`
    );
  }

  if (useMetaStub()) {
    const updated = setMetaStubChannel(projectId, auth.session.userId, target);
    if (!updated) {
      return Response.redirect(
        `${getAppUrl()}/plan?meta_error=${encodeURIComponent("Проект не найден")}`
      );
    }
    return Response.redirect(
      `${getAppUrl()}/plan?meta_ok=${target}&meta_stub=1&step=channels`
    );
  }

  const state = signOAuthState({
    projectId,
    userId: auth.session.userId,
    target,
  });

  const authUrl =
    target === "threads"
      ? buildThreadsAuthUrl(state)
      : buildFacebookAuthUrl(state);

  return Response.redirect(authUrl);
}
