import { NextRequest, NextResponse } from "next/server";

// Public paths that never require auth
const PUBLIC = [
  "/",
  "/landing",
  "/en",
  "/ru",
  "/es",
  "/go",
  "/merlin",
  "/login",
  "/register",
  "/verify-email",
  "/success",
  "/api/auth",
  "/api/preregister",
  "/api/stripe",
  "/api/analytics",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public routes + static assets
  if (
    PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Allow API routes (they do their own auth checks)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check for valid auth cookie OR demo cookie
  const hasToken = !!req.cookies.get("vaulty_token")?.value;
  const isDemo = req.cookies.get("vaulty_demo")?.value === "1";

  if (hasToken || isDemo) return NextResponse.next();

  // Not authenticated → redirect to login
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
