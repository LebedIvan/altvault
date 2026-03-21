/**
 * Canonical Games & Tech record — merged from CeX, PriceCharting, and IGDB.
 * Used by gamesTechDb.ts, scripts/sync-*.ts, and /api/search/games-tech.
 */
export interface GamesTechRecord {
  // ── Identity ────────────────────────────────────────────────────────────────
  id: string;              // PriceCharting product ID, CeX boxId, or "igdb-NNN"

  // ── Catalog ─────────────────────────────────────────────────────────────────
  name: string;
  platform: string;        // "PlayStation 2", "Nintendo Switch", "iPhone", etc.
  category: string;        // "game" | "console" | "handheld" | "phone" | "tablet" | "laptop" | "camera" | "wearable" | "accessory"

  // ── PriceCharting prices (USD cents) ─────────────────────────────────────────
  loosePriceCents: number | null;
  cibPriceCents:   number | null;
  newPriceCents:   number | null;
  priceUpdatedAt:  string | null;

  // ── CeX prices (GBP cents) ───────────────────────────────────────────────────
  cexBoxId:          string | null;   // CeX product boxId
  cexSellPriceCents: number | null;   // what CeX sells it for
  cexCashPriceCents: number | null;   // what CeX pays in cash

  // ── IGDB metadata ────────────────────────────────────────────────────────────
  igdbId:      number | null;
  description: string | null;
  genres:      string[];
  coverUrl:    string | null;   // high-res cover image URL

  // ── General metadata ─────────────────────────────────────────────────────────
  releaseYear:      number | null;
  imageUrl:         string | null;   // fallback image (PriceCharting or CeX)
  priceChartingUrl: string | null;

  // ── Tracking ────────────────────────────────────────────────────────────────
  sources:      string[];    // e.g. ["cex", "pricecharting", "igdb"]
  lastSyncedAt: string;
}
