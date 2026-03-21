/**
 * Canonical Games & Tech record — merged from PriceCharting and optionally IGDB.
 * Used by gamesTechDb.ts, scripts/sync-games-tech.ts, and /api/search/games-tech.
 */
export interface GamesTechRecord {
  // ── Identity ────────────────────────────────────────────────────────────────
  id: string;              // PriceCharting product ID, or "static-xxx" for manual entries

  // ── Catalog ─────────────────────────────────────────────────────────────────
  name: string;
  platform: string;        // "PlayStation 2", "Nintendo Switch", "Nintendo 64", etc.
  category: string;        // "game" | "console" | "handheld" | "accessory"

  // ── Prices (USD cents, from PriceCharting) ───────────────────────────────────
  loosePriceCents: number | null;   // cartridge/disc only, no box
  cibPriceCents:   number | null;   // complete in box
  newPriceCents:   number | null;   // sealed/new
  priceUpdatedAt:  string | null;   // ISO timestamp

  // ── Metadata ────────────────────────────────────────────────────────────────
  releaseYear:      number | null;
  imageUrl:         string | null;
  priceChartingUrl: string | null;

  // ── Tracking ────────────────────────────────────────────────────────────────
  sources:      string[];    // e.g. ["pricecharting", "igdb"]
  lastSyncedAt: string;      // ISO timestamp
}
