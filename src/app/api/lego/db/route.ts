import { NextRequest, NextResponse } from "next/server";
import { getAll, getStats, isEmpty } from "@/lib/legoDb";
import type { LegoSetRecord } from "@/lib/legoSetRecord";

export interface LegoDbResponse {
  sets: LegoSetRecord[];
  total: number;
  filtered: number;
  syncedAt: string | null;
  stats: {
    totalSets: number;
    withBrickowl: number;
    withPrices: number;
    withDates: number;
    syncedAt: string | null;
  };
  empty: boolean;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const minYear  = searchParams.get("minYear")  ? parseInt(searchParams.get("minYear")!)  : null;
  const maxYear  = searchParams.get("maxYear")  ? parseInt(searchParams.get("maxYear")!)  : null;
  const theme    = searchParams.get("theme")    ?? null;
  const limit    = searchParams.get("limit")    ? parseInt(searchParams.get("limit")!)    : null;
  const offset   = searchParams.get("offset")   ? parseInt(searchParams.get("offset")!)   : 0;

  const stats = getStats();

  if (isEmpty()) {
    return NextResponse.json<LegoDbResponse>({
      sets: [],
      total: 0,
      filtered: 0,
      syncedAt: null,
      stats,
      empty: true,
    });
  }

  let sets = getAll();

  // Apply filters
  if (minYear != null)  sets = sets.filter((s) => (s.year ?? 0) >= minYear);
  if (maxYear != null)  sets = sets.filter((s) => (s.year ?? 9999) <= maxYear);
  if (theme != null)    sets = sets.filter((s) => s.theme === theme);

  const filtered = sets.length;

  // Apply pagination
  if (offset > 0) sets = sets.slice(offset);
  if (limit != null) sets = sets.slice(0, limit);

  return NextResponse.json<LegoDbResponse>(
    {
      sets,
      total: stats.totalSets,
      filtered,
      syncedAt: stats.syncedAt,
      stats,
      empty: false,
    },
    { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=600" } },
  );
}
