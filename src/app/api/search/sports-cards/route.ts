/**
 * Sports cards search — uses PriceCharting API if PRICECHARTING_API_KEY is set,
 * otherwise falls back to static popular-card suggestions.
 *
 * GET /api/search/sports-cards?q=lebron+james&sport=basketball
 */
import { NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z.object({
  q:     z.string().min(1).max(100),
  sport: z.enum(["basketball", "football", "hockey", "american_football"]).optional(),
});

function abortFetch(url: string, ms = 8000): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return fetch(url, {
    headers: { "User-Agent": "Vaulty/1.0" },
    signal: controller.signal,
  }).finally(() => clearTimeout(t));
}

const SPORT_LABELS: Record<string, string> = {
  basketball:        "Basketball",
  football:          "Soccer",
  hockey:            "Hockey",
  american_football: "Football",
};

// ─── PriceCharting API integration ───────────────────────────────────────────

interface PriceChartingProduct {
  id: string;
  "product-name": string;
  "console-name"?: string;
  "loose-price"?: number;   // cents
  "graded-price"?: number;  // cents
  "manual-only-price"?: number;
}

async function searchPriceCharting(
  q: string,
  sport: string,
): Promise<{ suggestions: Suggestion[] } | null> {
  const key = process.env.PRICECHARTING_API_KEY;
  if (!key) return null;

  const url =
    `https://www.pricecharting.com/api/products` +
    `?q=${encodeURIComponent(q)}&status=price&api-token=${key}`;

  try {
    const res = await abortFetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { products?: PriceChartingProduct[] };
    const products = data.products ?? [];

    // Filter to sport-relevant categories
    const sportLabel = SPORT_LABELS[sport] ?? "";
    const filtered = products
      .filter((p) => {
        const console_ = (p["console-name"] ?? "").toLowerCase();
        return (
          console_.includes("sports") ||
          console_.includes(sportLabel.toLowerCase()) ||
          console_.includes("card")
        );
      })
      .slice(0, 12);

    return {
      suggestions: filtered.map((p) => {
        const price =
          p["loose-price"] ?? p["graded-price"] ?? p["manual-only-price"] ?? null;
        return {
          id:          String(p.id),
          name:        p["product-name"],
          fullName:    p["product-name"],
          set:         p["console-name"] ?? "",
          rarity:      null,
          imageSmall:  null,
          imageLarge:  null,
          priceCents:  price ?? null,
          currency:    "USD",
        };
      }),
    };
  } catch {
    return null;
  }
}

// ─── Static fallback data ─────────────────────────────────────────────────────

interface Suggestion {
  id: string;
  name: string;
  fullName: string;
  set: string;
  rarity: string | null;
  imageSmall: string | null;
  imageLarge: string | null;
  priceCents: number | null;
  currency: string;
}

