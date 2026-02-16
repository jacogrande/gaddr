import { type NextRequest, NextResponse } from "next/server";

const PROTECTED_PATHS = ["/dashboard", "/editor", "/library"];
const SESSION_COOKIES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIES.some((name) => request.cookies.has(name));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = hasSessionCookie(request);

  // Protected routes: redirect unauthenticated users to sign-in
  if (PROTECTED_PATHS.some((p) => pathname.startsWith(p))) {
    if (!isAuthenticated) {
      const signInUrl = new URL("/sign-in", request.url);
      // Only allow relative paths to prevent open redirect
      if (pathname.startsWith("/")) {
        signInUrl.searchParams.set("callbackUrl", pathname);
      }
      return NextResponse.redirect(signInUrl);
    }
  }

  // Sign-in page: redirect authenticated users to dashboard
  if (pathname === "/sign-in" && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/editor/:path*",
    "/library/:path*",
    "/sign-in",
  ],
};
