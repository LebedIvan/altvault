import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/authServer";
import { sendVerificationEmail } from "@/lib/mailer";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const user = await findUserByEmail(email.toLowerCase().trim());

    // Always return 200 to not leak whether email exists
    if (!user || user.emailVerified) {
      return NextResponse.json({ ok: true });
    }

    // Generate a fresh token
    const token = randomUUID();
    await db.update(users).set({ verifyToken: token }).where(eq(users.id, user.id));

    await sendVerificationEmail(user.email, user.name, token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[resend-verification]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
