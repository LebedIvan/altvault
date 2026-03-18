/**
 * Server-side only — uses Node.js `fs`.
 * Stores price snapshots in data/snapshots.json (project root).
 */
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "snapshots.json");

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SnapshotInput {
  assetId: string;
  name: string;
  assetClass: string;
  priceCents: number;
  date: string; // "YYYY-MM-DD"
}

interface SnapshotRecord {
  date: string;
  priceCents: number;
}

interface AssetEntry {
  name: string;
  assetClass: string;
  snapshots: SnapshotRecord[];
}

interface DbFile {
  version: number;
  updatedAt: string;
  assets: Record<string, AssetEntry>;
}

export interface AssetSnapshotResult {
  assetId: string;
  name: string;
  assetClass: string;
  snapshots: SnapshotRecord[];
}

export interface DbStats {
  totalAssets: number;
  totalSnapshots: number;
  oldestDate: string | null;
  newestDate: string | null;
  assetsByClass: Record<string, number>;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function read(): DbFile {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<DbFile>;
    return {
      version:   parsed.version   ?? 1,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      assets:    parsed.assets    ?? {},
    };
  } catch {
    return { version: 1, updatedAt: new Date().toISOString(), assets: {} };
  }
}

function write(db: DbFile): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db.updatedAt = new Date().toISOString();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Record one or more snapshots. One snapshot per asset per day (upsert). */
export function recordSnapshots(inputs: SnapshotInput[]): void {
  const db = read();

  for (const s of inputs) {
    if (!db.assets[s.assetId]) {
      db.assets[s.assetId] = { name: s.name, assetClass: s.assetClass, snapshots: [] };
    }
    const entry = db.assets[s.assetId]!;
    entry.name       = s.name;       // keep name up-to-date
    entry.assetClass = s.assetClass;

    const idx = entry.snapshots.findIndex((r) => r.date === s.date);
    if (idx >= 0) {
      entry.snapshots[idx]!.priceCents = s.priceCents;
    } else {
      entry.snapshots.push({ date: s.date, priceCents: s.priceCents });
      entry.snapshots.sort((a, b) => a.date.localeCompare(b.date));
    }
  }

  write(db);
}

/** Get all snapshots for one asset. */
export function getAssetSnapshots(assetId: string): AssetSnapshotResult | null {
  const db = read();
  const entry = db.assets[assetId];
  if (!entry) return null;
  return { assetId, ...entry };
}

/** Get all assets and their snapshots. */
export function getAllSnapshots(): Record<string, AssetSnapshotResult> {
  const db = read();
  return Object.fromEntries(
    Object.entries(db.assets).map(([id, e]) => [id, { assetId: id, ...e }]),
  );
}

/** Aggregate stats. */
export function getStats(): DbStats {
  const db = read();
  const entries = Object.values(db.assets);
  const allDates = entries.flatMap((e) => e.snapshots.map((s) => s.date));

  const assetsByClass: Record<string, number> = {};
  for (const e of entries) {
    assetsByClass[e.assetClass] = (assetsByClass[e.assetClass] ?? 0) + 1;
  }

  return {
    totalAssets:    entries.length,
    totalSnapshots: allDates.length,
    oldestDate:     allDates.length > 0 ? allDates.reduce((a, b) => (a < b ? a : b)) : null,
    newestDate:     allDates.length > 0 ? allDates.reduce((a, b) => (a > b ? a : b)) : null,
    assetsByClass,
  };
}

/** Return true if there are no snapshots recorded yet. */
export function isEmpty(): boolean {
  const db = read();
  return Object.keys(db.assets).length === 0;
}