const STATIC_POPULAR: Record<string, Suggestion[]> = {
  basketball: [
    { id: "bball-lebron-2003-topps-chrome", name: "LeBron James", fullName: "LeBron James RC — 2003-04 Topps Chrome #111", set: "2003-04 Topps Chrome", rarity: "Rookie Card", imageSmall: null, imageLarge: null, priceCents: 40000, currency: "USD" },
    { id: "bball-jordan-1986-fleer", name: "Michael Jordan", fullName: "Michael Jordan RC — 1986-87 Fleer #57", set: "1986-87 Fleer", rarity: "Rookie Card", imageSmall: null, imageLarge: null, priceCents: 300000, currency: "USD" },
    { id: "bball-curry-2009-topps", name: "Stephen Curry", fullName: "Stephen Curry RC — 2009-10 Topps #321", set: "2009-10 Topps", rarity: "Rookie Card", imageSmall: null, imageLarge: null, priceCents: 8000, currency: "USD" },
    { id: "bball-giannis-2013-panini", name: "Giannis Antetokounmpo", fullName: "Giannis Antetokounmpo RC — 2013-14 Panini #259", set: "2013-14 Panini", rarity: "Rookie Card", imageSmall: null, imageLarge: null, priceCents: 5000, currency: "USD" },
    { id: "bball-wemby-2023-prizm", name: "Victor Wembanyama", fullName: "Victor Wembanyama RC — 2023-24 Panini Prizm #1", set: "2023-24 Panini Prizm", rarity: "Rookie Card", imageSmall: null, imageLarge: null, priceCents: 6000, currency: "USD" },
  ],
  football: [
    { id: "soccer-mbappe-2017-topps", name: "Kylian Mbappé", fullName: "Kylian Mbappé RC — 2017-18 Topps Chrome #1", set: "2017-18 Topps Chrome", rarity: "Rookie Card", imageSmall: null, imageLarge: null, priceCents: 15000, currency: "USD" },
    { id: "soccer-messi-2005-panini", name: "Lionel Messi", fullName: "Lionel Messi RC — 2004-05 Panini Megacracks #71", set: "2004-05 Panini Megacracks", rarity: "Rookie Card", imageSmall: null, imageLarge: null, priceCents: 50000, currency: "USD" },
    { id: "soccer-ronaldo-2003-panini", name: "Cristiano Ronaldo", fullName: "Cristiano Ronaldo RC — 2003-04 Panini #195", set: "2003-04 Panini", rarity: "Rookie Card", imageSmall: null, imageLarge: null, priceCents: 30000, currency: "USD" },
    { id: "soccer-bellingham-2019-topps", name: "Jude Bellingham", fullName: "Jude Bellingham RC — 2019-20 Topps Chrome #73", set: "2019-20 Topps Chrome", rarity: "Rookie Card", imageSmall: null, imageLarge: null, priceCents: 8000, currency: "USD" },
  ],
  hockey: [
    { id: "hockey-gretzky-1979-opc", name: "Wayne Gretzky", fullName: "Wayne Gretzky RC — 1979-80 O-Pee-Chee #18", set: "1979-80 O-Pee-Chee", rarity: "Rookie Card", imageSmall: null, imageLarge: null, priceCents: 200000, currency: "USD" },
    { id: "hockey-crosby-2005-upperdeck", name: "Sidney Crosby", fullName: "Sidney Crosby YG RC — 2005-06 Upper Deck #201", set: "2005-06 Upper Deck", rarity: "Young Guns RC", imageSmall: null, imageLarge: null, priceCents: 25000, currency: "USD" },
    { id: "hockey-ovechkin-2005-upperdeck", name: "Alexander Ovechkin", fullName: "Alexander Ovechkin YG RC — 2005-06 Upper Deck #443", set: "2005-06 Upper Deck", rarity: "Young Guns RC", imageSmall: null, imageLarge: null, priceCents: 15000, currency: "USD" },
    { id: "hockey-mcdavid-2015-upperdeck", name: "Connor McDavid", fullName: "Connor McDavid YG RC — 2015-16 Upper Deck #201", set: "2015-16 Upper Deck", rarity: "Young Guns RC", imageSmall: null, imageLarge: null, priceCents: 12000, currency: "USD" },
  ],
  american_football: [
    { id: "nfl-brady-2000-bowman", name: "Tom Brady", fullName: "Tom Brady RC — 2000 Bowman #236", set: "2000 Bowman", rarity: "Rookie Card", imageSmall: null, imageLarge: null, priceCents: 50000, currency: "USD" },
    { id: "nfl-mahomes-2017-panini-prizm", name: "Patrick Mahomes", fullName: "Patrick Mahomes RC — 2017 Panini Prizm #269", set: "2017 Panini Prizm", rarity: "Rookie Card", imageSmall: null, imageLarge: null, priceCents: 25000, currency: "USD" },
    { id: "nfl-allen-2018-panini-prizm", name: "Josh Allen", fullName: "Josh Allen RC — 2018 Panini Prizm #212", set: "2018 Panini Prizm", rarity: "Rookie Card", imageSmall: null, imageLarge: null, priceCents: 10000, currency: "USD" },
    { id: "nfl-rodgers-2005-topps", name: "Aaron Rodgers", fullName: "Aaron Rodgers RC — 2005 Topps #431", set: "2005 Topps", rarity: "Rookie Card", imageSmall: null, imageLarge: null, priceCents: 8000, currency: "USD" },
  ],
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    q:     searchParams.get("q"),
    sport: searchParams.get("sport") ?? undefined,
  });
  if (!parsed.success)
    return NextResponse.json({ error: "Missing q" }, { status: 400 });

  const { q, sport = "basketball" } = parsed.data;

  // Try PriceCharting API first
  const pcResult = await searchPriceCharting(q, sport);
  if (pcResult && pcResult.suggestions.length > 0) {
    return NextResponse.json({ suggestions: pcResult.suggestions, total: pcResult.suggestions.length, source: "pricecharting" });
  }

  // Fuzzy filter on static popular cards
  const pool = STATIC_POPULAR[sport] ?? [];
  const lq = q.toLowerCase();
  const matched = pool.filter(
    (c) =>
      c.name.toLowerCase().includes(lq) ||
      c.fullName.toLowerCase().includes(lq),
  );

  // If still nothing, return all popular for that sport
  const final = matched.length > 0 ? matched : pool;

  return NextResponse.json({
    suggestions: final,
    total: final.length,
    source: "static",
    hint: process.env.PRICECHARTING_API_KEY
      ? undefined
      : "Set PRICECHARTING_API_KEY for live search",
  });
}
