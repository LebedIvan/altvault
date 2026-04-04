/**
 * Canonical comic issue record — merged from ComicVine and enriched with
 * key-issue metadata.
 *
 * Used by comicsDb.ts, scripts/sync-comics.ts, and /api/prices/comics.
 */
export interface ComicRecord {
  // ── Identity ─────────────────────────────────────────────────────────────────
  /** ComicVine issue ID, numeric string (e.g. "92090").  Full API ref: "4000-92090". */
  cvId: string;

  // ── Catalog (from ComicVine) ──────────────────────────────────────────────────
  /** Series / volume name, e.g. "Amazing Fantasy" */
  volumeName: string;
  /** Volume ComicVine ID (numeric string) */
  volumeCvId: string | null;
  /** Issue number string, e.g. "15" */
  issueNumber: string;
  /** Story title of the issue, if any */
  name: string | null;
  publisher: string | null;
  /** Cover date — "YYYY-MM-DD", "YYYY-MM", or "YYYY" */
  coverDate: string | null;
  coverImageUrl: string | null;
  /** Short plain-text description (HTML stripped) */
  description: string | null;
  /** Key characters credited in this issue */
  characters: string[];
  /** Story arcs this issue belongs to */
  storyArcs: string[];

  // ── Investment / collectibility metadata ─────────────────────────────────────
  isKeyIssue: boolean;
  /** Human-readable reason why this is a key issue, e.g. "1st appearance of Spider-Man" */
  keyIssueReason: string | null;

  // ── Links ─────────────────────────────────────────────────────────────────────
  cvUrl: string | null;

  // ── Creators (from ComicVine person_credits) ──────────────────────────────────
  writer: string | null;
  artist: string | null;
  /** 'golden' | 'silver' | 'bronze' | 'copper' | 'modern' */
  era: string | null;

  // ── Market prices (updated by daily price-sync cron) ──────────────────────────
  /** FMV for raw (ungraded) copy, USD cents */
  priceRawCents: number | null;
  /** FMV for CGC 9.8, USD cents */
  priceGraded98Cents: number | null;
  /** FMV for CGC 9.6, USD cents */
  priceGraded96Cents: number | null;
  /** FMV for CGC 9.4, USD cents */
  priceGraded94Cents: number | null;
  priceCurrency: string;
  /** 'ebay_browse' | 'ebay_sold' | 'manual' */
  priceSource: string | null;
  priceUpdatedAt: string | null;
  priceSampleSize: number | null;

  // ── Metadata ──────────────────────────────────────────────────────────────────
  /** Which APIs contributed data, e.g. ["comicvine"] */
  sources: string[];
  lastSyncedAt: string; // ISO timestamp
}
