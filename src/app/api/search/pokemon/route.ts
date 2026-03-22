export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z.object({ q: z.string().min(1).max(100) });

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TCGdexCardBrief {
  id: string;
  localId: string;
  name: string;
  image?: string;
  _lang?: "en" | "ja";
}

interface TCGdexCardFull extends TCGdexCardBrief {
  rarity?: string;
  set?: { name?: string; serie?: { name?: string }; releaseDate?: string };
  pricing?: {
    cardmarket?: {
      avg?: number | null; low?: number | null; trend?: number | null;
      avg1?: number | null; avg7?: number | null; avg30?: number | null;
    };
    tcgplayer?: {
      normal?: { marketPrice?: number | null };
      holofoil?: { marketPrice?: number | null };
      reverseHolofoil?: { marketPrice?: number | null };
    };
  };
}

interface TCGdexSetFull { id: string; name: string; cards?: TCGdexCardBrief[]; }

// ─── Pokemon EN → Japanese name map ──────────────────────────────────────────

const POKEMON_JP: Record<string, string> = {
  pikachu: "ピカチュウ", zekrom: "ゼクロム", reshiram: "レシラム",
  charizard: "リザードン", mewtwo: "ミュウツー", mew: "ミュウ",
  lugia: "ルギア", rayquaza: "レックウザ", dialga: "ディアルガ",
  palkia: "パルキア", giratina: "ギラティナ", arceus: "アルセウス",
  victini: "ビクティニ", kyurem: "キュレム", xerneas: "ゼルネアス",
  yveltal: "イベルタル", solgaleo: "ソルガレオ", lunala: "ルナアーラ",
  necrozma: "ネクロズマ", zacian: "ザシアン", zamazenta: "ザマゼンタ",
  eternatus: "ムゲンダイナ", gengar: "ゲンガー", eevee: "イーブイ",
  sylveon: "ニンフィア", umbreon: "ブラッキー", espeon: "エーフィ",
  jolteon: "サンダース", vaporeon: "シャワーズ", flareon: "ブースター",
  glaceon: "グレイシア", leafeon: "リーフィア", dragonite: "カイリュー",
  tyranitar: "バンギラス", garchomp: "ガブリアス", lucario: "ルカリオ",
  zoroark: "ゾロアーク", greninja: "ゲッコウガ", incineroar: "ガオガエン",
  decidueye: "ジュナイパー", primarina: "アシレーヌ", mimikyu: "ミミッキュ",
  tapu: "カプ", koko: "コケコ", lele: "レレ", bulu: "ブル", fini: "フィニ",
  cosmog: "コスモッグ", cosmoem: "コスモウム", buzzwole: "バズワーム",
  kartana: "カミツルギ", guzzlord: "アクジキング",
  blastoise: "カメックス", venusaur: "フシギバナ", bulbasaur: "フシギダネ",
  squirtle: "ゼニガメ", charmander: "ヒトカゲ", charmeleon: "リザード",
  raichu: "ライチュウ", clefairy: "ピッピ", jigglypuff: "プリン",
  snorlax: "カビゴン", dragonair: "ハクリュー", dratini: "ミニリュウ",
  articuno: "フリーザー", zapdos: "サンダー", moltres: "ファイヤー",
  entei: "エンテイ", raikou: "ライコウ", suicune: "スイクン",
  ho: "ホウオウ", celebi: "セレビィ", jirachi: "ジラーチ",
  deoxys: "デオキシス", latias: "ラティアス", latios: "ラティオス",
  regice: "レジアイス", regirock: "レジロック", registeel: "レジスチル",
  groudon: "グラードン", kyogre: "カイオーガ", regigigas: "レジギガス",
  shaymin: "シェイミ", darkrai: "ダークライ", heatran: "ヒードラン",
  cresselia: "クレセリア", phione: "フィオネ", manaphy: "マナフィ",
  cobalion: "コバルオン", terrakion: "テラキオン", virizion: "ビリジオン",
  thundurus: "ボルトロス", tornadus: "トルネロス", landorus: "ランドロス",
  keldeo: "ケルディオ", meloetta: "メロエッタ", genesect: "ゲノセクト",
  diancie: "ディアンシー", hoopa: "フーパ",
  volcanion: "ボルケニオン", marshadow: "マーシャドー", zeraora: "ゼラオラ",
  meltan: "メルタン", melmetal: "メルメタル",
  zygarde: "ジガルデ", noivern: "オンバーン",
  goodra: "ヌメルゴン", aegislash: "ギルガルド", talonflame: "ファイアロー",
};

