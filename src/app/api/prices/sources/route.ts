export const dynamic = "force-dynamic";
/**
 * GET /api/prices/sources?assetClass=lego&externalId=21336&name=The+Office&force=true
 *
 * Returns prices from all relevant market sources for an asset.
 * Results are cached in DB for 12h. Pass force=true to bypass cache.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchAllSources } from "@/lib/marketSources";

const QuerySchema = z.object({
  assetClass: z.string().min(1),
  name:       z.string().min(1),
  externalId: z.string().optional(),
  force:      z.enum(["true", "false"]).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    assetClass: searchParams.get("assetClass"),
    name:       searchParams.get("name"),
    externalId: searchParams.get("externalId") ?? undefined,
    force:      searchParams.get("force") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Missing assetClass or name" }, { status: 400 });
  }

  const { assetClass, name, externalId, force } = parsed.data;

  const sources = await fetchAllSources(
    assetClass,
    externalId ?? null,
    name,
    force === "true",
  );

  return NextResponse.json({ sources, fetchedAt: new Date().toISOString() });
}
