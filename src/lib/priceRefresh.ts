import type { Asset } from "@/types/asset";

export interface RefreshResult {
  assetId: string;
  priceCents: number | null;
  error?: string;
}

/**
 * Fetch the latest price for a single asset.
 * Returns null priceCents if the asset class has no auto-fetch support
 * or if the fetch fails.
 */
export async function fetchLatestPrice(asset: Asset): Promise<RefreshResult> {
  try {
    if (asset.assetClass === "cs2_skins") {
      if (!asset.externalId) {
        return { assetId: asset.id, priceCents: null, error: "Нет External ID для Steam" };
      }
      const res = await fetch(
        `/api/prices/steam?name=${encodeURIComponent(asset.externalId)}`,
      );
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        return { assetId: asset.id, priceCents: null, error: body.error ?? "Steam error" };
      }
      const data = (await res.json()) as { priceCents: number };
      return { assetId: asset.id, priceCents: data.priceCents };
    }

    if (asset.assetClass === "commodities") {
      // Map externalId like "SILVER-MAPLE-1OZ" → XAG
      const symbolMap: Record<string, string> = {
        SILVER: "XAG",
        GOLD:   "XAU",
        PLATINUM: "XPT",
        PALLADIUM: "XPD",
      };
      const keyword = (asset.externalId ?? "").toUpperCase();
      const symbol =
        Object.entries(symbolMap).find(([k]) => keyword.includes(k))?.[1] ?? null;

      if (!symbol) {
        return { assetId: asset.id, priceCents: null, error: "Неизвестный металл" };
      }

      const res = await fetch(`/api/prices/metals?symbol=${symbol}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        return { assetId: asset.id, priceCents: null, error: body.error ?? "Metals API error" };
      }
      const data = (await res.json()) as { priceCents: number };
      return { assetId: asset.id, priceCents: data.priceCents };
    }

    // Asset class has no auto-fetch → skip silently
    return {
      assetId: asset.id,
      priceCents: null,
      error: `Автообновление цены для "${asset.assetClass}" не поддерживается`,
    };
  } catch (err) {
    return {
      assetId: asset.id,
      priceCents: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Refresh prices for all assets that support auto-fetch.
 * Returns results for all attempted assets.
 */
export async function refreshAllPrices(assets: Asset[]): Promise<RefreshResult[]> {
  const supported = assets.filter(
    (a) => a.assetClass === "cs2_skins" || a.assetClass === "commodities",
  );
  return Promise.all(supported.map(fetchLatestPrice));
}
