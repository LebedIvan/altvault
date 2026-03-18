import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const EVENTS_PATH = path.join(process.cwd(), "data/ab-events.jsonl");

interface VariantStats {
  views:       number;
  freeSignups: number;
  paidSignups: number;
  freeRate:    string;
  paidRate:    string;
  bySrc:       Record<string, number>;
  byLang:      Record<string, number>;
}

export async function GET(req: NextRequest) {
  const secret = process.env.ANALYTICS_SECRET ?? "vaulty-stats";
  const provided = req.nextUrl.searchParams.get("secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let lines: string[] = [];
  try {
    lines = fs.readFileSync(EVENTS_PATH, "utf-8").trim().split("\n").filter(Boolean);
  } catch {
    lines = [];
  }

  const stats: Record<string, VariantStats> = {
    a: { views: 0, freeSignups: 0, paidSignups: 0, freeRate: "0%", paidRate: "0%", bySrc: {}, byLang: {} },
    b: { views: 0, freeSignups: 0, paidSignups: 0, freeRate: "0%", paidRate: "0%", bySrc: {}, byLang: {} },
    c: { views: 0, freeSignups: 0, paidSignups: 0, freeRate: "0%", paidRate: "0%", bySrc: {}, byLang: {} },
  };

  for (const line of lines) {
    try {
      const e = JSON.parse(line) as { t: string; v: string; src?: string; lang?: string; plan?: string };
      const s = stats[e.v];
      if (!s) continue;

      if (e.t === "pageview") {
        s.views++;
        if (e.src) s.bySrc[e.src] = (s.bySrc[e.src] ?? 0) + 1;
        if (e.lang) s.byLang[e.lang] = (s.byLang[e.lang] ?? 0) + 1;
      } else if (e.t === "conversion") {
        if (e.plan === "free") s.freeSignups++;
        else if (e.plan === "premium") s.paidSignups++;
      } else if (e.t === "paid") {
        s.paidSignups++;
      }
    } catch {
      // skip malformed line
    }
  }

  // Calculate rates
  for (const s of Object.values(stats)) {
    const v = s.views || 1;
    s.freeRate = `${(s.freeSignups / v * 100).toFixed(1)}%`;
    s.paidRate = `${(s.paidSignups / v * 100).toFixed(1)}%`;
  }

  const totalEvents = lines.length;
  const totalViews = Object.values(stats).reduce((a, s) => a + s.views, 0);
  const totalConversions = Object.values(stats).reduce((a, s) => a + s.freeSignups + s.paidSignups, 0);

  return NextResponse.json({ stats, totalEvents, totalViews, totalConversions });
}
