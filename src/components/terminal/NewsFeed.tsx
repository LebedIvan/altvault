"use client";

import { useState, useEffect, useCallback } from "react";
import { clsx } from "clsx";

interface NewsItem {
  id: string;
  title: string;
  summary: string | null;
  source: string;
  sourceUrl: string;
  tag: "pokemon" | "mtg" | "cs2" | "lego" | string;
  category: "breaking" | "price_move" | "meta_shift" | "analysis" | "general";
  sentiment: "positive" | "negative" | "neutral";
  score: number;
  comments: number;
  publishedAt: string;
  author: string;
  thumbnail: string | null;
}

const CATEGORY_STYLES: Record<string, { label: string; cls: string }> = {
  breaking:    { label: "BREAKING",  cls: "bg-red-500/20 text-red-400 border-red-800/40" },
  price_move:  { label: "PRICE",     cls: "bg-orange-500/20 text-orange-400 border-orange-800/40" },
  meta_shift:  { label: "META",      cls: "bg-purple-500/20 text-purple-400 border-purple-800/40" },
  analysis:    { label: "ANALYSIS",  cls: "bg-blue-500/20 text-blue-400 border-blue-800/40" },
  general:     { label: "GENERAL",   cls: "bg-[#1C2640]/50 text-[#4E6080] border-[#1C2640]/40" },
};

const TAG_COLORS: Record<string, string> = {
  pokemon: "text-yellow-400",
  mtg:     "text-purple-400",
  cs2:     "text-red-400",
  lego:    "text-amber-400",
};

const TAG_LABELS: Record<string, string> = {
  pokemon: "Pokémon",
  mtg:     "MTG",
  cs2:     "CS2",
  lego:    "LEGO",
};

const ALL_TAGS = ["all", "pokemon", "mtg", "cs2", "lego"];

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function NewsFeed() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/news");
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as { items: NewsItem[] };
      setItems(data.items ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = items.filter((item) => {
    if (filter !== "all" && item.tag !== filter) return false;
    if (catFilter !== "all" && item.category !== catFilter) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[#4E6080]">
          News Feed
        </h2>
        <button
          onClick={load}
          className="text-xs text-[#2A3A50] hover:text-[#4E6080] transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Tag filters */}
      <div className="flex gap-1.5 mb-2 flex-wrap">
        {ALL_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setFilter(tag)}
            className={clsx(
              "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
              filter === tag
                ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/25"
                : "text-[#2A3A50] hover:text-[#4E6080]",
            )}
          >
            {tag === "all" ? "All" : TAG_LABELS[tag] ?? tag}
          </button>
        ))}
      </div>

      {/* Category filters */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {["all", "breaking", "price_move", "meta_shift", "analysis"].map((cat) => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            className={clsx(
              "rounded px-2 py-0.5 text-xs font-medium border transition-colors",
              catFilter === cat
                ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                : "border-transparent text-[#2A3A50] hover:text-[#4E6080]",
            )}
          >
            {cat === "all" ? "All categories" : (CATEGORY_STYLES[cat]?.label ?? cat)}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-700">
        {loading && (
          <div className="flex items-center gap-2 py-8 justify-center text-[#2A3A50] text-sm">
            <span className="animate-spin">↻</span> Loading news...
          </div>
        )}

        {error && !loading && (
          <div className="rounded-lg border border-[#1C2640] bg-[#0E1830] p-4 text-center">
            <p className="text-sm text-[#4E6080]">Could not load news feed.</p>
            <p className="text-xs text-[#2A3A50] mt-1">Reddit may be temporarily unavailable.</p>
            <button onClick={load} className="mt-2 text-xs text-[#F59E0B] hover:text-[#FCD34D]">
              Try again
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="py-8 text-center text-sm text-[#2A3A50]">
            No articles match your filters.
          </div>
        )}

        {filtered.map((item) => {
          const cat = CATEGORY_STYLES[item.category] ?? CATEGORY_STYLES.general!;
          const sentimentDot =
            item.sentiment === "positive" ? "bg-emerald-400" :
            item.sentiment === "negative" ? "bg-red-400" : "bg-slate-500";

          return (
            <a
              key={item.id}
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-[#1C2640] bg-[#080F1C] p-3 hover:border-[#3E5070] hover:bg-[#0E1830] transition-colors group"
            >
              <div className="flex items-start gap-2">
                {/* Sentiment dot */}
                <div className={clsx("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", sentimentDot)} />

                <div className="min-w-0 flex-1">
                  {/* Category + tag + time */}
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className={clsx("inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold", cat.cls)}>
                      {cat.label}
                    </span>
                    <span className={clsx("text-[10px] font-semibold", TAG_COLORS[item.tag] ?? "text-[#4E6080]")}>
                      {TAG_LABELS[item.tag] ?? item.tag}
                    </span>
                    <span className="ml-auto text-[10px] text-[#2A3A50] shrink-0">
                      {timeAgo(item.publishedAt)}
                    </span>
                  </div>

                  {/* Title */}
                  <p className="text-sm text-[#B0C4DE] leading-snug group-hover:text-[#E8F0FF] transition-colors line-clamp-2">
                    {item.title}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#2A3A50]">
                    <span>{item.source}</span>
                    <span>↑ {item.score.toLocaleString()}</span>
                    <span>💬 {item.comments}</span>
                  </div>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
