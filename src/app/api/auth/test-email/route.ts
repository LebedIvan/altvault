import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to") ?? "delivered@resend.dev";
  const key = process.env.RESEND_API_KEY;

  if (!key) return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });

  const resend = new Resend(key);
  try {
    const result = await resend.emails.send({
      from: "Vaulty <noreply@vaulty.fund>",
      to,
      subject: "Vaulty email test",
      text: "If you see this, email is working.",
    });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
