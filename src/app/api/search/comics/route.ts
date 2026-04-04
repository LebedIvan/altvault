export const dynamic = "force-dynamic";
/**
 * Comics search — uses ComicVine API if COMICVINE_API_KEY is set,
 * supplements with local comics-db, and falls back to a curated static list.
 *
 * GET /api/search/comics?q=amazing+spider-man
 */
import { NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z.object({ q: z.string().min(1).max(100) });

function abortFetch(url: string, ms = 8000): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return fetch(url, {
    headers: { "User-Agent": "Vaulty/1.0" },
    signal: controller.signal,
  }).finally(() => clearTimeout(t));
}

// ─── Shared result type ───────────────────────────────────────────────────────

interface ComicSuggestion {
  id: string;
  name: string;
  fullName: string;
  set: string;
  rarity: string | null;
  imageSmall: string | null;
  imageLarge: string | null;
  priceCents: number | null;
  currency: string;
}

// ─── ComicVine API integration ────────────────────────────────────────────────

interface CVIssue {
  id: number;
  name: string | null;
  issue_number: string;
  volume: { name: string; id: number };
  cover_date?: string;
  image?: { small_url?: string; medium_url?: string };
}

async function searchComicVine(q: string): Promise<ComicSuggestion[] | null> {
  const key = process.env.COMICVINE_API_KEY;
  if (!key) return null;

  const url =
    `https://comicvine.gamespot.com/api/search/` +
    `?api_key=${key}` +
    `&format=json` +
    `&resources=issue` +
    `&query=${encodeURIComponent(q)}` +
    `&field_list=id,name,issue_number,volume,cover_date,image` +
    `&limit=20`;

  try {
    const res = await abortFetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: CVIssue[];
    };

    return (data.results ?? []).map((issue) => {
      const volName = issue.volume?.name ?? "Unknown Series";
      const issueLabel = issue.name
        ? `${volName} #${issue.issue_number} — ${issue.name}`
        : `${volName} #${issue.issue_number}`;
      const yearPart = issue.cover_date
        ? ` (${issue.cover_date.slice(0, 4)})`
        : "";

      return {
        id:         `cv-${issue.id}`,
        name:       volName,
        fullName:   `${issueLabel}${yearPart}`,
        set:        volName,
        rarity:     issue.cover_date ? `Cover date: ${issue.cover_date}` : null,
        imageSmall: issue.image?.small_url ?? null,
        imageLarge: issue.image?.medium_url ?? null,
        priceCents: null,
        currency:   "USD",
      };
    });
  } catch {
    return null;
  }
}

// ─── Local DB search ──────────────────────────────────────────────────────────

async function searchLocalDb(q: string): Promise<ComicSuggestion[]> {
  try {
    const { search: dbSearch } = await import("@/lib/comicsDb");
    const records = await dbSearch(q, 20);
    return records.map((r) => {
      const yearPart = r.coverDate ? ` (${r.coverDate.slice(0, 4)})` : "";
      const fullName = `${r.volumeName} #${r.issueNumber}${yearPart}${r.keyIssueReason ? ` — ${r.keyIssueReason}` : ""}`;
      return {
        id:         `cv-${r.cvId}`,
        name:       r.volumeName,
        fullName,
        set:        r.volumeName,
        rarity:     r.keyIssueReason ?? null,
        imageSmall: r.coverImageUrl ?? null,
        imageLarge: r.coverImageUrl ?? null,
        priceCents: r.priceRawCents ?? null,
        currency:   r.priceCurrency ?? "USD",
      };
    });
  } catch {
    return [];
  }
}

// ─── Static curated fallback ──────────────────────────────────────────────────
//
// Used only when ComicVine is unavailable AND the local DB is empty.
// Covers the most searched/valuable key issues across all eras.

