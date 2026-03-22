export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, verifyPassword, signToken, COOKIE_NAME, DEMO_COOKIE } from "@/lib/authServer";
import { sendVerificationEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = (await req.json()) as { email?: string; password?: string };

    if (!email || !password)
      return NextResponse.json({ error: "Введите email и пароль" }, { status: 400 });

    const user = await findUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash))
      return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });

    // Block unverified accounts
    if (!user.emailVerified) {
      // Resend verification email (non-blocking)
      if (user.verifyToken) {
        try { await sendVerificationEmail(user.email, user.name, user.verifyToken); } catch { /* ignore */ }
      }
      return NextResponse.json(
        { error: "Подтвердите email. Письмо отправлено повторно.", requiresVerification: true },
        { status: 403 },
      );
    }

    const token = signToken({ id: user.id, email: user.email, name: user.name });

    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    res.cookies.set(DEMO_COOKIE, "", { maxAge: 0, path: "/" });
    return res;
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
