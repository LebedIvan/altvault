export const dynamic = "force-dynamic";

/**
 * Server-side portfolio storage.
 * GET    /api/portfolio  — returns authenticated user's assets array
 * PUT    /api/portfolio  — replaces authenticated user's assets array
 * DELETE /api/portfolio  — clears authenticated user's portfolio
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, portfolioAssets } from "@/lib/db";
import { getUserFromRequest } from "@/lib/authServer";
import { z } from "zod";
import { AssetSchema } from "@/types/asset";
import type { Asset } from "@/types/asset";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rows = await db
      .select()
      .from(portfolioAssets)
      .where(eq(portfolioAssets.userId, user.id));

    const assets = rows
      .map((r) => AssetSchema.safeParse(r.data))
      .filter((r) => r.success)
      .map((r) => (r as { success: true; data: Asset }).data);

    return NextResponse.json({ assets });
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
    const parsed = z.array(AssetSchema).safeParse(body.assets);
    if (!parsed.success) throw new Error("Invalid assets");
    assets = parsed.data;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    // Delete all existing assets for this user, then re-insert
    await db.delete(portfolioAssets).where(eq(portfolioAssets.userId, user.id));

    if (assets.length > 0) {
      await db.insert(portfolioAssets).values(
        assets.map((a) => ({
          id:        a.id,
          userId:    user.id,
          data:      a as unknown as Record<string, unknown>,
          updatedAt: new Date().toISOString(),
        })),
      );
    }

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
    await db.delete(portfolioAssets).where(eq(portfolioAssets.userId, user.id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[portfolio] DELETE error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