const STATIC_COMICS: ComicSuggestion[] = [
  // Golden Age
  { id: "af-1",          name: "Action Comics",       fullName: "Action Comics #1 (1938) — 1st Superman",          set: "Action Comics",       rarity: "1st Appearance Superman",  imageSmall: null, imageLarge: null, priceCents: 3000000_00, currency: "USD" },
  { id: "detective-27",  name: "Detective Comics",    fullName: "Detective Comics #27 (1939) — 1st Batman",         set: "Detective Comics",    rarity: "1st Appearance Batman",    imageSmall: null, imageLarge: null, priceCents: 1500000_00, currency: "USD" },
  { id: "batman-1-1940", name: "Batman",              fullName: "Batman #1 (1940) — 1st Joker & Catwoman",          set: "Batman",              rarity: "1st Joker",                imageSmall: null, imageLarge: null, priceCents: 500000_00, currency: "USD" },
  { id: "cap-am-1",      name: "Captain America",     fullName: "Captain America Comics #1 (1941) — 1st Cap",       set: "Captain America",     rarity: "1st Captain America",      imageSmall: null, imageLarge: null, priceCents: 300000_00, currency: "USD" },
  { id: "allstar-8",     name: "All Star Comics",     fullName: "All Star Comics #8 (1941) — 1st Wonder Woman",     set: "All Star Comics",     rarity: "1st Wonder Woman",         imageSmall: null, imageLarge: null, priceCents: 250000_00, currency: "USD" },
  // Silver Age
  { id: "showcase-4",    name: "Showcase",            fullName: "Showcase #4 (1956) — 1st Silver Age Flash",        set: "Showcase",            rarity: "1st Barry Allen Flash",    imageSmall: null, imageLarge: null, priceCents: 150000_00, currency: "USD" },
  { id: "af-15",         name: "Amazing Fantasy",     fullName: "Amazing Fantasy #15 (1962) — 1st Spider-Man",      set: "Amazing Fantasy",     rarity: "1st Appearance Spider-Man",imageSmall: null, imageLarge: null, priceCents: 100000_00, currency: "USD" },
  { id: "ff-1",          name: "Fantastic Four",      fullName: "Fantastic Four #1 (1961) — 1st Fantastic Four",    set: "Fantastic Four",      rarity: "1st Appearance",           imageSmall: null, imageLarge: null, priceCents: 60000_00, currency: "USD" },
  { id: "jim-83",        name: "Journey into Mystery",fullName: "Journey into Mystery #83 (1962) — 1st Thor",       set: "Journey into Mystery",rarity: "1st Thor",                 imageSmall: null, imageLarge: null, priceCents: 50000_00, currency: "USD" },
  { id: "tos-39",        name: "Tales of Suspense",   fullName: "Tales of Suspense #39 (1963) — 1st Iron Man",      set: "Tales of Suspense",   rarity: "1st Iron Man",             imageSmall: null, imageLarge: null, priceCents: 40000_00, currency: "USD" },
  { id: "avengers-1",    name: "Avengers",            fullName: "Avengers #1 (1963) — 1st Avengers team",           set: "Avengers",            rarity: "1st Appearance Avengers",  imageSmall: null, imageLarge: null, priceCents: 40000_00, currency: "USD" },
  { id: "xmen-1-1963",   name: "X-Men",               fullName: "X-Men #1 (1963) — 1st X-Men",                      set: "X-Men",               rarity: "1st Appearance X-Men",     imageSmall: null, imageLarge: null, priceCents: 80000_00, currency: "USD" },
  { id: "dd-1",          name: "Daredevil",           fullName: "Daredevil #1 (1964) — 1st Daredevil",              set: "Daredevil",           rarity: "1st Daredevil",            imageSmall: null, imageLarge: null, priceCents: 10000_00, currency: "USD" },
  { id: "asm-14",        name: "Amazing Spider-Man",  fullName: "Amazing Spider-Man #14 (1964) — 1st Green Goblin", set: "Amazing Spider-Man",  rarity: "1st Green Goblin",         imageSmall: null, imageLarge: null, priceCents: 25000_00, currency: "USD" },
  { id: "asm-1",         name: "Amazing Spider-Man",  fullName: "Amazing Spider-Man #1 (1963) — 1st solo title",    set: "Amazing Spider-Man",  rarity: "1st solo ASM title",       imageSmall: null, imageLarge: null, priceCents: 70000_00, currency: "USD" },
  { id: "st-110",        name: "Strange Tales",       fullName: "Strange Tales #110 (1963) — 1st Doctor Strange",   set: "Strange Tales",       rarity: "1st Doctor Strange",       imageSmall: null, imageLarge: null, priceCents: 15000_00, currency: "USD" },
  // Bronze Age
  { id: "hulk-180",      name: "Incredible Hulk",     fullName: "Incredible Hulk #180 (1974) — 1st Wolverine cameo",set: "Incredible Hulk",     rarity: "1st Wolverine cameo",      imageSmall: null, imageLarge: null, priceCents: 5000_00, currency: "USD" },
  { id: "hulk-181",      name: "Incredible Hulk",     fullName: "Incredible Hulk #181 (1974) — 1st full Wolverine", set: "Incredible Hulk",     rarity: "1st Full Wolverine",       imageSmall: null, imageLarge: null, priceCents: 15000_00, currency: "USD" },
  { id: "gsxm-1",        name: "Giant-Size X-Men",    fullName: "Giant-Size X-Men #1 (1975) — new X-Men team",      set: "Giant-Size X-Men",    rarity: "1st Storm, Colossus, Nightcrawler", imageSmall: null, imageLarge: null, priceCents: 8000_00, currency: "USD" },
  { id: "asm-129",       name: "Amazing Spider-Man",  fullName: "Amazing Spider-Man #129 (1974) — 1st Punisher",    set: "Amazing Spider-Man",  rarity: "1st Punisher",             imageSmall: null, imageLarge: null, priceCents: 3000_00, currency: "USD" },
  { id: "tod-10",        name: "Tomb of Dracula",     fullName: "Tomb of Dracula #10 (1973) — 1st Blade",          set: "Tomb of Dracula",     rarity: "1st Blade",                imageSmall: null, imageLarge: null, priceCents: 2000_00, currency: "USD" },
  { id: "batman-232",    name: "Batman",              fullName: "Batman #232 (1971) — 1st Ra's al Ghul",           set: "Batman",              rarity: "1st Ra's al Ghul",         imageSmall: null, imageLarge: null, priceCents: 1500_00, currency: "USD" },
  // Copper Age
  { id: "nm-98",         name: "New Mutants",         fullName: "New Mutants #98 (1991) — 1st Deadpool",           set: "New Mutants",         rarity: "1st Deadpool",             imageSmall: null, imageLarge: null, priceCents: 800_00, currency: "USD" },
  { id: "asm-252",       name: "Amazing Spider-Man",  fullName: "Amazing Spider-Man #252 (1984) — 1st black costume",set: "Amazing Spider-Man", rarity: "1st Black Costume",        imageSmall: null, imageLarge: null, priceCents: 300_00, currency: "USD" },
  { id: "watchmen-1",    name: "Watchmen",            fullName: "Watchmen #1 (1986) — Alan Moore",                  set: "Watchmen",            rarity: "Landmark modern comic",    imageSmall: null, imageLarge: null, priceCents: 200_00, currency: "USD" },
  { id: "dkr-1",         name: "Batman: The Dark Knight Returns", fullName: "Batman: The Dark Knight Returns #1 (1986) — Frank Miller", set: "Batman", rarity: "Landmark Frank Miller", imageSmall: null, imageLarge: null, priceCents: 150_00, currency: "USD" },
  { id: "asm-300",       name: "Amazing Spider-Man",  fullName: "Amazing Spider-Man #300 (1988) — 1st Venom",      set: "Amazing Spider-Man",  rarity: "1st Full Venom",           imageSmall: null, imageLarge: null, priceCents: 2000_00, currency: "USD" },
  { id: "spawn-1",       name: "Spawn",               fullName: "Spawn #1 (1992) — 1st Spawn",                     set: "Spawn",               rarity: "Modern Age Key",           imageSmall: null, imageLarge: null, priceCents: 100_00, currency: "USD" },
  { id: "xmen-1-1991",   name: "X-Men",               fullName: "X-Men #1 (1991) — Jim Lee — best-selling issue",  set: "X-Men",               rarity: "Best-selling single issue", imageSmall: null, imageLarge: null, priceCents: 50_00, currency: "USD" },
  { id: "sandman-1",     name: "Sandman",             fullName: "Sandman #1 (1989) — Neil Gaiman",                  set: "Sandman",             rarity: "Modern Age Key",           imageSmall: null, imageLarge: null, priceCents: 300_00, currency: "USD" },
  // Modern Age
  { id: "wd-1",          name: "Walking Dead",        fullName: "Walking Dead #1 (2003) — 1st Rick Grimes",         set: "Walking Dead",        rarity: "Modern Age Key",           imageSmall: null, imageLarge: null, priceCents: 2500_00, currency: "USD" },
  { id: "msm-1-2014",    name: "Ms. Marvel",          fullName: "Ms. Marvel #1 (2014) — 1st Kamala Khan",           set: "Ms. Marvel",          rarity: "1st Kamala Khan",          imageSmall: null, imageLarge: null, priceCents: 200_00, currency: "USD" },
  { id: "invincible-1",  name: "Invincible",          fullName: "Invincible #1 (2003) — 1st Invincible",            set: "Invincible",          rarity: "1st Invincible",           imageSmall: null, imageLarge: null, priceCents: 150_00, currency: "USD" },
  { id: "hox-1",         name: "House of X",          fullName: "House of X #1 (2019) — Jonathan Hickman X-Men",    set: "House of X",          rarity: "Krakoa era begins",        imageSmall: null, imageLarge: null, priceCents: 20_00, currency: "USD" },
  { id: "doomsclock-1",  name: "Doomsday Clock",      fullName: "Doomsday Clock #1 (2017) — Watchmen meets DC",      set: "Doomsday Clock",      rarity: "DC landmark crossover",    imageSmall: null, imageLarge: null, priceCents: 30_00, currency: "USD" },
];

