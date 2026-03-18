/**
 * Comics database sync script.
 *
 * Fetches key-issue comic metadata from ComicVine, enriches with characters
 * and story arcs, and writes the result to data/comics-db.json.
 *
 * Usage:
 *   npx tsx scripts/sync-comics.ts
 *
 * Environment variables (from .env.local or system env):
 *   COMICVINE_API_KEY   — required (get one at https://comicvine.gamespot.com/api/)
 *
 * The script runs in two phases:
 *   Phase 1 — Search for each entry in KEY_ISSUE_SEARCHES, resolve to CV issue IDs.
 *   Phase 2 — Fetch full issue details (characters, story arcs, cover image, description).
 */

import path from "path";
import fs from "fs";
import type { ComicRecord } from "../src/lib/comicRecord";

// ─── Load .env.local ──────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const CV_KEY = process.env.COMICVINE_API_KEY ?? "";
const DB_PATH = path.join(process.cwd(), "data", "comics-db.json");

// ─── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchWithTimeout(url: string, ms = 12000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      headers: { "User-Agent": "Vaulty/1.0 comics-sync" },
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function log(msg: string) {
  process.stdout.write(`[${new Date().toISOString().slice(11, 19)}] ${msg}\n`);
}

/** Strip HTML tags from ComicVine description fields */
function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 500) || null;
}

// ─── Database I/O ─────────────────────────────────────────────────────────────

interface ComicsDbFile {
  version: number;
  syncedAt: string | null;
  totalIssues: number;
  issues: Record<string, ComicRecord>;
}

function loadDb(): ComicsDbFile {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8")) as ComicsDbFile;
  } catch {
    return { version: 1, syncedAt: null, totalIssues: 0, issues: {} };
  }
}

function saveDb(db: ComicsDbFile) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  log(`Saved ${db.totalIssues} issues to data/comics-db.json`);
}

function upsert(db: ComicsDbFile, records: Partial<ComicRecord>[]) {
  for (const r of records) {
    if (!r.cvId) continue;
    const existing = db.issues[r.cvId];
    if (!existing) {
      db.issues[r.cvId] = r as ComicRecord;
    } else {
      const merged: ComicRecord = { ...existing };
      for (const key of Object.keys(r) as (keyof ComicRecord)[]) {
        const val = r[key];
        if (val !== null && val !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (merged as any)[key] = val;
        }
      }
      if (r.sources) merged.sources = Array.from(new Set([...existing.sources, ...r.sources]));
      if (r.characters?.length) merged.characters = Array.from(new Set([...existing.characters, ...(r.characters ?? [])]));
      if (r.storyArcs?.length) merged.storyArcs = Array.from(new Set([...existing.storyArcs, ...(r.storyArcs ?? [])]));
      db.issues[r.cvId] = merged;
    }
  }
  db.totalIssues = Object.keys(db.issues).length;
}

// ─── ComicVine API types ──────────────────────────────────────────────────────

interface CVSearchResult {
  id: number;
  name: string | null;
  issue_number: string;
  volume: { id: number; name: string };
  cover_date: string | null;
  image: { small_url?: string; medium_url?: string } | null;
  site_detail_url: string | null;
}

interface CVIssueDetail extends CVSearchResult {
  description: string | null;
  character_credits: { name: string }[] | null;
  story_arc_credits: { name: string }[] | null;
  publisher: { name: string } | null;
}

// ─── Curated key-issue search list ───────────────────────────────────────────
//
// Each entry contains:
//   query        — string sent to ComicVine search
//   issueNumber  — used to pick the correct result when multiple come back
//   volumeHint   — optional series name fragment to disambiguate
//   keyReason    — human-readable key-issue annotation

interface KeyIssueEntry {
  query: string;
  issueNumber: string;
  volumeHint?: string;
  keyReason: string;
}

