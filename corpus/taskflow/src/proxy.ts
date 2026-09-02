import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/schemas/session";

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts` and the exported function
 * from `middleware` to `proxy`. Do not reintroduce the old names — Next 16
 * ignores them silently and every route becomes public.
 *
 * This proxy only decides "is there a session cookie at all". Real
 * authorization happens in the layouts and Server Actions via `can()`; a proxy
 * cannot reach the database.
 */

const PUBLIC_PREFIXES = [
  "/",
  "/pricing",
  "/changelog",
  "/about",
  "/login",
  "/register",
  "/reset-password",
  "/invite",
  "/api/health",
  "/api/webhooks",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE_NAME);
  if (!session?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  response.headers.set("x-taskflow-authenticated", "1");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
