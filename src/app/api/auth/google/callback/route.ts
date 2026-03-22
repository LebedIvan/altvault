export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { findOrCreateGoogleUser, signToken, COOKIE_NAME, DEMO_COOKIE } from "@/lib/authServer";

const TOKEN_URL    = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const base = process.env.NEXT_PUBLIC_BASE_URL!;

  if (!code) {
    return NextResponse.redirect(`${base}/login?error=google_cancelled`);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri:  `${base}/api/auth/google/callback`,
        grant_type:    "authorization_code",
      }),
    });

    const tokens = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokens.access_token) {
      console.error("[google-callback] token exchange failed:", tokens);
      return NextResponse.redirect(`${base}/login?error=google_failed`);
    }

    // Get Google user info
    const infoRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const info = await infoRes.json() as { id?: string; email?: string; name?: string };

    if (!info.id || !info.email) {
      return NextResponse.redirect(`${base}/login?error=google_no_email`);
    }

    const user = await findOrCreateGoogleUser(info.id, info.email, info.name ?? info.email);

    const jwt = signToken({ id: user.id, email: user.email, name: user.name });
    const res = NextResponse.redirect(`${base}/app`);
    res.cookies.set(COOKIE_NAME, jwt, {
      httpOnly: true,
      sameSite: "lax",
      maxAge:   60 * 60 * 24 * 30,
      path:     "/",
    });
    res.cookies.set(DEMO_COOKIE, "", { maxAge: 0, path: "/" });
    return res;
  } catch (err) {
    console.error("[google-callback] error:", err);
    return NextResponse.redirect(`${base}/login?error=google_failed`);
  }
}
