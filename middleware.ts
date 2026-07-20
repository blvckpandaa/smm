import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "agentmark_session";

/** Soft gate: cookie must exist. Signature checked on API (Node). */
export function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", "/plan");
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/plan"],
};