// Reverse map: katakana → English (built from POKEMON_JP)
const JP_TO_EN: Record<string, string> = Object.fromEntries(
  Object.entries(POKEMON_JP).map(([en, jp]) => [jp, en]),
);
// Capitalise first letter for display
function toDisplayName(en: string): string {
  return en.charAt(0).toUpperCase() + en.slice(1);
}

/**
 * Translate a Japanese card name to English where possible.
 * "ピカチュウ&ゼクロム-GX" → "Pikachu & Zekrom-GX"
 * Unknown katakana is left as-is.
 */
function translateJaName(jaName: string): string {
  // Sort by length descending so longer sequences match first
  const entries = Object.entries(JP_TO_EN).sort((a, b) => b[0].length - a[0].length);
  let result = jaName;
  for (const [jp, en] of entries) {
    result = result.split(jp).join(toDisplayName(en));
  }
  // Normalise separators: ＆ → &, full-width space → space
  result = result.replace(/＆/g, "&").replace(/　/g, " ");
  // If still contains Japanese characters, append the original in parentheses
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(result)) {
    result = `${result} (${jaName})`;
  }
  return result;
}

// ─── Known JP-exclusive sets (hardcoded since TCGdex stores JA names in Japanese) ──

const JA_EXCLUSIVE_SETS: Array<{ keywords: string[]; id: string }> = [
  { keywords: ["tag", "all", "stars"],   id: "sm12a" },
  { keywords: ["alter", "genesis"],      id: "sm12"  },
  { keywords: ["sky", "legend"],         id: "sm11a" },
  { keywords: ["remix", "bout"],         id: "sm11"  },
  { keywords: ["night", "unison"],       id: "sm10b" },
  { keywords: ["double", "blaze"],       id: "sm10"  },
  { keywords: ["miracle", "twin"],       id: "sm9b"  },
  { keywords: ["full", "metal", "wall"], id: "sm9a"  },
  { keywords: ["dark", "order"],         id: "sm8b"  },
  { keywords: ["super", "burst"],        id: "sm8"   },
  { keywords: ["fairy", "rise"],         id: "sm7b"  },
  { keywords: ["dragon", "storm"],       id: "sm7a"  },
  { keywords: ["thunderclap", "spark"],  id: "sm6b"  },
  { keywords: ["awakened", "heroes"],    id: "sm6a"  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function abortFetch(url: string, ms = 8000): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return fetch(url, {
    headers: { "User-Agent": "Vaulty/1.0" },
    signal: controller.signal,
  }).finally(() => clearTimeout(t));
}

const NOISE_WORDS = new Set([
  "pokemon", "card", "cards", "the", "and", "from", "with",
  "team", "tagteam", "holo", "foil", "cgc", "psa", "bgs", "gem", "mint",
]);

const TYPE_SUFFIXES = new Set([
  "gx", "ex", "vmax", "vstar", "mega", "break", "prime", "tag",
]);

// Words that are set names, NOT pokemon names — skip for EN card search
const SET_NAME_WORDS = new Set([
  "all", "star", "stars", "sun", "moon", "sky", "ultra", "rise", "lost",
  "fusion", "origin", "silver", "clash", "alter", "remix", "bout", "battle",
  "zenith", "brilliant", "astral", "radiant", "crown", "scarlet", "violet",
  "obsidian", "flames", "twilight", "paldea", "evolving", "tempest", "base",
  "jungle", "fossil", "rocket", "aqua", "magma", "bolt", "storm", "surge",
  "unison", "blaze", "miracle", "twin", "metal", "wall", "order", "burst",
  "fairy", "dragon", "spark", "genesis", "legend", "night", "double",
  "full", "dark", "super", "awakened", "heroes",
]);

function extractTerms(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/#\d+/g, "")
    .split(/[\s&+\-,/]+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ""))
    .filter((w) => w.length >= 2 && !NOISE_WORDS.has(w));
}

async function searchTCGdex(
  term: string,
  limit = 20,
  lang: "en" | "ja" = "en",
): Promise<TCGdexCardBrief[]> {
  const url =
    `https://api.tcgdex.net/v2/${lang}/cards` +
    `?name=${encodeURIComponent(term)}` +
    `&pagination:itemsPerPage=${limit}` +
    `&sort:field=name&sort:order=ASC`;
  const res = await abortFetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as TCGdexCardBrief[] | null;
  if (!Array.isArray(data)) return [];
  return data.map((c) => ({ ...c, _lang: lang }));
}

