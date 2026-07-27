import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "smm_agents_session";

function isLocalHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h.startsWith("localhost") ||
    h.startsWith("127.0.0.1") ||
    h.startsWith("[::1]") ||
    h.startsWith("0.0.0.0")
  );
}

/** Safe relative path for ?next= (no open redirects). */
function safeNextPath(pathname: string): string {
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return "/plan";
  if (pathname.length > 200) return "/plan";
  return pathname;
}

/**
 * Build public origin for redirects.
 * Behind nginx/proxy Host is often localhost — prefer x-forwarded-* or APP_URL.
 */
function publicOrigin(req: NextRequest): string {
  const appUrl = (
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    ""
  ).replace(/\/$/, "");

  const forwardedHost = req.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const hostHeader = req.headers.get("host")?.split(",")[0]?.trim();
  const host = forwardedHost || hostHeader || req.nextUrl.host;

  if (isLocalHost(host) && appUrl) {
    try {
      if (!isLocalHost(new URL(appUrl).host)) return appUrl;
    } catch {
      /* ignore bad APP_URL */
    }
  }

  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (isLocalHost(host) ? "http" : "https");

  return `${proto}://${host}`;
}

/** Soft gate: cookie must exist. Signature checked on API (Node). */
export function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) {
    const login = new URL("/login", publicOrigin(req));
    login.searchParams.set("next", safeNextPath(req.nextUrl.pathname));
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/plan", "/plan/:path*", "/admin", "/admin/:path*"],
};
