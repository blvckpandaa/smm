import { requireAdmin } from "@/lib/auth/admin";
import { getReferralOverview, getSettings } from "@/lib/store/projects";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const overview = getReferralOverview();
  return Response.json({
    ok: true,
    referralPercent: getSettings().referralPercent,
    ...overview,
  });
}