function dedupeById(items: ComicSuggestion[]): ComicSuggestion[] {
  const map = new Map<string, ComicSuggestion>();
  for (const item of items) {
    const existing = map.get(item.id);
    // Prefer item that has a price over one that doesn't
    if (!existing || (existing.priceCents == null && item.priceCents != null)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({ q: searchParams.get("q") });
  if (!parsed.success)
    return NextResponse.json({ error: "Missing q" }, { status: 400 });

  const q = parsed.data.q;

  // 1. Try ComicVine live search
  const cvResults = await searchComicVine(q);

  // 2. Search local DB in parallel with CV (or as supplement)
  const dbResults = await searchLocalDb(q);

  // 3. Merge: CV first (live), then DB extras, deduped
  if (cvResults && cvResults.length > 0) {
    const merged = dedupeById([...cvResults, ...dbResults]);
    return NextResponse.json({
      suggestions: merged.slice(0, 25),
      total: merged.length,
      source: "comicvine",
    });
  }

  // 4. DB-only results
  if (dbResults.length > 0) {
    return NextResponse.json({
      suggestions: dbResults,
      total: dbResults.length,
      source: "local_db",
    });
  }

  // 5. Static fallback — fuzzy filter
  const lq = q.toLowerCase();
  const matched = STATIC_COMICS.filter(
    (c) =>
      c.name.toLowerCase().includes(lq) ||
      c.fullName.toLowerCase().includes(lq) ||
      (c.rarity ?? "").toLowerCase().includes(lq),
  );

  const final = matched.length > 0 ? matched : STATIC_COMICS.slice(0, 10);

  return NextResponse.json({
    suggestions: final,
    total: final.length,
    source: "static",
    hint: !process.env.COMICVINE_API_KEY
      ? "Set COMICVINE_API_KEY for live ComicVine search across millions of issues"
      : undefined,
  });
}
