import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "smm_agents_session";

/** Soft gate: cookie must exist. Signature checked on API (Node). */
export function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/plan", "/plan/:path*", "/admin", "/admin/:path*"],
};