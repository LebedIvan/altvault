import { NextRequest, NextResponse } from "next/server";
import { resetPassword } from "@/lib/authServer";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = (await req.json()) as { token?: string; password?: string };
    if (!token || !password) {
      return NextResponse.json({ error: "Token and password required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const ok = await resetPassword(token, password);
    if (!ok) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
