import type { Asset } from "@/types/asset";

export interface RefreshResult {
  assetId: string;
  priceCents: number | null;
  /** Where the price came from (e.g. "Skinport", "Yahoo Finance") */
  source?: string;
  /** undefined = silently skipped, string = real error shown to user */
  error?: string;
  skipped?: boolean;
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
      a.assetClass === "comics",
  );
  const results = await Promise.all(supported.map(fetchLatestPrice));
  // Only return results that were actually attempted (not silently skipped)
  return results.filter((r) => !r.skipped);
}