const KEY_ISSUE_SEARCHES: KeyIssueEntry[] = [
  // ── Golden Age ──────────────────────────────────────────────────────────────
  { query: "Action Comics 1 1938",        issueNumber: "1",   volumeHint: "Action Comics",    keyReason: "1st appearance of Superman" },
  { query: "Detective Comics 27 1939",    issueNumber: "27",  volumeHint: "Detective Comics", keyReason: "1st appearance of Batman" },
  { query: "Batman 1 1940",               issueNumber: "1",   volumeHint: "Batman",           keyReason: "1st Joker & 1st Catwoman" },
  { query: "Captain America Comics 1 1941", issueNumber: "1", volumeHint: "Captain America",  keyReason: "1st appearance of Captain America" },
  { query: "All Star Comics 8 1941",      issueNumber: "8",   volumeHint: "All Star Comics",  keyReason: "1st appearance of Wonder Woman" },
  { query: "More Fun Comics 52 1940",     issueNumber: "52",  volumeHint: "More Fun Comics",  keyReason: "1st appearance of Green Arrow" },

  // ── Silver Age ───────────────────────────────────────────────────────────────
  { query: "Showcase 4 1956",             issueNumber: "4",   volumeHint: "Showcase",         keyReason: "1st Silver Age Flash (Barry Allen)" },
  { query: "Showcase 22 1959",            issueNumber: "22",  volumeHint: "Showcase",         keyReason: "1st Silver Age Green Lantern (Hal Jordan)" },
  { query: "Amazing Fantasy 15 1962",     issueNumber: "15",  volumeHint: "Amazing Fantasy",  keyReason: "1st appearance of Spider-Man" },
  { query: "Fantastic Four 1 1961",       issueNumber: "1",   volumeHint: "Fantastic Four",   keyReason: "1st Fantastic Four" },
  { query: "Journey into Mystery 83 1962", issueNumber: "83", volumeHint: "Journey into Mystery", keyReason: "1st appearance of Thor" },
  { query: "Tales of Suspense 39 1963",   issueNumber: "39",  volumeHint: "Tales of Suspense", keyReason: "1st appearance of Iron Man" },
  { query: "Avengers 1 1963",             issueNumber: "1",   volumeHint: "Avengers",         keyReason: "1st Avengers team" },
  { query: "X-Men 1 1963",               issueNumber: "1",   volumeHint: "X-Men",            keyReason: "1st X-Men" },
  { query: "Daredevil 1 1964",           issueNumber: "1",   volumeHint: "Daredevil",        keyReason: "1st appearance of Daredevil" },
  { query: "Amazing Spider-Man 14 1964", issueNumber: "14",  volumeHint: "Amazing Spider-Man", keyReason: "1st appearance of Green Goblin" },
  { query: "Tales to Astonish 27 1962",  issueNumber: "27",  volumeHint: "Tales to Astonish", keyReason: "1st appearance of Ant-Man (Henry Pym)" },
  { query: "Strange Tales 110 1963",     issueNumber: "110", volumeHint: "Strange Tales",    keyReason: "1st appearance of Doctor Strange" },
  { query: "Amazing Spider-Man 1 1963",  issueNumber: "1",   volumeHint: "Amazing Spider-Man", keyReason: "1st solo Amazing Spider-Man title" },
  { query: "Silver Surfer 1 1968",       issueNumber: "1",   volumeHint: "Silver Surfer",    keyReason: "1st solo Silver Surfer title" },

  // ── Bronze Age ───────────────────────────────────────────────────────────────
  { query: "Incredible Hulk 181 1974",   issueNumber: "181", volumeHint: "Incredible Hulk",  keyReason: "1st full appearance of Wolverine" },
  { query: "Incredible Hulk 180 1974",   issueNumber: "180", volumeHint: "Incredible Hulk",  keyReason: "1st cameo appearance of Wolverine" },
  { query: "Giant-Size X-Men 1 1975",    issueNumber: "1",   volumeHint: "Giant-Size X-Men", keyReason: "1st new X-Men team (Storm, Colossus, Nightcrawler, Wolverine)" },
  { query: "X-Men 94 1975",             issueNumber: "94",  volumeHint: "X-Men",            keyReason: "New X-Men team takes over title" },
  { query: "Star Wars 1 1977",          issueNumber: "1",   volumeHint: "Star Wars",        keyReason: "1st Marvel Star Wars comic" },
  { query: "Amazing Spider-Man 129 1974", issueNumber: "129", volumeHint: "Amazing Spider-Man", keyReason: "1st appearance of Punisher" },
  { query: "Tomb of Dracula 10 1973",    issueNumber: "10",  volumeHint: "Tomb of Dracula",  keyReason: "1st appearance of Blade" },
  { query: "Iron Fist 14 1977",         issueNumber: "14",  volumeHint: "Iron Fist",        keyReason: "1st appearance of Sabretooth" },
  { query: "Ms. Marvel 1 1977",         issueNumber: "1",   volumeHint: "Ms. Marvel",       keyReason: "1st appearance of Ms. Marvel (Carol Danvers)" },
  { query: "Nova 1 1976",               issueNumber: "1",   volumeHint: "Nova",             keyReason: "1st appearance of Nova (Richard Rider)" },
  { query: "New Teen Titans 2 1980",    issueNumber: "2",   volumeHint: "New Teen Titans",  keyReason: "1st appearance of Deathstroke" },
  { query: "Batman 232 1971",           issueNumber: "232", volumeHint: "Batman",           keyReason: "1st appearance of Ra's al Ghul" },
  { query: "Batman 251 1973",           issueNumber: "251", volumeHint: "Batman",           keyReason: "Classic Joker story — The Joker's Five-Way Revenge" },
  { query: "Swamp Thing 37 1985",       issueNumber: "37",  volumeHint: "Swamp Thing",      keyReason: "1st appearance of John Constantine" },

  // ── Copper Age ───────────────────────────────────────────────────────────────
  { query: "Wolverine 1 1982",          issueNumber: "1",   volumeHint: "Wolverine",        keyReason: "1st Wolverine solo limited series" },
  { query: "Amazing Spider-Man 252 1984", issueNumber: "252", volumeHint: "Amazing Spider-Man", keyReason: "1st black costume Spider-Man" },
  { query: "Secret Wars 8 1985",        issueNumber: "8",   volumeHint: "Secret Wars",      keyReason: "1st full black costume (symbiote)" },
  { query: "Crisis on Infinite Earths 1 1985", issueNumber: "1", volumeHint: "Crisis on Infinite Earths", keyReason: "DC universe-shattering crossover event" },
  { query: "Batman The Dark Knight Returns 1 1986", issueNumber: "1", volumeHint: "Batman: The Dark Knight Returns", keyReason: "Frank Miller's landmark Batman story" },
  { query: "Watchmen 1 1986",           issueNumber: "1",   volumeHint: "Watchmen",         keyReason: "Alan Moore's landmark superhero deconstruction" },
  { query: "Batman Year One 1 1987",    issueNumber: "404", volumeHint: "Batman",           keyReason: "Batman: Year One — Frank Miller" },
  { query: "Amazing Spider-Man 300 1988", issueNumber: "300", volumeHint: "Amazing Spider-Man", keyReason: "1st full appearance of Venom" },
  { query: "Spawn 1 1992",              issueNumber: "1",   volumeHint: "Spawn",            keyReason: "1st appearance of Spawn; Todd McFarlane" },
  { query: "New Mutants 98 1991",       issueNumber: "98",  volumeHint: "New Mutants",      keyReason: "1st appearance of Deadpool" },
  { query: "X-Force 2 1991",           issueNumber: "2",   volumeHint: "X-Force",          keyReason: "1st appearance of Domino (full)" },
  { query: "Uncanny X-Men 248 1989",    issueNumber: "248", volumeHint: "Uncanny X-Men",    keyReason: "1st Jim Lee art on X-Men" },
  { query: "X-Men 1 1991",              issueNumber: "1",   volumeHint: "X-Men",            keyReason: "Jim Lee relaunch — best-selling single issue ever" },
  { query: "Sandman 1 1989",            issueNumber: "1",   volumeHint: "Sandman",          keyReason: "Neil Gaiman's Sandman begins; 1st modern Morpheus" },
  { query: "Batman 497 1993",           issueNumber: "497", volumeHint: "Batman",           keyReason: "Bane breaks Batman's back (Knightfall)" },
  { query: "Superman 75 1993",          issueNumber: "75",  volumeHint: "Superman",         keyReason: "Death of Superman" },
  { query: "Green Lantern 48 1994",     issueNumber: "48",  volumeHint: "Green Lantern",    keyReason: "Hal Jordan becomes Parallax" },

  // ── Modern Age ───────────────────────────────────────────────────────────────
  { query: "Walking Dead 1 2003",       issueNumber: "1",   volumeHint: "Walking Dead",     keyReason: "1st appearance of Rick Grimes" },
  { query: "Ultimate Spider-Man 1 2000", issueNumber: "1",  volumeHint: "Ultimate Spider-Man", keyReason: "1st Ultimate Spider-Man (Miles' universe begins)" },
  { query: "Batman 608 2002",           issueNumber: "608", volumeHint: "Batman",           keyReason: "Hush storyline begins — Jim Lee art" },
  { query: "New X-Men 114 2001",        issueNumber: "114", volumeHint: "New X-Men",        keyReason: "Grant Morrison X-Men relaunch" },
  { query: "Invincible 1 2003",         issueNumber: "1",   volumeHint: "Invincible",       keyReason: "1st appearance of Invincible (Mark Grayson)" },
  { query: "All Star Superman 1 2005",  issueNumber: "1",   volumeHint: "All Star Superman", keyReason: "Grant Morrison's masterwork Superman story" },
  { query: "Amazing Spider-Man 569 2008", issueNumber: "569", volumeHint: "Amazing Spider-Man", keyReason: "1st appearance of Anti-Venom" },
  { query: "Blackest Night 1 2009",     issueNumber: "1",   volumeHint: "Blackest Night",   keyReason: "DC's emotional corps crossover event" },
  { query: "Brightest Day 1 2010",      issueNumber: "1",   volumeHint: "Brightest Day",    keyReason: "Follows Blackest Night, multiple resurrections" },
  { query: "FF 1 2011",                 issueNumber: "1",   volumeHint: "FF",               keyReason: "Future Foundation begins" },
  { query: "Superior Spider-Man 1 2013", issueNumber: "1",  volumeHint: "Superior Spider-Man", keyReason: "Doctor Octopus as Spider-Man" },
  { query: "Ms. Marvel 1 2014",         issueNumber: "1",   volumeHint: "Ms. Marvel",       keyReason: "1st appearance of Kamala Khan as Ms. Marvel" },
  { query: "Miles Morales Ultimate Spider-Man 1 2015", issueNumber: "1", volumeHint: "Miles Morales", keyReason: "Miles Morales first ongoing solo title" },
  { query: "Death of Wolverine 1 2014", issueNumber: "1",   volumeHint: "Death of Wolverine", keyReason: "Death of Wolverine storyline" },
  { query: "Thor 1 2014",               issueNumber: "1",   volumeHint: "Thor",             keyReason: "Jane Foster becomes Thor" },
  { query: "Secret Wars 1 2015",        issueNumber: "1",   volumeHint: "Secret Wars",      keyReason: "Marvel's Battleworld event — new Marvel Universe" },
  { query: "Civil War II 1 2016",       issueNumber: "1",   volumeHint: "Civil War II",     keyReason: "Marvel's major 2016 crossover event" },
  { query: "Batman 1 2016",             issueNumber: "1",   volumeHint: "Batman",           keyReason: "Tom King's Batman run begins (DC Rebirth)" },
  { query: "Doomsday Clock 1 2017",     issueNumber: "1",   volumeHint: "Doomsday Clock",   keyReason: "Watchmen meets DC Universe" },
  { query: "Amazing Spider-Man 800 2018", issueNumber: "800", volumeHint: "Amazing Spider-Man", keyReason: "Red Goblin vs. Spider-Man — landmark 800th issue" },
  { query: "House of X 1 2019",         issueNumber: "1",   volumeHint: "House of X",       keyReason: "Jonathan Hickman's X-Men relaunch — Krakoa era" },
  { query: "Powers of X 1 2019",        issueNumber: "1",   volumeHint: "Powers of X",      keyReason: "Companion to House of X — Krakoa era" },
  { query: "Fortnite x Marvel 1 2021",  issueNumber: "1",   volumeHint: "Fortnite",         keyReason: "Crossover with Fortnite game" },
];

