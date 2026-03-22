/**
 * Server-side only — uses Neon DB via Drizzle ORM.
 * Replaces the previous fs-based implementation.
 */
import { eq, ilike, or, sql } from "drizzle-orm";
import { db, comics } from "./db";
import type { ComicRecord } from "./comicRecord";

// ─── Converters ───────────────────────────────────────────────────────────────

function recordToRow(r: Partial<ComicRecord> & { cvId: string; volumeName: string; issueNumber: string }) {
  return {
    cvId:           r.cvId,
    volumeName:     r.volumeName,
    volumeCvId:     r.volumeCvId    ?? null,
    issueNumber:    r.issueNumber,
    name:           r.name          ?? null,
    publisher:      r.publisher     ?? null,
    coverDate:      r.coverDate     ?? null,
    coverImageUrl:  r.coverImageUrl ?? null,
    description:    r.description   ?? null,
    isKeyIssue:     r.isKeyIssue    ?? false,
    keyIssueReason: r.keyIssueReason ?? null,
    characters:     r.characters    ?? [],
    storyArcs:      r.storyArcs     ?? [],
    cvUrl:          r.cvUrl         ?? null,
    sources:        r.sources       ?? [],
    lastSyncedAt:   new Date().toISOString(),
  };
}

function rowToRecord(row: typeof comics.$inferSelect): ComicRecord {
  return {
    cvId:           row.cvId,
    volumeName:     row.volumeName,
    volumeCvId:     row.volumeCvId    ?? null,
    issueNumber:    row.issueNumber,
    name:           row.name          ?? null,
    publisher:      row.publisher     ?? null,
    coverDate:      row.coverDate     ?? null,
    coverImageUrl:  row.coverImageUrl ?? null,
    description:    row.description   ?? null,
    isKeyIssue:     row.isKeyIssue,
    keyIssueReason: row.keyIssueReason ?? null,
    characters:     (row.characters as string[]) ?? [],
    storyArcs:      (row.storyArcs as string[])  ?? [],
    cvUrl:          row.cvUrl         ?? null,
    sources:        (row.sources as string[])     ?? [],
    lastSyncedAt:   row.lastSyncedAt ?? new Date().toISOString(),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Upsert a batch of issue records.
 * Merge strategy: existing non-null values are preserved if incoming value is null/undefined.
 */
export async function upsertIssues(incoming: Partial<ComicRecord>[]): Promise<void> {
  const valid = incoming.filter(
    (r): r is Partial<ComicRecord> & { cvId: string; volumeName: string; issueNumber: string } =>
      !!r.cvId && !!r.volumeName && !!r.issueNumber,
  );
  if (valid.length === 0) return;

  const CHUNK = 100;
  for (let i = 0; i < valid.length; i += CHUNK) {
    const chunk = valid.slice(i, i + CHUNK);
    await db.insert(comics)
      .values(chunk.map(recordToRow))
      .onConflictDoUpdate({
        target: comics.cvId,
        set: {
          volumeName:     sql`CASE WHEN excluded.volume_name != '' THEN excluded.volume_name ELSE comics.volume_name END`,
          volumeCvId:     sql`COALESCE(excluded.volume_cv_id, comics.volume_cv_id)`,
          issueNumber:    sql`CASE WHEN excluded.issue_number != '' THEN excluded.issue_number ELSE comics.issue_number END`,
          name:           sql`COALESCE(excluded.name, comics.name)`,
          publisher:      sql`COALESCE(excluded.publisher, comics.publisher)`,
          coverDate:      sql`COALESCE(excluded.cover_date, comics.cover_date)`,
          coverImageUrl:  sql`COALESCE(excluded.cover_image_url, comics.cover_image_url)`,
          description:    sql`COALESCE(excluded.description, comics.description)`,
          isKeyIssue:     sql`excluded.is_key_issue OR comics.is_key_issue`,
          keyIssueReason: sql`COALESCE(excluded.key_issue_reason, comics.key_issue_reason)`,
          characters:     sql`(SELECT jsonb_agg(DISTINCT elem) FROM jsonb_array_elements_text(COALESCE(comics.characters, '[]'::jsonb) || COALESCE(excluded.characters, '[]'::jsonb)) AS elem)`,
          storyArcs:      sql`(SELECT jsonb_agg(DISTINCT elem) FROM jsonb_array_elements_text(COALESCE(comics.story_arcs, '[]'::jsonb) || COALESCE(excluded.story_arcs, '[]'::jsonb)) AS elem)`,
          cvUrl:          sql`COALESCE(excluded.cv_url, comics.cv_url)`,
          sources:        sql`(SELECT jsonb_agg(DISTINCT elem) FROM jsonb_array_elements_text(COALESCE(comics.sources, '[]'::jsonb) || COALESCE(excluded.sources, '[]'::jsonb)) AS elem)`,
          lastSyncedAt:   sql`excluded.last_synced_at`,
        },
      });
  }
}

export async function getAll(): Promise<ComicRecord[]> {
  const rows = await db.select().from(comics);
  return rows.map(rowToRecord);
}

export async function getByCvId(cvId: string): Promise<ComicRecord | null> {
  const rows = await db.select().from(comics).where(eq(comics.cvId, cvId)).limit(1);
  return rows[0] ? rowToRecord(rows[0]) : null;
}

/** Search by volume name or issue title (case-insensitive substring). */
export async function search(query: string, limit = 20): Promise<ComicRecord[]> {
  const term = `%${query}%`;
  const rows = await db.select().from(comics)
    .where(or(
      ilike(comics.volumeName, term),
      ilike(comics.name, term),
      ilike(comics.keyIssueReason, term),
    ))
    .limit(limit);
  return rows.map(rowToRecord);
}

export async function getKeyIssues(limit = 100): Promise<ComicRecord[]> {
  const rows = await db.select().from(comics)
    .where(eq(comics.isKeyIssue, true))
    .orderBy(sql`cover_date ASC NULLS LAST`)
    .limit(limit);
  return rows.map(rowToRecord);
}

export async function getStats(): Promise<{
  totalIssues: number;
  keyIssues: number;
  withImages: number;
  withDescriptions: number;
  syncedAt: string | null;
}> {
  const [[total], [keyIssues], [withImages], [withDesc], [last]] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(comics),
    db.select({ c: sql<number>`count(*)::int` }).from(comics).where(eq(comics.isKeyIssue, true)),
    db.select({ c: sql<number>`count(*)::int` }).from(comics).where(sql`cover_image_url IS NOT NULL`),
    db.select({ c: sql<number>`count(*)::int` }).from(comics).where(sql`description IS NOT NULL`),
    db.select({ t: sql<string | null>`max(last_synced_at)` }).from(comics),
  ]);
  return {
    totalIssues:      total?.c      ?? 0,
    keyIssues:        keyIssues?.c  ?? 0,
    withImages:       withImages?.c ?? 0,
    withDescriptions: withDesc?.c   ?? 0,
    syncedAt:         last?.t       ?? null,
  };
}

export async function isEmpty(): Promise<boolean> {
  const [row] = await db.select({ c: sql<number>`count(*)::int` }).from(comics);
  return (row?.c ?? 0) === 0;
}