async function getJaSetCards(setId: string): Promise<TCGdexCardBrief[]> {
  const url = `https://api.tcgdex.net/v2/ja/sets/${encodeURIComponent(setId)}`;
  const res = await abortFetch(url, 8000);
  if (!res.ok) return [];
  const data = (await res.json()) as TCGdexSetFull;
  if (!Array.isArray(data.cards)) return [];
  return data.cards.map((c) => ({ ...c, _lang: "ja" as const }));
}

function dedupeById(cards: TCGdexCardBrief[]): TCGdexCardBrief[] {
  const seen = new Set<string>();
  return cards.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

/** Find matching JA-exclusive set IDs from query words */
function matchJaSets(words: string[]): string[] {
  const wordSet = new Set(words);
  const matched: string[] = [];
  for (const entry of JA_EXCLUSIVE_SETS) {
    const hits = entry.keywords.filter((kw) => wordSet.has(kw));
    if (hits.length >= Math.min(2, entry.keywords.length)) {
      if (!matched.includes(entry.id)) matched.push(entry.id);
    }
  }
  return matched;
}

// ─── Route ─────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({ q: searchParams.get("q") });
  if (!parsed.success)
    return NextResponse.json({ error: "Missing q" }, { status: 400 });

  const q = parsed.data.q.trim();

  // DB-first: query local pokemon_cards table if populated
  try {
    const { searchCards, isEmpty } = await import("@/lib/pokemonDb");
    if (!(await isEmpty())) {
      const records = await searchCards(q, undefined, 20);
      if (records.length > 0) {
        const suggestions = records.map((card) => {
          const isJa       = card.lang === "ja";
          const setName    = card.setName ?? "";
          const fullName   = setName
            ? `${isJa ? "[JA] " : ""}${card.name} — ${setName} #${card.localId}`
            : `${isJa ? "[JA] " : ""}${card.name}`;
          return {
            id:          card.id,
            name:        card.name,
            fullName,
            set:         setName,
            rarity:      card.rarity      ?? null,
            foilTypes:   null,
            releaseDate: card.releaseDate  ?? null,
            imageSmall:  card.imageSmallUrl ?? null,
            imageLarge:  card.imageLargeUrl ?? null,
            priceCents:  card.priceEurCents ?? card.priceUsdCents ?? null,
            currency:    card.priceEurCents ? "EUR" : "USD",
          };
        });
        return NextResponse.json({ suggestions, total: suggestions.length, source: "local_db" });
      }
    }
  } catch { /* fall through to TCGdex API */ }

  try {
    const allTerms = extractTerms(q);

    // Split terms: actual pokemon names vs set/suffix words
    const pokemonTerms = allTerms.filter(
      (t) => !TYPE_SUFFIXES.has(t) && !SET_NAME_WORDS.has(t) && t.length >= 3,
    );
    const suffixTerms = allTerms.filter((t) => TYPE_SUFFIXES.has(t));
    const setWords    = allTerms; // all words available for set matching

    // JP names for detected pokemon
    const jpNames = pokemonTerms
      .map((t) => POKEMON_JP[t])
      .filter((n): n is string => Boolean(n));

    // JA-exclusive set IDs matching keywords in the query
    const jaExclusiveSetIds = matchJaSets(setWords);

    // ── Run EN card search, JA name search, and JA set search in parallel ──────

    const [enCards, jaNameCards, jaSetCards] = await Promise.all([

      // 1. EN card search
      (async (): Promise<TCGdexCardBrief[]> => {
        const pnt = pokemonTerms;
        if (pnt.length === 0) return [];
        let cards: TCGdexCardBrief[] = [];

        // Try "pikachu & zekrom" combo
        if (pnt.length >= 2) {
          cards = await searchTCGdex(`${pnt[0]} & ${pnt[1]}`, 20);
        }
        // Filter primary search by secondary name
        if (cards.length === 0 && pnt.length >= 2) {
          const raw = await searchTCGdex(pnt[0]!, 50);
          const filtered = raw.filter((c) => c.name.toLowerCase().includes(pnt[1]!));
          cards = filtered.length > 0 ? filtered : raw.slice(0, 20);
        }
        // Single name + optional suffix
        if (cards.length === 0 && pnt.length > 0) {
          const query = suffixTerms.length > 0
            ? `${pnt[0]} ${suffixTerms[0]}`
            : pnt[0]!;
          cards = await searchTCGdex(query, 20);
        }
        return cards;
      })(),

      // 2. JA card search by Japanese name (katakana)
      (async (): Promise<TCGdexCardBrief[]> => {
        if (jpNames.length === 0) return [];
        let cards: TCGdexCardBrief[] = [];

        // Try "ピカチュウ&ゼクロム" combo
        if (jpNames.length >= 2) {
          cards = await searchTCGdex(`${jpNames[0]}&${jpNames[1]}`, 20, "ja");
        }
        // Filter primary by secondary
        if (cards.length === 0 && jpNames.length >= 2) {
          const raw = await searchTCGdex(jpNames[0]!, 50, "ja");
          const filtered = raw.filter((c) => c.name.includes(jpNames[1]!));
          cards = filtered.length > 0 ? filtered : raw.slice(0, 20);
        }
        // Single JP name
        if (cards.length === 0 && jpNames.length > 0) {
          cards = await searchTCGdex(jpNames[0]!, 20, "ja");
        }
        return cards;
      })(),

      // 3. JA exclusive set search (e.g. "tag all stars" → sm12a)
      (async (): Promise<TCGdexCardBrief[]> => {
        if (jaExclusiveSetIds.length === 0) return [];
        const lists = await Promise.all(
          jaExclusiveSetIds.map((id) => getJaSetCards(id)),
        );
        const allCards = lists.flat();
        // If we have pokemon names, filter JA set cards by JP name
        if (jpNames.length > 0) {
          const filtered = allCards.filter((c) =>
            jpNames.some((jp) => c.name.includes(jp)),
          );
          return filtered.length > 0 ? filtered : allCards.slice(0, 20);
        }
        return allCards.slice(0, 20);
      })(),
    ]);

    const cards = dedupeById([...enCards, ...jaNameCards, ...jaSetCards]);

    if (cards.length === 0) {
      return NextResponse.json({ suggestions: [], total: 0 });
    }

    // Fetch full details for up to 20 cards in parallel
    const slice = cards.slice(0, 20);
    const fullCards = await Promise.all(
      slice.map(async (brief): Promise<TCGdexCardFull & { _lang?: "en" | "ja" }> => {
        const lang = brief._lang ?? "en";
        try {
          const r = await abortFetch(
            `https://api.tcgdex.net/v2/${lang}/cards/${encodeURIComponent(brief.id)}`,
            6000,
          );
          if (!r.ok) return brief;
          const full = (await r.json()) as TCGdexCardFull;
          return { ...full, _lang: lang };
        } catch {
          return brief;
        }
      }),
    );

    const suggestions = fullCards.map((card) => {
      const imageBase  = card.image ?? null;
      const imageSmall = imageBase ? `${imageBase}/low.webp`  : null;
      const imageLarge = imageBase ? `${imageBase}/high.webp` : null;

      const cm = card.pricing?.cardmarket;
      const cmPrice = cm?.trend ?? cm?.avg ?? cm?.avg30 ?? cm?.low ?? null;
      let priceCents: number | null = null;
      let currency = "EUR";

      if (cmPrice && cmPrice > 0) {
        priceCents = Math.round(cmPrice * 100);
      } else {
        const tcp = card.pricing?.tcgplayer;
        const usd =
          tcp?.holofoil?.marketPrice ??
          tcp?.normal?.marketPrice ??
          tcp?.reverseHolofoil?.marketPrice ??
          null;
        if (usd && usd > 0) {
          priceCents = Math.round(usd * 100);
          currency = "USD";
        }
      }

      const isJa    = (card as { _lang?: string })._lang === "ja";
      const setName = card.set?.name ?? "";
      const displayName = isJa ? translateJaName(card.name) : card.name;
      const fullName = setName
        ? `${isJa ? "[JA] " : ""}${displayName} — ${setName} #${card.localId}`
        : `${isJa ? "[JA] " : ""}${displayName}`;

      return {
        id:          card.id,
        name:        card.name,
        fullName,
        set:         setName,
        rarity:      card.rarity ?? null,
        foilTypes:   null,
        releaseDate: card.set?.releaseDate ?? null,
        imageSmall,
        imageLarge,
        priceCents,
        currency,
      };
    });

    return NextResponse.json({ suggestions, total: cards.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    console.error("TCGdex search error:", msg);
    if (msg.includes("abort") || msg.includes("signal"))
      return NextResponse.json({ error: "TCGdex API timeout" }, { status: 504 });
    return NextResponse.json({ error: "Upstream error" }, { status: 502 });
  }
}