// ─── ComicVine API helpers ────────────────────────────────────────────────────

const CV_BASE = "https://comicvine.gamespot.com/api";

async function cvSearch(query: string): Promise<CVSearchResult[]> {
  const url =
    `${CV_BASE}/search/` +
    `?api_key=${CV_KEY}` +
    `&format=json` +
    `&resources=issue` +
    `&query=${encodeURIComponent(query)}` +
    `&field_list=id,name,issue_number,volume,cover_date,image,site_detail_url` +
    `&limit=5`;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: CVSearchResult[] };
    return data.results ?? [];
  } catch {
    return [];
  }
}

async function cvIssueDetail(id: number): Promise<CVIssueDetail | null> {
  const url =
    `${CV_BASE}/issue/4000-${id}/` +
    `?api_key=${CV_KEY}` +
    `&format=json` +
    `&field_list=id,name,issue_number,volume,cover_date,image,site_detail_url,` +
    `description,character_credits,story_arc_credits,publisher`;
  try {
    const res = await fetchWithTimeout(url, 15000);
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: CVIssueDetail };
    return data.results ?? null;
  } catch {
    return null;
  }
}

// ─── Phase 1: resolve search queries to CV issue IDs ─────────────────────────

interface Resolved {
  entry: KeyIssueEntry;
  issue: CVSearchResult;
}

