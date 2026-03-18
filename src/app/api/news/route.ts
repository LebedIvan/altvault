import { NextResponse } from "next/server";

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    url: string;
    score: number;
    num_comments: number;
    created_utc: number;
    subreddit: string;
    permalink: string;
    thumbnail: string;
    author: string;
  };
}

interface RedditListing {
  data: { children: RedditPost[] };
}

const SOURCES = [
  { sub: "pkmntcg",          tag: "pokemon",    label: "r/pkmntcg"          },
  { sub: "PokemonTCG",       tag: "pokemon",    label: "r/PokemonTCG"       },
  { sub: "PokeInvesting",    tag: "pokemon",    label: "r/PokeInvesting"    },
  { sub: "mtgfinance",       tag: "mtg",        label: "r/mtgfinance"       },
  { sub: "magicTCG",         tag: "mtg",        label: "r/magicTCG"         },
  { sub: "GlobalOffensive",  tag: "cs2",        label: "r/GlobalOffensive"  },
  { sub: "csgomarketforum",  tag: "cs2",        label: "r/csgomarketforum"  },
  { sub: "lego",             tag: "lego",       label: "r/lego"             },
  { sub: "legomarket",       tag: "lego",       label: "r/legomarket"       },
];

function classifyPost(title: string, _tag: string): {
  category: "breaking" | "price_move" | "meta_shift" | "analysis" | "general";
  sentiment: "positive" | "negative" | "neutral";
} {
  const t = title.toLowerCase();
  let category: "breaking" | "price_move" | "meta_shift" | "analysis" | "general" = "general";
  let sentiment: "positive" | "negative" | "neutral" = "neutral";

  if (/ban|banned|reprint|announce|new set|major|record|spike/.test(t)) category = "breaking";
  else if (/\+\d|up \d|down \d|crash|drop|surge|pump|moon|%/.test(t)) category = "price_move";
  else if (/meta|tier|deck|tournament|ban list|wins|champion/.test(t)) category = "meta_shift";
  else if (/analysis|invest|predict|review|market|worth|should i|buy|sell/.test(t)) category = "analysis";

  if (/up|gain|increase|rise|bull|moon|spike|win|buy|undervalued|cheap|deal/.test(t)) sentiment = "positive";
  else if (/down|crash|drop|ban|reprint|flood|bear|sell|overpriced|loss/.test(t)) sentiment = "negative";

  return { category, sentiment };
}

export async function GET() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const results = await Promise.allSettled(
      SOURCES.map(async (source) => {
        const res = await fetch(
          `https://www.reddit.com/r/${source.sub}/hot.json?limit=8&t=day`,
          {
            headers: { "User-Agent": "Vaulty/1.0 (alternative investment tracker)" },
            signal: controller.signal,
          },
        );
        if (!res.ok) return [];
        const json = (await res.json()) as RedditListing;
        return (json.data?.children ?? []).map((post) => {
          const { category, sentiment } = classifyPost(post.data.title, source.tag);
          return {
            id:          `reddit-${post.data.id}`,
            title:       post.data.title,
            summary:     post.data.selftext?.slice(0, 200) || null,
            source:      source.label,
            sourceUrl:   `https://reddit.com${post.data.permalink}`,
            tag:         source.tag,
            category,
            sentiment,
            score:       post.data.score,
            comments:    post.data.num_comments,
            publishedAt: new Date(post.data.created_utc * 1000).toISOString(),
            author:      post.data.author,
            thumbnail:
              post.data.thumbnail?.startsWith("http") ? post.data.thumbnail : null,
          };
        });
      }),
    );

    const items = results
      .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 80);

    return NextResponse.json({ items, total: items.length });
  } catch {
    return NextResponse.json({ items: [], total: 0 });
  } finally {
    clearTimeout(timeout);
  }
}
