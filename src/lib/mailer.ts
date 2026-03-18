/**
 * Server-only email helper using nodemailer.
 * Configure via environment variables:
 *   SMTP_HOST     e.g. smtp.gmail.com
 *   SMTP_PORT     e.g. 587
 *   SMTP_USER     your SMTP login
 *   SMTP_PASS     your SMTP password / app password
 *   SMTP_FROM     display name + address, e.g. "Vaulty <you@gmail.com>"
 *   NEXT_PUBLIC_BASE_URL  e.g. https://your-ngrok-url.ngrok-free.app
 */
import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  NEXT_PUBLIC_BASE_URL,
} = process.env;

function createTransport() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: Number(SMTP_PORT ?? 587) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendVerificationEmail(
  toEmail: string,
  toName: string,
  token: string,
): Promise<void> {
  const baseUrl = NEXT_PUBLIC_BASE_URL ?? "http://localhost:3001";
  const link = `${baseUrl}/verify-email?token=${token}`;

  const transport = createTransport();
  if (!transport) {
    // SMTP not configured — log to console so dev can still verify manually
    console.log(`\n[EMAIL NOT SENT — SMTP not configured]`);
    console.log(`Verification link for ${toEmail}:`);
    console.log(link);
    console.log();
    return;
  }

  await transport.sendMail({
    from: SMTP_FROM ?? `Vaulty <${SMTP_USER}>`,
    to: `${toName} <${toEmail}>`,
    subject: "Подтвердите email — Vaulty",
    html: `
<!DOCTYPE html>
<html>
<body style="background:#0d1117;color:#e2e8f0;font-family:system-ui,sans-serif;padding:40px 20px;margin:0">
  <div style="max-width:480px;margin:0 auto">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:32px">
      <div style="background:#0ea5e9;width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;color:#fff">A</div>
      <span style="font-size:18px;font-weight:700;color:#fff">Vaulty</span>
    </div>
    <h2 style="color:#fff;margin:0 0 8px">Привет, ${toName}!</h2>
    <p style="color:#94a3b8;margin:0 0 24px;line-height:1.6">
      Подтвердите ваш email-адрес, чтобы активировать аккаунт на Vaulty.
    </p>
    <a href="${link}"
       style="display:inline-block;background:#0284c7;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
      Подтвердить email
    </a>
    <p style="color:#475569;font-size:12px;margin-top:24px;line-height:1.5">
      Ссылка действительна 24 часа. Если вы не регистрировались — просто проигнорируйте это письмо.
    </p>
    <p style="color:#334155;font-size:11px;margin-top:8px">
      Или скопируйте ссылку вручную:<br/>
      <span style="color:#475569;word-break:break-all">${link}</span>
    </p>
  </div>
</body>
</html>`,
    text: `Привет, ${toName}!\n\nПодтвердите email по ссылке:\n${link}\n\nСсылка действительна 24 часа.`,
  });
}
