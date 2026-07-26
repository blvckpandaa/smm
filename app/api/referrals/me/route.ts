import { requireSession } from "@/lib/auth/request";
import { getAppUrl } from "@/lib/meta/config";
import { getMyReferralStats } from "@/lib/store/projects";

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const stats = getMyReferralStats(auth.session.userId);
  const appUrl = getAppUrl().replace(/\/$/, "");
  return Response.json({
    ok: true,
    ...stats,
    inviteUrl: stats.referralCode
      ? `${appUrl}/register?ref=${encodeURIComponent(stats.referralCode)}`
      : "",
  });
}
