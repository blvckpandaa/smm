import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  readSessionToken,
  type SessionPayload,
} from "@/lib/auth/session";
import { getUserById } from "@/lib/store/projects";

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const session = readSessionToken(token);
  if (!session) return null;
  const user = getUserById(session.userId);
  if (!user) return null;
  return session;
}

export async function requireSession(): Promise<
  { ok: true; session: SessionPayload } | { ok: false; response: Response }
> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      response: Response.json(
        { error: "Войдите в аккаунт", code: "UNAUTHORIZED" },
        { status: 401 }
      ),
    };
  }
  return { ok: true, session };
}
