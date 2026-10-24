import { NextResponse } from "next/server";

const AREAS = [["/superadmin", "superadmin"], ["/admin", "admin"], ["/panel", "shop"]];

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const area = AREAS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!area) return NextResponse.next();
  if (!request.cookies.has("soleix_session")) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/superadmin/:path*", "/admin/:path*", "/panel/:path*"] };
