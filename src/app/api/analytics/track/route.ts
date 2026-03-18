import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { z } from "zod";

const EVENTS_PATH = path.join(process.cwd(), "data/ab-events.jsonl");

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

  const event = {
    ...body,
    ts: new Date().toISOString(),
    ip: (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim().slice(0, 40),
  };

  try {
    fs.mkdirSync(path.dirname(EVENTS_PATH), { recursive: true });
    fs.appendFileSync(EVENTS_PATH, JSON.stringify(event) + "\n");
  } catch (e) {
    console.error("analytics write error", e);
  }

  return NextResponse.json({ ok: true });
}
