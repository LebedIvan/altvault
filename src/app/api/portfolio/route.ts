export const dynamic = "force-dynamic";

/**
 * Server-side portfolio storage.
 *
 * Uses ebay_cache as a general KV store (key = "portfolio:{userId}") because
 * the Neon free-tier DB is at 512 MB capacity (mtg_cards alone = 459 MB),
 * so creating a new table is not possible without upgrading the plan.
 *
 * GET  /api/portfolio         — returns authenticated user's assets array
 * PUT  /api/portfolio         — replaces authenticated user's assets array
 * DELETE /api/portfolio       — clears authenticated user's portfolio
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, ebayCache } from "@/lib/db";
import { getUserFromRequest } from "@/lib/authServer";
import type { Asset } from "@/types/asset";

const FAR_FUTURE = "2099-12-31T23:59:59.000Z";

function portfolioKey(userId: string) {
  return `portfolio:${userId}`;
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const key = portfolioKey(user.id);
    const rows = await db.select().from(ebayCache).where(eq(ebayCache.query, key)).limit(1);
    const row = rows[0];
    if (!row) return NextResponse.json({ assets: [] });
    const payload = row.data as { assets?: unknown[] };
    return NextResponse.json({ assets: payload.assets ?? [] });
  } catch (err) {
    console.error("[portfolio] GET error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let assets: Asset[];
  try {
    const body = await req.json() as { assets: Asset[] };
    assets = body.assets;
    if (!Array.isArray(assets)) throw new Error("assets must be an array");
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const key = portfolioKey(user.id);
    const payload = { assets } as unknown as Record<string, unknown>;
    // DELETE + INSERT to avoid onConflictDoUpdate issues on Neon
    await db.delete(ebayCache).where(eq(ebayCache.query, key));
    await db.insert(ebayCache).values({ query: key, data: payload, expiresAt: FAR_FUTURE });
    return NextResponse.json({ ok: true, count: assets.length });
  } catch (err) {
    console.error("[portfolio] PUT error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const key = portfolioKey(user.id);
    await db.delete(ebayCache).where(eq(ebayCache.query, key));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[portfolio] DELETE error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
