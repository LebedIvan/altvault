export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export interface BrickSetEnrichment {
  setNumber: string;
  launchDate: string | null;  // "YYYY-MM-DD"
  exitDate: string | null;    // "YYYY-MM-DD"
  msrpUsd: number | null;
  msrpGbp: number | null;
  msrpEur: number | null;
}

export interface EnrichResponse {
  sets: Record<string, BrickSetEnrichment>;
  source: "brickset" | "unavailable";
  fetchedAt: string;
  setupRequired?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BS_BASE  = "https://brickset.com/api/v3.asmx";
const MIN_YEAR = 2021;

function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // BrickSet returns "2022-11-01T00:00:00" — keep only the date part
  const d = raw.split("T")[0];
  return d && d.length === 10 ? d : null;
}

interface BsSet {
  number: string;
  launchDate?: string | null;
  exitDate?: string | null;
  LEGOCom?: {
    US?: { retailPrice?: number | null };
    UK?: { retailPrice?: number | null };
    DE?: { retailPrice?: number | null };
  };
}

interface BsResponse {
  status: string;
  matches: number;
  sets?: BsSet[];
}

async function fetchBricksetPage(
  apiKey: string,
  year: number,
  page: number,
): Promise<BsResponse> {
  const params = JSON.stringify({
    pageSize: 500,
    pageNumber: page,
    year: String(year),
  });
  const url =
    `${BS_BASE}/getSets` +
    `?apiKey=${encodeURIComponent(apiKey)}` +
    `&userHash=` +
    `&params=${encodeURIComponent(params)}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`BrickSet ${res.status} for year ${year} page ${page}`);
  return res.json() as Promise<BsResponse>;
}

async function fetchAllForYear(apiKey: string, year: number): Promise<BsSet[]> {
  const first = await fetchBricksetPage(apiKey, year, 1);
  if (first.status !== "success") return [];
  const sets = first.sets ?? [];
  const totalPages = Math.ceil(first.matches / 500);
  if (totalPages <= 1) return sets;

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      fetchBricksetPage(apiKey, year, i + 2),
    ),
  );
  return [...sets, ...rest.flatMap((r) => r.sets ?? [])];
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function GET() {
  const apiKey = process.env.BRICKSET_API_KEY ?? "";

  if (!apiKey) {
    return NextResponse.json<EnrichResponse>({
      sets: {},
      source: "unavailable",
      fetchedAt: new Date().toISOString(),
      setupRequired: true,
    });
  }

  try {
    const currentYear = new Date().getFullYear();
    const years = Array.from(
      { length: currentYear - MIN_YEAR + 1 },
      (_, i) => MIN_YEAR + i,
    );

    const allSets = (
      await Promise.all(years.map((y) => fetchAllForYear(apiKey, y)))
    ).flat();

    const result: Record<string, BrickSetEnrichment> = {};
    for (const s of allSets) {
      if (!s.number) continue;
      // Normalise: BrickSet returns "10307" (no suffix needed)
      const num = s.number.replace(/-1$/, "");
      result[num] = {
        setNumber: num,
        launchDate: isoDate(s.launchDate),
        exitDate:   isoDate(s.exitDate),
        msrpUsd: s.LEGOCom?.US?.retailPrice ?? null,
        msrpGbp: s.LEGOCom?.UK?.retailPrice ?? null,
        msrpEur: s.LEGOCom?.DE?.retailPrice ?? null,
      };
    }

    return NextResponse.json<EnrichResponse>({
      sets: result,
      source: "brickset",
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json<EnrichResponse>(
      { sets: {}, source: "unavailable", fetchedAt: new Date().toISOString() },
      { status: 502, statusText: msg },
    );
  }
}
