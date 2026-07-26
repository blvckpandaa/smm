import { requireAdmin } from "@/lib/auth/admin";
import { listLedgerAdmin } from "@/lib/store/projects";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const url = new URL(req.url);
  const limit = Math.min(
    200,
    Math.max(10, Number(url.searchParams.get("limit")) || 50)
  );
  return Response.json({ ok: true, ledger: listLedgerAdmin(limit) });
}
