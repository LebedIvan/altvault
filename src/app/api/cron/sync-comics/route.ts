export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily cron — re-fetches ComicVine metadata for up to 25 comics
 * with the oldest lastSyncedAt, enriching writer/artist/era fields.
 *
 * Schedule: 30 3 * * * (3:30am UTC) — see vercel.json
 * Protected by CRON_SECRET env var (set in Vercel, passed as Authorization: Bearer).
 */
import { NextResponse } from "next/server";
import { getComicsForMetadataSync, upsertIssues } from "@/lib/comicsDb";

const CV_BASE    = "https://comicvine.gamespot.com/api";
const DELAY_MS   = 2100; // 2.1s gap — safely under ComicVine's 200 req/hour limit
const BATCH_LIMIT = 25;

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ").trim().slice(0, 500) || null;
}

function deriveEra(coverDate: string | null | undefined): string | null {
  if (!coverDate) return null;
  const year = parseInt(coverDate.slice(0, 4));
  if (isNaN(year)) return null;
  if (year < 1956) return "golden";
  if (year < 1970) return "silver";
  if (year < 1985) return "bronze";
  if (year < 1993) return "copper";
  return "modern";
}

interface CVDetail {
  name: string | null;
  cover_date: string | null;
  image: { small_url?: string; medium_url?: string } | null;
  site_detail_url: string | null;
  description: string | null;
  character_credits: { name: string }[] | null;
  story_arc_credits: { name: string }[] | null;
  publisher: { name: string } | null;
  person_credits: { name: string; role: string }[] | null;
}

async function fetchCVDetail(cvId: string): Promise<CVDetail | null> {
  const apiKey = process.env.COMICVINE_API_KEY;
  if (!apiKey) return null;
  try {
    const url =
      `${CV_BASE}/issue/4000-${cvId}/` +
      `?api_key=${apiKey}&format=json` +
      `&field_list=id,name,cover_date,image,site_detail_url,description,` +
      `character_credits,story_arc_credits,publisher,person_credits`;
    const res = await fetch(url, { headers: { "User-Agent": "Vaulty/1.0 comics-sync" } });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: CVDetail };
    return data.results ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const auth   = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.COMICVINE_API_KEY) {
    return NextResponse.json({ error: "COMICVINE_API_KEY not set" }, { status: 500 });
  }

  const stale = await getComicsForMetadataSync(BATCH_LIMIT);
  let updated = 0;
  let failed  = 0;

  for (let i = 0; i < stale.length; i++) {
    const comic  = stale[i]!;
    const detail = await fetchCVDetail(comic.cvId);

    if (!detail) {
      failed++;
    } else {
      const coverDate = detail.cover_date ?? comic.coverDate;
      const writer    = detail.person_credits?.find(
        (p) => p.role.toLowerCase().includes("writer"),
      )?.name ?? null;
      const artist    = detail.person_credits?.find(
        (p) => p.role.toLowerCase().includes("artist") || p.role.toLowerCase().includes("pencil"),
      )?.name ?? null;

      await upsertIssues([{
        cvId:           comic.cvId,
        volumeName:     comic.volumeName,
        volumeCvId:     comic.volumeCvId,
        issueNumber:    comic.issueNumber,
        name:           detail.name              ?? comic.name,
        publisher:      detail.publisher?.name   ?? comic.publisher,
        coverDate,
        coverImageUrl:  detail.image?.medium_url ?? detail.image?.small_url ?? comic.coverImageUrl,
        description:    stripHtml(detail.description) ?? comic.description,
        characters:     detail.character_credits?.map((c) => c.name).slice(0, 20) ?? comic.characters,
        storyArcs:      detail.story_arc_credits?.map((a) => a.name) ?? comic.storyArcs,
        isKeyIssue:     comic.isKeyIssue,
        keyIssueReason: comic.keyIssueReason,
        cvUrl:          detail.site_detail_url   ?? comic.cvUrl,
        sources:        comic.sources.includes("comicvine") ? comic.sources : [...comic.sources, "comicvine"],
        writer,
        artist,
        era:            deriveEra(coverDate) ?? comic.era,
        // Price fields preserved by upsert COALESCE — pass through existing values
        priceRawCents:      comic.priceRawCents,
        priceGraded98Cents: comic.priceGraded98Cents,
        priceGraded96Cents: comic.priceGraded96Cents,
        priceGraded94Cents: comic.priceGraded94Cents,
        priceCurrency:      comic.priceCurrency,
        priceSource:        comic.priceSource,
        priceUpdatedAt:     comic.priceUpdatedAt,
        priceSampleSize:    comic.priceSampleSize,
        lastSyncedAt:       new Date().toISOString(),
      }]);
      updated++;
    }

    if (i < stale.length - 1) await sleep(DELAY_MS);
  }

  return NextResponse.json({
    processed: stale.length,
    updated,
    failed,
    runAt: new Date().toISOString(),
  });
}
