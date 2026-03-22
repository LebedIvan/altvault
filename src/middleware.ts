import { NextRequest, NextResponse } from "next/server";
import { nextVariant, isValidVariant } from "@/lib/abtest";
import type { Lang } from "@/lib/i18n";

// ─── Rate Limiter ──────────────────────────────────────────────────────────────
// In-memory per edge-instance. Sufficient to block burst DDoS from single IPs.
// Keyed by "ip:bucket" where bucket = floor(Date.now() / windowMs).

const WINDOW_MS   = 60_000; // 1 minute window
const API_LIMIT   = 60;     // general API calls per window
const AUTH_LIMIT  = 10;     // auth endpoints (login/register) per window

const hits = new Map<string, number>();

// Prune old entries every ~500 requests to prevent unbounded Map growth
let pruneCounter = 0;
function pruneOldEntries() {
  if (++pruneCounter < 500) return;
  pruneCounter = 0;
  const currentBucket = Math.floor(Date.now() / WINDOW_MS);
  hits.forEach((_, key) => {
    const bucket = parseInt(key.split(":").pop() ?? "0", 10);
    if (bucket < currentBucket) hits.delete(key);
  });
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(ip: string, limit: number): boolean {
  const bucket = Math.floor(Date.now() / WINDOW_MS);
  const key    = `${ip}:${bucket}`;
  const count  = (hits.get(key) ?? 0) + 1;
  hits.set(key, count);
  pruneOldEntries();
  return count <= limit;
}

function rateLimitedResponse(retryAfterSec: number) {
  return new NextResponse("Too Many Requests", {
    status: 429,
    headers: {
      "Retry-After":    String(retryAfterSec),
      "Content-Type":   "text/plain",
    },
  });
}

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

  // Rate limit API routes
  if (pathname.startsWith("/api/")) {
    const ip     = getIp(req);
    const isAuth = pathname.startsWith("/api/auth/");
    const limit  = isAuth ? AUTH_LIMIT : API_LIMIT;
    if (!checkRateLimit(ip, limit)) {
      return rateLimitedResponse(Math.ceil(WINDOW_MS / 1000));
    }
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
