export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, abEvents } from "@/lib/db";

const EventSchema = z.object({
  t:    z.enum(["pageview", "conversion", "paid"]),
  v:    z.enum(["a", "b", "c"]),
  lang: z.enum(["en", "ru", "es"]),
  src:  z.string().max(64).default("direct"),
  plan: z.enum(["free", "premium"]).optional(),
  sid:  z.string().max(64).optional(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof EventSchema>;
  try {
    body = EventSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim().slice(0, 40) ?? null;

  try {
    await db.insert(abEvents).values({
      eventType: body.t,
      variant:   body.v,
      lang:      body.lang,
      src:       body.src ?? "direct",
      plan:      body.plan ?? null,
      sessionId: body.sid ?? null,
      ip,
    });
  } catch (e) {
    console.error("analytics write error", e);
  }

  return NextResponse.json({ ok: true });
}
