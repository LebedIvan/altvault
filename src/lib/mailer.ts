/**
 * Server-only email helper using Resend.
 * Configure via environment variable:
 *   RESEND_API_KEY        — from resend.com dashboard
 *   NEXT_PUBLIC_BASE_URL  — e.g. https://vaulty.fund
 */
import { Resend } from "resend";

const FROM     = "Vaulty <noreply@vaulty.fund>";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3001";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

export async function sendVerificationEmail(
  toEmail: string,
  toName: string,
  token: string,
): Promise<void> {
  const link = `${BASE_URL}/api/auth/verify-email?token=${token}`;
  const resend = getResend();

  console.log(`[EMAIL] Sending verification to ${toEmail}, link: ${link}`);

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: "Confirm your email — Vaulty",
    html: emailHtml({
      title: `Hi, ${toName}!`,
      body: "Confirm your email address to activate your Vaulty account.",
      ctaText: "Confirm email",
      ctaUrl: link,
      footer: "Link expires in 24 hours. If you didn't sign up, ignore this email.",
      linkLabel: link,
    }),
    text: `Hi ${toName},\n\nConfirm your email:\n${link}\n\nLink expires in 24 hours.`,
  });

  if (error) {
    console.error(`[EMAIL] Resend error for ${toEmail}:`, error);
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }
  console.log(`[EMAIL] Sent verification to ${toEmail}, id: ${data?.id}`);
}

export async function sendPasswordResetEmail(
  toEmail: string,
  _toName: string,
  token: string,
): Promise<void> {
  const link = `${BASE_URL}/reset-password?token=${token}`;
  const resend = getResend();

  console.log(`[EMAIL] Sending password reset to ${toEmail}`);

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: "Reset your password — Vaulty",
    html: emailHtml({
      title: "Password reset",
      body: `We received a request to reset the password for <strong style="color:#e2e8f0">${toEmail}</strong>. The link expires in <strong style="color:#e2e8f0">1 hour</strong>.`,
      ctaText: "Reset password",
      ctaUrl: link,
      footer: "If you didn't request this, you can safely ignore this email.",
      linkLabel: link,
    }),
    text: `Password reset\n\nReset your password:\n${link}\n\nExpires in 1 hour.`,
  });

  if (error) {
    console.error(`[EMAIL] Resend error for ${toEmail}:`, error);
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }
  console.log(`[EMAIL] Sent password reset to ${toEmail}, id: ${data?.id}`);
}

// ─── Shared HTML template ─────────────────────────────────────────────────────

function emailHtml({
  title,
  body,
  ctaText,
  ctaUrl,
  footer,
  linkLabel,
}: {
  title: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  footer: string;
  linkLabel: string;
}): string {
  return `<!DOCTYPE html>
<html>
<body style="background:#0d1117;color:#e2e8f0;font-family:system-ui,sans-serif;padding:40px 20px;margin:0">
  <div style="max-width:480px;margin:0 auto">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:32px">
      <div style="background:#0ea5e9;width:40px;height:40px;border-radius:10px;font-weight:900;font-size:18px;color:#fff;text-align:center;line-height:40px">A</div>
      <span style="font-size:18px;font-weight:700;color:#fff">Vaulty</span>
    </div>
    <h2 style="color:#fff;margin:0 0 8px">${title}</h2>
    <p style="color:#94a3b8;margin:0 0 24px;line-height:1.6">${body}</p>
    <a href="${ctaUrl}"
       style="display:inline-block;background:#0284c7;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
      ${ctaText}
    </a>
    <p style="color:#475569;font-size:12px;margin-top:24px;line-height:1.5">${footer}</p>
    <p style="color:#334155;font-size:11px;margin-top:8px">
      Or copy manually:<br/>
      <span style="color:#475569;word-break:break-all">${linkLabel}</span>
    </p>
  </div>
</body>
</html>`;
}
