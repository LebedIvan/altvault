import { NextResponse } from "next/server";

/**
 * Returns live EUR-based exchange rates from open.er-api.com (free, no key).
 * Cached 1 hour by Next.js.
 */
export async function GET() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/EUR", {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Exchange rate fetch failed" }, { status: 502 });
    }

    const data = (await res.json()) as {
      result: string;
      rates: Record<string, number>;
    };

    if (data.result !== "success") {
      return NextResponse.json({ error: "Exchange rate API error" }, { status: 502 });
    }

    // Return only the currencies the app uses
    return NextResponse.json({
      base: "EUR",
      rates: {
        EUR: 1,
        USD: data.rates["USD"] ?? 1.09,
        GBP: data.rates["GBP"] ?? 0.85,
        RUB: data.rates["RUB"] ?? 96,
      },
    });
  } catch {
    return NextResponse.json({ error: "Exchange rate fetch failed" }, { status: 502 });
  }
}
