import { requireSession } from "@/lib/auth/request";

function adminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS || "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const set = adminEmails();
  if (set.size === 0) return false;
  return set.has(email.trim().toLowerCase());
}

export async function requireAdmin(): Promise<
  | { ok: true; session: { userId: string; email: string; name: string } }
  | { ok: false; response: Response }
> {
  const auth = await requireSession();
  if (!auth.ok) return auth;
  if (!isAdminEmail(auth.session.email)) {
    return {
      ok: false,
      response: Response.json(
        { error: "Недостаточно прав", code: "FORBIDDEN" },
        { status: 403 }
      ),
    };
  }
  return { ok: true, session: auth.session };
}
