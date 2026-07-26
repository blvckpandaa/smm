import { requireAdmin } from "@/lib/auth/admin";
import { listUsersAdmin } from "@/lib/store/projects";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  return Response.json({ ok: true, users: listUsersAdmin() });
}
