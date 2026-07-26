import { requireAdmin } from "@/lib/auth/admin";
import { getSettings, updateSettings, type StoreSettings } from "@/lib/store/projects";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  return Response.json({ ok: true, settings: getSettings() });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const body = (await req.json()) as Partial<StoreSettings>;
    const settings = updateSettings(body);
    return Response.json({ ok: true, settings });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка";
    return Response.json({ error: message }, { status: 500 });
  }
}
