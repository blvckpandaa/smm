import { requireSession } from "@/lib/auth/request";
import { getAppUrl } from "@/lib/meta/config";
import {
  buildXAuthUrl,
  createPkce,
  isXConfigured,
  signXState,
} from "@/lib/x/config";
import { getProjectForUser } from "@/lib/store/projects";

export async function GET(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  if (!isXConfigured()) {
    return Response.redirect(
      `${getAppUrl()}/plan?meta_error=${encodeURIComponent(
        "Задайте X_CLIENT_ID и X_CLIENT_SECRET в .env"
      )}`
    );
  }

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId")?.trim();
  if (!projectId) {
    return Response.redirect(
      `${getAppUrl()}/plan?meta_error=${encodeURIComponent("Нет projectId")}`
    );
  }

  const project = getProjectForUser(projectId, auth.session.userId);
  if (!project) {
    return Response.redirect(
      `${getAppUrl()}/plan?meta_error=${encodeURIComponent("Проект не найден")}`
    );
  }

  const { verifier, challenge } = createPkce();
  const state = signXState({
    projectId,
    userId: auth.session.userId,
    codeVerifier: verifier,
  });

  return Response.redirect(
    buildXAuthUrl({ state, codeChallenge: challenge })
  );
}
