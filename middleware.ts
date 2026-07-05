import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const isLoginPath = req.nextUrl.pathname === "/login" || req.nextUrl.pathname.startsWith("/api/login");
  if (isLoginPath) return NextResponse.next();

  // Public share links are intentionally unauthenticated — see app/share/[token].
  const isSharePath = req.nextUrl.pathname.startsWith("/share/") || req.nextUrl.pathname.startsWith("/api/share/");
  if (isSharePath) return NextResponse.next();

  const cookie = req.cookies.get("board_auth")?.value;
  if (cookie === password) return NextResponse.next();

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Exclude Next.js internals and any static asset in public/ (anything
  // with a file extension, e.g. /logo.svg) from the password gate — those
  // need to load even on the login page itself, before auth succeeds.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
