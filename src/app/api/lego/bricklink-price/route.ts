import { NextRequest, NextResponse } from "next/server";
import { buildOAuthHeader } from "@/lib/bricklinkOAuth";

export interface BrickLinkPriceData {
  setNumber: string;
  avgSoldUsd: number | null;
  minSoldUsd: number | null;
  maxSoldUsd: number | null;
  qtySold: number | null;
  source: "bricklink" | "unavailable";
}

const BL_BASE = "https://api.bricklink.com/api/store/v1";

export async function GET(req: NextRequest) {
  const setNumber = req.nextUrl.searchParams.get("setNumber") ?? "";
  if (!setNumber) {
    return NextResponse.json({ error: "setNumber required" }, { status: 400 });
  }

  const consumerKey    = process.env.BRICKLINK_CONSUMER_KEY    ?? "";
  const consumerSecret = process.env.BRICKLINK_CONSUMER_SECRET ?? "";
  const tokenValue     = process.env.BRICKLINK_TOKEN_VALUE     ?? "";
  const tokenSecret    = process.env.BRICKLINK_TOKEN_SECRET    ?? "";

  if (!consumerKey || !consumerSecret || !tokenValue || !tokenSecret) {
    return NextResponse.json<BrickLinkPriceData>({
      setNumber,
      avgSoldUsd: null,
      minSoldUsd: null,
      maxSoldUsd: null,
      qtySold: null,
      source: "unavailable",
    });
  }

  try {
    const itemNo = `${setNumber}-1`;
    const url    =
      `${BL_BASE}/items/SET/${itemNo}/price` +
      `?guide_type=sold&condition=N&currency_code=USD`;

    const authHeader = buildOAuthHeader("GET", url, {
      consumerKey,
      consumerSecret,
      tokenValue,
      tokenSecret,
    });

    const res = await fetch(url, {
      headers: { Authorization: authHeader },
      next: { revalidate: 21600 },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `BrickLink ${res.status}: ${text}` }, { status: 502 });
    }

    const json = await res.json() as {
      data?: {
        avg_price?: string;
        min_price?: string;
        max_price?: string;
        total_quantity?: number;
      };
    };

    const d = json.data ?? {};
    return NextResponse.json<BrickLinkPriceData>({
      setNumber,
      avgSoldUsd: d.avg_price ? parseFloat(d.avg_price) : null,
      minSoldUsd: d.min_price ? parseFloat(d.min_price) : null,
      maxSoldUsd: d.max_price ? parseFloat(d.max_price) : null,
      qtySold:    d.total_quantity ?? null,
      source: "bricklink",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
