export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export interface RetiringSet {
  number: string;
  name: string;
  theme: string;
  year: number | null;
  pieces: number | null;
  rrpGbp: number | null;
  rrpUsd: number | null;
  rrpEur: number | null;
  imageUrl: string | null;
  bricksetUrl: string;
  rebrickableUrl: string | null;
  // Enriched by /api/lego/enrich (BrickSet) — null from this route
  launchDate: string | null;
  exitDate: string | null;
}

const KEY      = process.env.REBRICKABLE_API_KEY ?? "";
const RB_BASE  = "https://rebrickable.com/api/v3/lego";
const MIN_YEAR = 2021;
const PAGE_SIZE = 1000;

async function fetchAllThemes(): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (!KEY) return map;
  try {
    const res = await fetch(`${RB_BASE}/themes/?page_size=1000&key=${KEY}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return map;
    const data = await res.json();
    for (const t of data.results ?? []) map.set(t.id as number, t.name as string);
  } catch { /* ignore */ }
  return map;
}

async function fetchPage(page: number): Promise<{ results: unknown[]; count: number }> {
  const url =
    `${RB_BASE}/sets/?min_year=${MIN_YEAR}&ordering=-year,-set_num` +
    `&page_size=${PAGE_SIZE}&page=${page}&key=${KEY}`;
  const res = await fetch(url, { next: { revalidate: 43200 } });
  if (!res.ok) throw new Error(`Rebrickable ${res.status}`);
  return res.json();
}

export async function GET() {
  if (!KEY) {
    return NextResponse.json(
      { error: "REBRICKABLE_API_KEY not configured", sets: [], setupRequired: true },
      { status: 200 },
    );
  }

  try {
    // Fetch themes + first page in parallel
    const [themes, firstPage] = await Promise.all([fetchAllThemes(), fetchPage(1)]);

    const totalPages = Math.ceil(firstPage.count / PAGE_SIZE);

    // Fetch remaining pages in parallel
    const restPages = totalPages > 1
      ? await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) => fetchPage(i + 2)),
        )
      : [];

    const allRaw = [firstPage, ...restPages].flatMap((p) => p.results) as Array<{
      set_num: string;
      name: string;
      theme_id: number;
      year: number;
      num_parts: number;
      set_img_url: string | null;
      set_url: string;
    }>;

    const sets: RetiringSet[] = allRaw.map((s) => {
      const num = s.set_num.replace(/-1$/, "");
      return {
        number: num,
        name: s.name,
        theme: themes.get(s.theme_id) ?? `Theme ${s.theme_id}`,
        year: s.year ?? null,
        pieces: s.num_parts ?? null,
        rrpGbp: null,
        rrpUsd: null,
        rrpEur: null,
        imageUrl: s.set_img_url ?? null,
        bricksetUrl: `https://brickset.com/sets/${num}-1`,
        rebrickableUrl: s.set_url ?? null,
        launchDate: null,
        exitDate: null,
      };
    });

    return NextResponse.json({
      sets,
      total: sets.length,
      source: "rebrickable",
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg, sets: [] }, { status: 502 });
  }
}
