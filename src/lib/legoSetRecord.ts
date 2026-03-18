/**
 * Canonical LEGO set record — merged from Rebrickable, BrickOwl, and BrickSet.
 * Used by legoDb.ts, scripts/sync-lego.ts, and /api/lego/db.
 */
export interface LegoSetRecord {
  // ── Identity ────────────────────────────────────────────────────────────────
  setNumber: string;        // Canonical LEGO set number, no "-1" suffix (e.g. "10307")

  // ── Catalog (from Rebrickable) ───────────────────────────────────────────────
  name: string;
  theme: string;
  themeId: number | null;
  year: number | null;
  pieces: number | null;
  imageUrl: string | null;

  // ── BrickOwl ─────────────────────────────────────────────────────────────────
  brickowlId: string | null;
  brickowlUrl: string | null;
  marketPriceGbp: number | null;        // cheapest current listing
  marketPriceUpdatedAt: string | null;  // ISO timestamp of last price fetch

  // ── BrickSet (populated by /api/lego/enrich or sync) ─────────────────────────
  launchDate: string | null;   // "YYYY-MM-DD"
  exitDate: string | null;     // "YYYY-MM-DD"
  msrpUsd: number | null;
  msrpGbp: number | null;
  msrpEur: number | null;

  // ── Links ────────────────────────────────────────────────────────────────────
  rebrickableUrl: string | null;
  bricksetUrl: string;

  // ── Metadata ─────────────────────────────────────────────────────────────────
  sources: string[];        // which APIs contributed data, e.g. ["rebrickable", "brickowl"]
  lastSyncedAt: string;     // ISO timestamp
}
