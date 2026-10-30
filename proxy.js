import { NextResponse } from "next/server";

const AREAS = [["/superadmin", "superadmin"], ["/admin", "admin"], ["/panel", "shop"]];
const SESSION_COOKIES = ["soleix_session", "soleix_firebase"];

function inArea(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

// Cheap gate only: presence of a session cookie. Roles and Firebase signatures are verified
// on the server, never here — the proxy runtime cannot reach the database or Admin SDK.
export function proxy(request) {
  const { pathname } = request.nextUrl;
  const staffArea = AREAS.find(([prefix]) => inArea(pathname, prefix));
  if (staffArea) {
    if (!request.cookies.has("soleix_session")) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (inArea(pathname, "/account") && !SESSION_COOKIES.some((name) => request.cookies.has(name))) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = { matcher: ["/superadmin/:path*", "/admin/:path*", "/panel/:path*", "/account/:path*"] };
