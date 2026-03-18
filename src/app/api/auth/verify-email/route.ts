import { NextRequest, NextResponse } from "next/server";
import { verifyUserEmail, signToken, COOKIE_NAME, DEMO_COOKIE } from "@/lib/authServer";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/verify-email?error=missing", req.url));
  }

  const user = verifyUserEmail(token);
  if (!user) {
    return NextResponse.redirect(new URL("/verify-email?error=invalid", req.url));
  }

  // Email verified — issue JWT and redirect to dashboard
  const jwt = signToken({ id: user.id, email: user.email, name: user.name });
  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  res.cookies.set(DEMO_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
