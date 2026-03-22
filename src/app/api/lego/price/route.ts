export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getByNumber } from "@/lib/legoDb";

/**
 * GET /api/lego/price?setNumber=21336&currency=EUR
 * Returns the market price for a LEGO set.
 * Source priority:
 *   1. PriceCharting API (USD loose price → convert)
 *   2. Local DB (BrickOwl market price or Brickset MSRP)
 */

async function getRates(): Promise<Record<string, number>> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/rates`);
    if (!res.ok) return { USD: 1.09, GBP: 0.86 };
    const d = (await res.json()) as { rates: Record<string, number> };
    return d.rates;
  } catch {
    return { USD: 1.09, GBP: 0.86 };
  }
}

function convertFromUsd(usd: number, targetCurrency: string, rates: Record<string, number>): number {
  // rates are EUR-based: 1 EUR = X currency
  // USD → EUR: usd / rates.USD
  // EUR → target: * rates.target
  const eurAmount = usd / (rates["USD"] ?? 1.09);
  const targetRate = rates[targetCurrency] ?? 1;
  return Math.round(eurAmount * targetRate * 100);
}

function convertFromGbp(gbp: number, targetCurrency: string, rates: Record<string, number>): number {
  const eurAmount = gbp / (rates["GBP"] ?? 0.86);
  const targetRate = rates[targetCurrency] ?? 1;
  return Math.round(eurAmount * targetRate * 100);
}

export async function GET(req: NextRequest) {
  const setNumber = req.nextUrl.searchParams.get("setNumber") ?? "";
  const currency  = req.nextUrl.searchParams.get("currency") ?? "EUR";

  if (!setNumber) {
    return NextResponse.json({ error: "setNumber required" }, { status: 400 });
  }

  const rates = await getRates();

  // ── 1. PriceCharting ────────────────────────────────────────────────────────
  const pcKey = process.env.PRICECHARTING_API_KEY;
  if (pcKey) {
    try {
      // PriceCharting has LEGO sets — search by set number + "lego"
      const pcUrl = `https://www.pricecharting.com/api/products?id=${pcKey}&q=${encodeURIComponent(setNumber + " lego")}&status=price`;
      const pcRes = await fetch(pcUrl, { next: { revalidate: 21600 } });
      if (pcRes.ok) {
        const pcData = (await pcRes.json()) as {
          products?: Array<{
            id: string;
            "product-name": string;
            "console-name": string;
            "loose-price"?: number;
            "cib-price"?: number;
            "new-price"?: number;
          }>;
        };
        // Find a LEGO product matching the set number
        const match = (pcData.products ?? []).find((p) => {
          const consoleLower = p["console-name"].toLowerCase();
          const nameLower = p["product-name"].toLowerCase();
          return consoleLower.includes("lego") || nameLower.includes(setNumber);
        });
        if (match) {
          // loose-price is in USD cents from PriceCharting
          const usdCents = match["loose-price"] ?? match["cib-price"] ?? match["new-price"];
          if (usdCents != null && usdCents > 0) {
            const usdPrice = usdCents / 100; // PriceCharting returns cents
            const priceCents = convertFromUsd(usdPrice, currency, rates);
            return NextResponse.json({ priceCents, source: "PriceCharting" });
          }
        }
      }
    } catch { /* fall through */ }
  }

  // ── 2. Local DB (BrickOwl market price or Brickset MSRP) ───────────────────
  const set = await getByNumber(setNumber);
  if (set) {
    const { marketPriceGbp, msrpEur, msrpGbp, msrpUsd } = set;

    if (currency === "EUR" && msrpEur != null) {
      return NextResponse.json({ priceCents: Math.round(msrpEur * 100), source: "LEGO MSRP" });
    }
    if (currency === "USD" && msrpUsd != null) {
      return NextResponse.json({ priceCents: Math.round(msrpUsd * 100), source: "LEGO MSRP" });
    }
    if (currency === "GBP" && msrpGbp != null) {
      return NextResponse.json({ priceCents: Math.round(msrpGbp * 100), source: "LEGO MSRP" });
    }
    if (marketPriceGbp != null) {
      return NextResponse.json({ priceCents: convertFromGbp(marketPriceGbp, currency, rates), source: "BrickOwl" });
    }
    if (msrpGbp != null) {
      return NextResponse.json({ priceCents: convertFromGbp(msrpGbp, currency, rates), source: "LEGO MSRP" });
    }
    if (msrpUsd != null) {
      return NextResponse.json({ priceCents: convertFromUsd(msrpUsd, currency, rates), source: "LEGO MSRP" });
    }
  }

  // ── 3. Brickset API (real-time MSRP for this specific set) ─────────────────
  const bsKey = process.env.BRICKSET_API_KEY;
  if (bsKey) {
    try {
      const params = JSON.stringify({ setNumber: `${setNumber}-1`, pageSize: 1 });
      const bsUrl =
        `https://brickset.com/api/v3.asmx/getSets` +
        `?apiKey=${encodeURIComponent(bsKey)}` +
        `&userHash=` +
        `&params=${encodeURIComponent(params)}`;
      const bsRes = await fetch(bsUrl, { next: { revalidate: 86400 } });
      if (bsRes.ok) {
        const bsData = (await bsRes.json()) as {
          status: string;
          sets?: Array<{
            LEGOCom?: {
              US?: { retailPrice?: number | null };
              UK?: { retailPrice?: number | null };
              DE?: { retailPrice?: number | null };
            };
          }>;
        };
        if (bsData.status === "success" && bsData.sets?.length) {
          const s = bsData.sets[0]!;
          const msrpUsd = s.LEGOCom?.US?.retailPrice ?? null;
          const msrpGbp = s.LEGOCom?.UK?.retailPrice ?? null;
          const msrpEur = s.LEGOCom?.DE?.retailPrice ?? null;
          if (currency === "EUR" && msrpEur != null) {
            return NextResponse.json({ priceCents: Math.round(msrpEur * 100), source: "LEGO MSRP" });
          }
          if (currency === "USD" && msrpUsd != null) {
            return NextResponse.json({ priceCents: Math.round(msrpUsd * 100), source: "LEGO MSRP" });
          }
          if (currency === "GBP" && msrpGbp != null) {
            return NextResponse.json({ priceCents: Math.round(msrpGbp * 100), source: "LEGO MSRP" });
          }
          if (msrpGbp != null) {
            return NextResponse.json({ priceCents: convertFromGbp(msrpGbp, currency, rates), source: "LEGO MSRP" });
          }
          if (msrpUsd != null) {
            return NextResponse.json({ priceCents: convertFromUsd(msrpUsd, currency, rates), source: "LEGO MSRP" });
          }
        }
      }
    } catch { /* fall through */ }
  }

  return NextResponse.json({ priceCents: null, source: "unavailable" });
}
