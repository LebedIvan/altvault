import type { Asset } from "@/types/asset";

export interface RefreshResult {
  assetId: string;
  priceCents: number | null;
  /** Where the price came from (e.g. "Skinport", "Yahoo Finance") */
  source?: string;
  /** undefined = silently skipped, string = real error shown to user */
  error?: string;
  skipped?: boolean;
  /** Optional extra fields to merge into the asset (used for games_tech CeX data) */
  extraPatch?: Partial<Asset>;
}

const METAL_SYMBOLS: Record<string, string> = {
  GOLD:      "XAU",
  SILVER:    "XAG",
  PLATINUM:  "XPT",
  PALLADIUM: "XPD",
  RHODIUM:   "XRH",
};

/**
 * Extract troy oz multiplier from commodity asset names.
 * Examples:
 *   "Gold (10 troy oz) — Bullion"        → 10
 *   "Silver (100 troy oz) — COMEX Bar"   → 100
 *   "Gold (1/4 troy oz) — Britannia (×20)" → 0.25 × 20 = 5
 *   "Platinum (1 troy oz) — Valcambi"   → 1
 */
function extractTroyOzMultiplier(name: string): number {
  // Fraction form: "(1/4 troy oz)" optionally followed by "(×20)"
  const fracMatch = name.match(/\((\d+)\/(\d+)\s+troy\s+oz\)/i);
  if (fracMatch) {
    const fraction = parseInt(fracMatch[1]!) / parseInt(fracMatch[2]!);
    const multMatch = name.match(/\(×(\d+)\)/);
    return fraction * (multMatch ? parseInt(multMatch[1]!) : 1);
  }
  // Integer form: "(10 troy oz)"
  const intMatch = name.match(/\((\d+)\s+troy\s+oz\)/i);
  if (intMatch) return parseInt(intMatch[1]!);
  return 1;
}

/** Detect metal from externalId or asset name */
function detectMetal(asset: Asset): string | null {
  const search = ((asset.externalId ?? "") + " " + asset.name).toUpperCase();
  for (const [keyword, symbol] of Object.entries(METAL_SYMBOLS)) {
    if (search.includes(keyword)) return symbol;
  }
  return null;
}

/** Returns true if this card is MTG (name ends with "— MTG" pattern) */
function isMTGCard(asset: Asset): boolean {
  return /—\s*MTG\b/i.test(asset.name);
}

/** Extract clean MTG card name for Scryfall lookup */
function extractMTGName(assetName: string): string {
  // "Black Lotus (Alpha) — MTG" → "Black Lotus"
  return assetName
    .replace(/\s*\([^)]*\)\s*—\s*MTG.*/i, "")
    .replace(/\s*—\s*MTG.*/i, "")
    .trim();
}

