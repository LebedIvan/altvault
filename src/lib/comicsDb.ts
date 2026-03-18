/**
 * Server-side only — uses Node.js `fs`.
 * Stores the merged comics database in data/comics-db.json.
 */
import fs from "fs";
import path from "path";
import type { ComicRecord } from "./comicRecord";

const DB_PATH = path.join(process.cwd(), "data", "comics-db.json");

// ─── Internal file shape ──────────────────────────────────────────────────────

interface ComicsDbFile {
  version: number;
  syncedAt: string | null;
  totalIssues: number;
  issues: Record<string, ComicRecord>; // keyed by cvId
}

const EMPTY: ComicsDbFile = {
  version: 1,
  syncedAt: null,
  totalIssues: 0,
  issues: {},
};

// ─── Low-level I/O ────────────────────────────────────────────────────────────

export function readDb(): ComicsDbFile {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(raw) as ComicsDbFile;
  } catch {
    return { ...EMPTY, issues: {} };
  }
}

export function writeDb(db: ComicsDbFile): void {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Upsert a batch of issue records.
 * Merge strategy: existing non-null values are preserved if incoming value is null/undefined.
 */
export function upsertIssues(incoming: Partial<ComicRecord>[]): void {
  const db = readDb();

  for (const issue of incoming) {
    if (!issue.cvId) continue;
    const existing = db.issues[issue.cvId];
    if (!existing) {
      db.issues[issue.cvId] = issue as ComicRecord;
    } else {
      const merged: ComicRecord = { ...existing };
      for (const key of Object.keys(issue) as (keyof ComicRecord)[]) {
        const val = issue[key];
        if (val !== null && val !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (merged as any)[key] = val;
        }
      }
      // Always merge sources array
      if (issue.sources) {
        merged.sources = Array.from(new Set([...existing.sources, ...issue.sources]));
      }
      // Always merge arrays
      if (issue.characters?.length) {
        merged.characters = Array.from(new Set([...existing.characters, ...issue.characters]));
      }
      if (issue.storyArcs?.length) {
        merged.storyArcs = Array.from(new Set([...existing.storyArcs, ...issue.storyArcs]));
      }
      db.issues[issue.cvId] = merged;
    }
  }

  db.totalIssues = Object.keys(db.issues).length;
  db.syncedAt    = new Date().toISOString();
  writeDb(db);
}

export function getAll(): ComicRecord[] {
  return Object.values(readDb().issues);
}

export function getByCvId(cvId: string): ComicRecord | null {
  return readDb().issues[cvId] ?? null;
}

/** Search by volume name or issue title (case-insensitive substring). */
export function search(query: string, limit = 20): ComicRecord[] {
  const lq = query.toLowerCase();
  return getAll()
    .filter(
      (c) =>
        c.volumeName.toLowerCase().includes(lq) ||
        (c.name ?? "").toLowerCase().includes(lq) ||
        (c.keyIssueReason ?? "").toLowerCase().includes(lq),
    )
    .slice(0, limit);
}

export function getKeyIssues(limit = 100): ComicRecord[] {
  return getAll()
    .filter((c) => c.isKeyIssue)
    .sort((a, b) => (a.coverDate ?? "").localeCompare(b.coverDate ?? ""))
    .slice(0, limit);
}

export function getStats(): {
  totalIssues: number;
  keyIssues: number;
  withImages: number;
  withDescriptions: number;
  syncedAt: string | null;
} {
  const db = readDb();
  const issues = Object.values(db.issues);
  return {
    totalIssues:      issues.length,
    keyIssues:        issues.filter((c) => c.isKeyIssue).length,
    withImages:       issues.filter((c) => c.coverImageUrl).length,
    withDescriptions: issues.filter((c) => c.description).length,
    syncedAt:         db.syncedAt,
  };
}

export function isEmpty(): boolean {
  return readDb().totalIssues === 0;
}
