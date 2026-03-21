export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

const CEX_API = "https://wss2.cex.uk.webuy.io/v3/boxes";

export interface CexItem {
  id:            string;
  name:          string;
  sellPrice:     number;
  cashPrice:     number;
  exchangePrice: number;
  category:      string;       // superCatFriendlyName e.g. "Video Games"
  subCategory:   string;       // categoryFriendlyName e.g. "PS4 Games"
  imageUrl:      string | null;
}

export async function GET(req: NextRequest) {
  const q           = req.nextUrl.searchParams.get("q") ?? "";
  const firstRecord = req.nextUrl.searchParams.get("firstRecord") ?? "1";
  const count       = req.nextUrl.searchParams.get("count") ?? "10";
  const searchUrl   = `https://uk.webuy.com/search?q=${encodeURIComponent(q)}`;

  if (!q) {
    return NextResponse.json({ items: [], source: "unavailable", searchUrl });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(
      `${CEX_API}?q=${encodeURIComponent(q)}&firstRecord=${firstRecord}&count=${count}&sortBy=relevance&sortOrder=desc`,
      {
        signal: controller.signal,
        headers: {
          "User-Agent":      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
          "Accept":          "application/json, text/plain, */*",
          "Accept-Language": "en-GB,en;q=0.9",
          "Origin":          "https://uk.webuy.com",
          "Referer":         "https://uk.webuy.com/",
        },
      }
    );
    clearTimeout(timeout);

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      // Cloudflare challenge page — graceful fallback
      return NextResponse.json({ items: [], source: "unavailable", searchUrl });
    }

    const data = await res.json() as {
      response?: {
        data?: {
          boxes?: Array<{
            boxId: string;
            boxName: string;
            sellPrice: number;
            cashPriceCalculated: number;
            exchangePriceCalculated: number;
            superCatFriendlyName: string;
            categoryFriendlyName: string;
            imageUrls?: { large?: string; medium?: string };
          }>;
        };
      };
    };

    const boxes = data?.response?.data?.boxes ?? [];
    const items: CexItem[] = boxes.map((b) => ({
      id:            b.boxId,
      name:          b.boxName,
      sellPrice:     b.sellPrice,
      cashPrice:     b.cashPriceCalculated,
      exchangePrice: b.exchangePriceCalculated,
      category:      b.superCatFriendlyName,
      subCategory:   b.categoryFriendlyName,
      imageUrl:      b.imageUrls?.large ?? b.imageUrls?.medium ?? null,
    }));

    return NextResponse.json({ items, source: "api", searchUrl });
  } catch {
    return NextResponse.json({ items: [], source: "unavailable", searchUrl });
  }
}