export async function fetchLatestPrice(asset: Asset): Promise<RefreshResult> {
  try {
    // ── CS2 Skins ────────────────────────────────────────────────────────────
    if (asset.assetClass === "cs2_skins") {
      const marketName = asset.externalId || asset.name;
      const res = await fetch(`/api/prices/steam?name=${encodeURIComponent(marketName)}`);
      if (!res.ok) {
        // 404 = not listed on Skinport/Steam — skip silently
        if (res.status === 404) return { assetId: asset.id, priceCents: null, skipped: true };
        const body = (await res.json()) as { error?: string };
        return { assetId: asset.id, priceCents: null, error: body.error ?? "Steam error" };
      }
      const data = (await res.json()) as { priceCents: number; source?: string };
      return { assetId: asset.id, priceCents: data.priceCents, source: data.source ?? "Skinport" };
    }

    // ── Commodities ──────────────────────────────────────────────────────────
    if (asset.assetClass === "commodities") {
      const symbol = detectMetal(asset);
      // XRH (rhodium) has no free API — silently skip
      if (!symbol || symbol === "XRH") {
        return { assetId: asset.id, priceCents: null, skipped: true };
      }
      const res = await fetch(`/api/prices/metals?symbol=${symbol}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        return { assetId: asset.id, priceCents: null, error: body.error ?? "Metals API error" };
      }
      const data = (await res.json()) as { priceCents: number; source?: string };
      // metals API returns price per troy oz — multiply by the oz count in the asset name
      const ozMultiplier = extractTroyOzMultiplier(asset.name);
      return { assetId: asset.id, priceCents: Math.round(data.priceCents * ozMultiplier), source: data.source ?? "Yahoo Finance" };
    }

    // ── Trading Cards ────────────────────────────────────────────────────────
    if (asset.assetClass === "trading_cards") {
      // MTG → Scryfall
      if (isMTGCard(asset)) {
        const cardName = extractMTGName(asset.name);
        const res = await fetch(`/api/prices/mtg?name=${encodeURIComponent(cardName)}`);
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          return { assetId: asset.id, priceCents: null, error: body.error ?? "Scryfall error" };
        }
        const data = (await res.json()) as { priceCents: number; source?: string };
        return { assetId: asset.id, priceCents: data.priceCents, source: data.source ?? "Scryfall" };
      }

      // TCGdex — requires externalId (e.g. "swsh1-1")
      if (!asset.externalId) {
        return { assetId: asset.id, priceCents: null, skipped: true };
      }
      const res = await fetch(`/api/prices/pokemon?id=${encodeURIComponent(asset.externalId)}`);
      if (!res.ok) {
        // 404 = card not in TCGdex (e.g. old sets) — skip silently
        if (res.status === 404) return { assetId: asset.id, priceCents: null, skipped: true };
        const body = (await res.json()) as { error?: string };
        return { assetId: asset.id, priceCents: null, error: body.error ?? "TCGdex error" };
      }
      const data = (await res.json()) as { priceCents: number; source?: string };
      return { assetId: asset.id, priceCents: data.priceCents, source: data.source ?? "TCGdex" };
    }

    // ── Comics ───────────────────────────────────────────────────────────────
    if (asset.assetClass === "comics") {
      const id = asset.externalId
        ? asset.externalId.replace(/^cv-/, "")
        : null;
      if (!id) return { assetId: asset.id, priceCents: null, skipped: true };

      const res = await fetch(`/api/prices/comics?id=${encodeURIComponent(id)}`);
      if (!res.ok) {
        if (res.status === 404) return { assetId: asset.id, priceCents: null, skipped: true };
        const body = (await res.json()) as { error?: string };
        return { assetId: asset.id, priceCents: null, error: body.error ?? "eBay error" };
      }
      const data = (await res.json()) as { priceCents: number; source?: string };
      return { assetId: asset.id, priceCents: data.priceCents, source: data.source ?? "eBay" };
    }

    // ── LEGO ─────────────────────────────────────────────────────────────────
    if (asset.assetClass === "lego") {
      const setNumber = asset.externalId;
      if (!setNumber) return { assetId: asset.id, priceCents: null, skipped: true };

      // 1. Try BrickLink (real sold prices, requires API keys)
      try {
        const blRes = await fetch(`/api/lego/bricklink-price?setNumber=${encodeURIComponent(setNumber)}`);
        if (blRes.ok) {
          const blData = (await blRes.json()) as { avgSoldUsd: number | null; source: "bricklink" | "unavailable" };
          if (blData.source === "bricklink" && blData.avgSoldUsd != null) {
            let priceCents = Math.round(blData.avgSoldUsd * 100);
            if (asset.currency !== "USD") {
              const ratesRes = await fetch("/api/rates");
              if (ratesRes.ok) {
                const rd = (await ratesRes.json()) as { rates: Record<string, number> };
                const usdRate = rd.rates["USD"] ?? 1.09;
                if (asset.currency === "EUR") priceCents = Math.round((blData.avgSoldUsd / usdRate) * 100);
                else if (asset.currency === "GBP") priceCents = Math.round((blData.avgSoldUsd / usdRate * (rd.rates["GBP"] ?? 0.85)) * 100);
              }
            }
            return { assetId: asset.id, priceCents, source: "BrickLink" };
          }
        }
      } catch { /* fall through to DB fallback */ }

      // 2. Fallback: LEGO DB (BrickOwl market price or MSRP — no API key needed)
      const dbRes = await fetch(`/api/lego/price?setNumber=${encodeURIComponent(setNumber)}&currency=${asset.currency}`);
      if (dbRes.ok) {
        const dbData = (await dbRes.json()) as { priceCents: number | null; source: string };
        if (dbData.priceCents != null) {
          return { assetId: asset.id, priceCents: dbData.priceCents, source: dbData.source };
        }
      }

      // 3. Fallback: eBay sold listings (uses cached data if available)
      try {
        const ebayQuery = `LEGO ${setNumber} ${asset.name}`.slice(0, 100);
        const ebayRes = await fetch(`/api/ebay/sold?q=${encodeURIComponent(ebayQuery)}&currency=${asset.currency}`);
        if (ebayRes.ok) {
          const ebayData = (await ebayRes.json()) as {
            source: "ebay" | "simulated";
            trendingPrice: number | null;
            averagePrice: number | null;
            currency: string;
          };
          // Only use real eBay data, not simulated
          if (ebayData.source === "ebay") {
            const price = ebayData.trendingPrice ?? ebayData.averagePrice;
            if (price != null && price > 0) {
              let priceCents = Math.round(price * 100);
              // Convert currency if needed
              if (ebayData.currency !== asset.currency) {
                try {
                  const ratesRes = await fetch("/api/rates");
                  if (ratesRes.ok) {
                    const rd = (await ratesRes.json()) as { rates: Record<string, number> };
                    // rd.rates are EUR-based (1 EUR = X currency)
                    const fromRate = rd.rates[ebayData.currency] ?? 1;
                    const toRate   = rd.rates[asset.currency]    ?? 1;
                    priceCents = Math.round(price * (toRate / fromRate) * 100);
                  }
                } catch { /* use original price */ }
              }
              return { assetId: asset.id, priceCents, source: "eBay" };
            }
          }
        }
      } catch { /* all sources exhausted */ }

      return { assetId: asset.id, priceCents: null, error: "eBay данные временно недоступны. Попробуйте позже или введите цену вручную." };
    }

    // ── Games & Tech ─────────────────────────────────────────────────────────
    if (asset.assetClass === "games_tech") {
      if (!asset.externalId && !asset.name) {
        return { assetId: asset.id, priceCents: null, skipped: true };
      }
      const res = await fetch("/api/prices/games-tech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalId: asset.externalId, name: asset.name }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        return { assetId: asset.id, priceCents: null, error: body.error ?? "Games price error" };
      }
      const data = (await res.json()) as {
        priceCents: number | null;
        loosePriceCents: number | null;
        cibPriceCents: number | null;
        ebayMedianCents: number | null;
        cexSellPriceCents: number | null;
        cexBuyPriceCents: number | null;
        source?: string;
      };
      const extraPatch: Partial<Asset> = {};
      if (data.loosePriceCents   != null) extraPatch.loosePriceCents   = data.loosePriceCents;
      if (data.cibPriceCents     != null) extraPatch.cibPriceCents     = data.cibPriceCents;
      if (data.ebayMedianCents   != null) extraPatch.ebayMedianCents   = data.ebayMedianCents;
      if (data.cexSellPriceCents != null) extraPatch.cexSellPriceCents = data.cexSellPriceCents;
      if (data.cexBuyPriceCents  != null) extraPatch.cexBuyPriceCents  = data.cexBuyPriceCents;
      return {
        assetId: asset.id,
        priceCents: data.priceCents,
        source: data.source ?? "PriceCharting",
        extraPatch: Object.keys(extraPatch).length > 0 ? extraPatch : undefined,
      };
    }

    // Asset class not supported — silent skip
    return { assetId: asset.id, priceCents: null, skipped: true };
  } catch (err) {
    return {
      assetId: asset.id,
      priceCents: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function refreshAllPrices(assets: Asset[]): Promise<RefreshResult[]> {
  const supported = assets.filter(
    (a) =>
      a.assetClass === "cs2_skins" ||
      a.assetClass === "commodities" ||
      a.assetClass === "trading_cards" ||
      a.assetClass === "comics" ||
      a.assetClass === "lego" ||
      a.assetClass === "games_tech",
  );
  const results = await Promise.all(supported.map(fetchLatestPrice));
  // Only return results that were actually attempted (not silently skipped)
  return results.filter((r) => !r.skipped);
}
