import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import nodemailer from "nodemailer";

const DB_PATH = path.join(process.cwd(), "data", "preregistrations.json");

interface Preregistration {
  id: string;
  email: string;
  plan: "free" | "premium";
  paid: boolean;
  stripeSessionId?: string;
  registeredAt: string;
}

async function readDb(): Promise<Preregistration[]> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(raw) as Preregistration[];
  } catch {
    return [];
  }
}

async function writeDb(data: Preregistration[]): Promise<void> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

async function sendConfirmationEmail(email: string, plan: "free" | "premium") {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log(`[PRE-REG] New ${plan} pre-registration: ${email}`);
    return;
  }

  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: Number(SMTP_PORT ?? 587) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const subject =
    plan === "premium"
      ? "🎉 You're in — Vaulty Premium confirmed!"
      : "You're on the Vaulty list!";

  const body =
    plan === "premium"
      ? `<p>Thanks for supporting Vaulty early! Your <strong>1-year Premium</strong> subscription is confirmed. We'll activate it the moment we launch.</p>`
      : `<p>Thanks for signing up! You'll be among the first to know when Vaulty launches.</p>`;

  await transport.sendMail({
    from: SMTP_FROM ?? `Vaulty <${SMTP_USER}>`,
    to: email,
    subject,
    html: `<!DOCTYPE html>
<html>
<body style="background:#0d1117;color:#e2e8f0;font-family:system-ui,sans-serif;padding:40px 20px;margin:0">
  <div style="max-width:480px;margin:0 auto">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:32px">
      <div style="background:#0ea5e9;width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;color:#fff">V</div>
      <span style="font-size:18px;font-weight:700;color:#fff">Vaulty</span>
    </div>
    <h2 style="color:#fff;margin:0 0 16px">${subject}</h2>
    <div style="color:#94a3b8;line-height:1.6">${body}</div>
    <p style="color:#475569;font-size:12px;margin-top:32px">Vaulty — Alternative Investments Dashboard</p>
  </div>
</body>
</html>`,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { email, plan, stripeSessionId } = (await req.json()) as {
      email?: string;
      plan?: string;
      stripeSessionId?: string;
    };

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const validPlan = plan === "premium" ? "premium" : "free";
    const db = await readDb();

    // Check for duplicate
    const existing = db.find((r) => r.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      // Upgrade free → premium if needed
      if (validPlan === "premium" && !existing.paid) {
        existing.plan = "premium";
        existing.paid = true;
        if (stripeSessionId) existing.stripeSessionId = stripeSessionId;
        await writeDb(db);
        await sendConfirmationEmail(email, "premium");
      }
      return NextResponse.json({ ok: true, existing: true });
    }

    const entry: Preregistration = {
      id: randomUUID(),
      email: email.toLowerCase().trim(),
      plan: validPlan,
      paid: validPlan === "premium",
      stripeSessionId,
      registeredAt: new Date().toISOString(),
    };

    db.push(entry);
    await writeDb(db);
    await sendConfirmationEmail(email, validPlan);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[preregister]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