async function phaseSearch(db: ComicsDbFile): Promise<Resolved[]> {
  log("Phase 1: Searching ComicVine for key issues...");

  const resolved: Resolved[] = [];
  const total = KEY_ISSUE_SEARCHES.length;

  for (let i = 0; i < total; i++) {
    const entry = KEY_ISSUE_SEARCHES[i]!;

    // Skip if already in DB
    const alreadyIn = Object.values(db.issues).some(
      (r) =>
        r.volumeName.toLowerCase().includes((entry.volumeHint ?? entry.query.split(" ")[0] ?? "").toLowerCase()) &&
        r.issueNumber === entry.issueNumber,
    );
    if (alreadyIn) {
      log(`  [${i + 1}/${total}] SKIP (already in DB): ${entry.query}`);
      continue;
    }

    const results = await cvSearch(entry.query);

    // Pick best match: prefer result whose issue_number exactly matches
    // and whose volume name contains the hint.
    let match = results.find(
      (r) =>
        r.issue_number === entry.issueNumber &&
        (!entry.volumeHint ||
          r.volume.name.toLowerCase().includes(entry.volumeHint.toLowerCase())),
    );
    // Fallback: just issue_number match
    if (!match) {
      match = results.find((r) => r.issue_number === entry.issueNumber);
    }
    // Fallback: first result
    if (!match) {
      match = results[0];
    }

    if (match) {
      resolved.push({ entry, issue: match });
      log(`  [${i + 1}/${total}] ✓ ${match.volume.name} #${match.issue_number} (id: ${match.id})`);
    } else {
      log(`  [${i + 1}/${total}] ✗ Not found: "${entry.query}"`);
    }

    // ComicVine: 200 req/hour per resource + velocity detection.
    // 75 searches << 200 limit; 2s gap = ~30 req/min — safely below velocity threshold.
    await sleep(2000);
  }

  log(`Phase 1 done: resolved ${resolved.length}/${total} issues`);
  return resolved;
}

