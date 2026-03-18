/**
 * Server-side only — uses Node.js `fs`.
 * Stores the merged LEGO set database in data/lego-db.json.
 */
import fs from "fs";
import path from "path";
import type { LegoSetRecord } from "./legoSetRecord";

const DB_PATH = path.join(process.cwd(), "data", "lego-db.json");

// ─── Internal file shape ──────────────────────────────────────────────────────

interface LegoDbFile {
  version: number;
  syncedAt: string | null;
  totalSets: number;
  sets: Record<string, LegoSetRecord>;
}

const EMPTY: LegoDbFile = {
  version: 1,
  syncedAt: null,
  totalSets: 0,
  sets: {},
};

// ─── Low-level I/O ────────────────────────────────────────────────────────────

export function readDb(): LegoDbFile {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(raw) as LegoDbFile;
  } catch {
    return { ...EMPTY, sets: {} };
  }
}

export function writeDb(db: LegoDbFile): void {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Upsert a batch of set records.
 * Merge strategy: existing non-null values are preserved if incoming value is null.
 * Pricing fields (marketPriceGbp) always overwrite when incoming is non-null.
 */
export function upsertSets(incoming: Partial<LegoSetRecord>[]): void {
  const db = readDb();

  for (const s of incoming) {
    if (!s.setNumber) continue;
    const existing = db.sets[s.setNumber];
    if (!existing) {
      db.sets[s.setNumber] = s as LegoSetRecord;
    } else {
      // Merge: prefer non-null, except always update pricing + lastSyncedAt
      const merged: LegoSetRecord = { ...existing };
      for (const key of Object.keys(s) as (keyof LegoSetRecord)[]) {
        const val = s[key];
        if (val !== null && val !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (merged as any)[key] = val;
        }
      }
      // Always merge sources array
      if (s.sources) {
        merged.sources = Array.from(new Set([...existing.sources, ...s.sources]));
      }
      db.sets[s.setNumber] = merged;
    }
  }

  db.totalSets = Object.keys(db.sets).length;
  db.syncedAt  = new Date().toISOString();
  writeDb(db);
}

export function getAll(): LegoSetRecord[] {
  return Object.values(readDb().sets);
}

export function getByNumber(setNumber: string): LegoSetRecord | null {
  return readDb().sets[setNumber] ?? null;
}

export function getStats(): {
  totalSets: number;
  withBrickowl: number;
  withPrices: number;
  withDates: number;
  syncedAt: string | null;
} {
  const db = readDb();
  const sets = Object.values(db.sets);
  return {
    totalSets:   sets.length,
    withBrickowl: sets.filter((s) => s.brickowlId).length,
    withPrices:  sets.filter((s) => s.marketPriceGbp != null).length,
    withDates:   sets.filter((s) => s.launchDate).length,
    syncedAt:    db.syncedAt,
  };
}

export function isEmpty(): boolean {
  return readDb().totalSets === 0;
}
