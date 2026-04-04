export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createUser, DEMO_COOKIE } from "@/lib/authServer";
import { sendVerificationEmail } from "@/lib/mailer";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Disposable / throwaway email domains blocklist
// ---------------------------------------------------------------------------
const BLOCKED_DOMAINS = new Set([
  "test.com", "test.net", "test.org", "example.com", "example.net", "example.org",
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org",
  "guerrillamail.biz", "guerrillamail.de", "guerrillamail.info",
  "sharklasers.com", "guerrillamailblock.com", "grr.la", "spam4.me",
  "trashmail.com", "trashmail.me", "trashmail.net", "trashmail.org",
  "trashmail.at", "trashmail.io", "trashmail.xyz",
  "yopmail.com", "yopmail.fr", "cool.fr.nf", "jetable.fr.nf",
  "nospam.ze.tc", "nomail.xl.cx", "mega.zik.dj", "speed.1s.fr",
  "courriel.fr.nf", "moncourrier.fr.nf", "monemail.fr.nf",
  "10minutemail.com", "10minutemail.net", "10minutemail.org",
  "tempmail.com", "tempmail.net", "tempmail.org",
  "temp-mail.org", "temp-mail.io", "temp-mail.ru",
  "throwam.com", "throwam.net", "dispostable.com",
  "fakeinbox.com", "mailnull.com", "spamgourmet.com",
  "mailnesia.com", "mailnull.com", "spamtrap.ro",
  "discard.email", "spamfree24.org", "spammotel.com",
  "spamcorner.com", "spamgourmet.com", "spaml.com",
  "spamspot.com", "spamthisplease.com", "spamtrap.ro",
  "maildrop.cc", "mailnull.com", "mailsac.com",
  "getnada.com", "mailnull.com", "throwaway.email",
]);

// ---------------------------------------------------------------------------
// In-memory IP rate limiter: max 5 registrations per IP per hour
// ---------------------------------------------------------------------------
const ipRegistry = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipRegistry.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRegistry.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

// ---------------------------------------------------------------------------
// Suspicious name patterns (bots often submit placeholder or repeated words)
// ---------------------------------------------------------------------------
function isSuspiciousName(name: string): boolean {
  const trimmed = name.trim().toLowerCase();
  // Exact placeholder value from the form
  if (trimmed === "иван иванов") return true;
  // All digits or empty after trim
  if (/^\d+$/.test(trimmed)) return true;
  // Same word repeated: "Youtube Youtube", "Test Test"
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2 && parts[0] === parts[parts.length - 1]) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------
const registerSchema = z.object({
  email: z.string().email("Некорректный email"),
  name: z.string().min(1, "Имя обязательно").max(100),
  password: z.string().min(6, "Пароль минимум 6 символов"),
  _hp: z.string().optional(),  // honeypot — must be empty
  _t:  z.number().optional(),  // page-load timestamp (ms)
  _cf: z.string().optional(),  // Cloudflare Turnstile token
});

const MIN_FORM_TIME_MS = 3_000; // reject if form submitted in < 3 s

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    if (isRateLimited(ip))
      return NextResponse.json({ error: "Слишком много попыток. Попробуйте позже." }, { status: 429 });

    // Validate input
    const parsed = registerSchema.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });

    const { email, name, password, _hp, _t, _cf } = parsed.data;

    // Honeypot — bots fill hidden fields; silently appear to succeed
    if (_hp) {
      return NextResponse.json({ ok: true, requiresVerification: true, user: { id: "x", email, name } });
    }

    // Timing — bots submit forms instantly
    if (_t !== undefined && Date.now() - _t < MIN_FORM_TIME_MS) {
      return NextResponse.json({ error: "Пожалуйста, заполните форму чуть медленнее" }, { status: 429 });
    }

    // Cloudflare Turnstile verification
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret) {
      if (!_cf) {
        return NextResponse.json({ error: "Пожалуйста, подтвердите, что вы не робот" }, { status: 400 });
      }
      const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret: turnstileSecret, response: _cf }),
      });
      const verifyData = await verifyRes.json() as { success: boolean };
      if (!verifyData.success) {
        return NextResponse.json({ error: "Проверка не пройдена. Попробуйте снова." }, { status: 400 });
      }
    }

    // Name quality — block obvious fake names
    if (isSuspiciousName(name)) {
      return NextResponse.json({ error: "Пожалуйста, укажите ваше настоящее имя" }, { status: 400 });
    }

    // Block disposable domains
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain || BLOCKED_DOMAINS.has(domain))
      return NextResponse.json({ error: "Этот email-адрес недопустим" }, { status: 400 });

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
