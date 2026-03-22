import { NextRequest, NextResponse } from "next/server";
import { nextVariant, isValidVariant } from "@/lib/abtest";
import type { Lang } from "@/lib/i18n";

function detectLang(req: NextRequest): Lang {
  const accept = req.headers.get("accept-language") ?? "";
  if (accept.toLowerCase().includes("ru")) return "ru";
  if (accept.toLowerCase().includes("es")) return "es";
  return "en";
}

function isValidLang(v: string | undefined): v is Lang {
  return v === "en" || v === "ru" || v === "es";
}

// Public paths that never require auth
const PUBLIC = [
  "/landing",
  "/en",
  "/ru",
  "/es",
  "/go",
  "/merlin",
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/success",
  "/api/auth",
  "/api/auth/test-email",
  "/api/preregister",
  "/api/stripe",
  "/api/analytics",
];

// Landing paths where we set ab_variant cookie
const LANDING_PATHS = ["/landing", "/en", "/ru", "/es", "/go", "/merlin"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Root "/" → detect language and redirect to /en, /ru, or /es
  if (pathname === "/") {
    const lang = detectLang(req);
    const url = req.nextUrl.clone();
    url.pathname = `/${lang}`;
    const res = NextResponse.redirect(url);
    if (!isValidVariant(req.cookies.get("ab_variant")?.value ?? "")) {
      res.cookies.set("ab_variant", nextVariant(), { path: "/", maxAge: 60 * 60 * 24 * 90 });
    }
    if (!isValidLang(req.cookies.get("vaulty_lang")?.value)) {
      res.cookies.set("vaulty_lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    }
    return res;
  }

  // Always allow public routes + static assets
  if (
    PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    const res = NextResponse.next();
    const onLanding = LANDING_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
    if (onLanding && !isValidVariant(req.cookies.get("ab_variant")?.value ?? "")) {
      res.cookies.set("ab_variant", nextVariant(), { path: "/", maxAge: 60 * 60 * 24 * 90 });
    }
    // Set vaulty_lang from landing path (/en, /ru, /es) or detect from headers
    if (!isValidLang(req.cookies.get("vaulty_lang")?.value)) {
      const langFromPath = ["/en", "/ru", "/es"].find((p) => pathname === p || pathname.startsWith(p + "/"))?.slice(1) as Lang | undefined;
      const lang = langFromPath ?? detectLang(req);
      res.cookies.set("vaulty_lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    }
    return res;
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
