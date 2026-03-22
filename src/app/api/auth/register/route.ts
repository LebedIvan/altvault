export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createUser, DEMO_COOKIE } from "@/lib/authServer";
import { sendVerificationEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const { email, name, password } = (await req.json()) as {
      email?: string; name?: string; password?: string;
    };

    if (!email || !name || !password)
      return NextResponse.json({ error: "Все поля обязательны" }, { status: 400 });
    if (password.length < 6)
      return NextResponse.json({ error: "Пароль минимум 6 символов" }, { status: 400 });

    const user = await createUser(email, name, password);

    // Send verification email
    let mailError: string | null = null;
    try {
      await sendVerificationEmail(user.email, user.name, user.verifyToken!);
    } catch (mailErr) {
      mailError = String(mailErr);
      console.error("[register] Failed to send verification email:", mailErr);
    }

    // Return "requiresVerification" — don't set JWT yet
    const res = NextResponse.json({
      ok: true,
      requiresVerification: true,
      user: { id: user.id, email: user.email, name: user.name },
      ...(mailError ? { mailError } : {}),
    });
    // Clear demo cookie if the user was in demo mode
    res.cookies.set(DEMO_COOKIE, "", { maxAge: 0, path: "/" });
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    if (msg === "EMAIL_TAKEN")
      return NextResponse.json({ error: "Email уже занят" }, { status: 409 });
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
