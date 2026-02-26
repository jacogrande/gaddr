import { type NextRequest, NextResponse } from "next/server";

const PROTECTED_PATHS = ["/editor"];
const SESSION_COOKIES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];
const E2E_BYPASS_AUTH_ENABLED =
  process.env.E2E_TESTING === "true" &&
  process.env.NODE_ENV !== "production" &&
  process.env.E2E_BYPASS_AUTH === "true";

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIES.some((name) => request.cookies.has(name));
}

export function middleware(request: NextRequest) {
  if (E2E_BYPASS_AUTH_ENABLED) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const isAuthenticated = hasSessionCookie(request);

  if (PROTECTED_PATHS.some((path) => pathname.startsWith(path)) && !isAuthenticated) {
    const signInUrl = new URL("/sign-in", request.url);
    if (pathname.startsWith("/")) {
      signInUrl.searchParams.set("callbackUrl", pathname);
    }
    return NextResponse.redirect(signInUrl);
  }

  if (pathname === "/sign-in" && isAuthenticated) {
    return NextResponse.redirect(new URL("/editor", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/editor/:path*", "/sign-in"],
};
