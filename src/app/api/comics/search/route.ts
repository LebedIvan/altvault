export const dynamic = "force-dynamic";

/**
 * Comic search endpoint — used by the "New Transaction" form.
 *
 * GET /api/comics/search?q=spider-man+300&limit=10
 *
 * Returns a lightweight array of matching comics, ordered by relevance.
 * Uses case-insensitive substring matching on volume name, story title,
 * and key issue reason.
 */
import { NextResponse } from "next/server";
import { search } from "@/lib/comicsDb";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q     = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 50);

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const results = await search(q, limit);

  return NextResponse.json(
    results.map((r) => ({
      cvId:           r.cvId,
      volumeName:     r.volumeName,
      issueNumber:    r.issueNumber,
      fullTitle:      `${r.volumeName} #${r.issueNumber}`,
      publisher:      r.publisher,
      coverDate:      r.coverDate,
      coverImageUrl:  r.coverImageUrl,
      isKeyIssue:     r.isKeyIssue,
      keyIssueReason: r.keyIssueReason,
      era:            r.era,
      writer:         r.writer,
      artist:         r.artist,
      priceRawCents:  r.priceRawCents,
      priceCurrency:  r.priceCurrency,
      priceSource:    r.priceSource,
      priceUpdatedAt: r.priceUpdatedAt,
    })),
  );
}
