import { NextRequest, NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/authServer";
import { sendPasswordResetEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    // Always return 200 to not leak whether the email exists
    const result = await createPasswordResetToken(email.toLowerCase().trim());
    if (result) {
      await sendPasswordResetEmail(result.user.email, result.user.name, result.token);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
