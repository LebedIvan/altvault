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

  // ── Metadata ──────────────────────────────────────────────────────────────────
  /** Which APIs contributed data, e.g. ["comicvine"] */
  sources: string[];
  lastSyncedAt: string; // ISO timestamp
}