// ─── Phase 2: enrich with full issue details ──────────────────────────────────

async function phaseEnrich(db: ComicsDbFile, resolved: Resolved[]) {
  log(`Phase 2: Fetching full details for ${resolved.length} issues...`);
  const now = new Date().toISOString();
  let enriched = 0;

  for (let i = 0; i < resolved.length; i++) {
    const { entry, issue } = resolved[i]!;

    const detail = await cvIssueDetail(issue.id);
    const src: CVIssueDetail | CVSearchResult = detail ?? issue;

    const record: ComicRecord = {
      cvId:          String(issue.id),
      volumeName:    issue.volume.name,
      volumeCvId:    String(issue.volume.id),
      issueNumber:   issue.issue_number,
      name:          src.name ?? null,
      publisher:     detail?.publisher?.name ?? null,
      coverDate:     src.cover_date ?? null,
      coverImageUrl: src.image?.medium_url ?? src.image?.small_url ?? null,
      description:   detail ? stripHtml(detail.description) : null,
      characters:    detail?.character_credits?.map((c) => c.name).slice(0, 20) ?? [],
      storyArcs:     detail?.story_arc_credits?.map((a) => a.name) ?? [],
      isKeyIssue:    true,
      keyIssueReason: entry.keyReason,
      cvUrl:         src.site_detail_url ?? null,
      sources:       ["comicvine"],
      lastSyncedAt:  now,
    };

    upsert(db, [record]);
    enriched++;

    log(`  [${i + 1}/${resolved.length}] ✓ ${record.volumeName} #${record.issueNumber} — ${record.keyIssueReason}`);

    // Save progress every 20 records
    if (enriched % 20 === 0) {
      db.syncedAt = now;
      saveDb(db);
      log(`  💾 Progress saved (${db.totalIssues} total)`);
    }

    // ComicVine detail endpoint: 75 requests << 200/hour limit.
    // 2s gap = ~30 req/min, safe against velocity detection.
    await sleep(2000);
  }

  log(`Phase 2 done: enriched ${enriched} issues`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const start = Date.now();
  log("═══ Comics DB Sync ══════════════════════════════════════");
  log(`ComicVine API key: ${CV_KEY ? "✓" : "✗ missing (COMICVINE_API_KEY)"}`);

  if (!CV_KEY) {
    log("ERROR: COMICVINE_API_KEY is required.");
    log("Get a free key at: https://comicvine.gamespot.com/api/");
    process.exit(1);
  }

  const db = loadDb();
  log(`Existing DB: ${db.totalIssues} issues`);
  log(`Key-issue targets: ${KEY_ISSUE_SEARCHES.length}`);

  const resolved = await phaseSearch(db);
  await phaseEnrich(db, resolved);

  db.syncedAt    = new Date().toISOString();
  db.totalIssues = Object.keys(db.issues).length;
  saveDb(db);

  const stats = {
    total:       db.totalIssues,
    keyIssues:   Object.values(db.issues).filter((r) => r.isKeyIssue).length,
    withImages:  Object.values(db.issues).filter((r) => r.coverImageUrl).length,
    withDesc:    Object.values(db.issues).filter((r) => r.description).length,
  };

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  log("═══ Done ════════════════════════════════════════════════");
  log(`Total issues:   ${stats.total}`);
  log(`Key issues:     ${stats.keyIssues}`);
  log(`With images:    ${stats.withImages} (${Math.round(stats.withImages / Math.max(1, stats.total) * 100)}%)`);
  log(`With desc:      ${stats.withDesc} (${Math.round(stats.withDesc / Math.max(1, stats.total) * 100)}%)`);
  log(`Time:           ${elapsed}s`);
  log(`Rate note:      ComicVine allows ~200 req/hour free tier`);
}

main().catch((e) => { console.error(e); process.exit(1); });
