"use client";

import { useEffect, useState, useMemo } from "react";
import { clsx } from "clsx";
import type { ScreenerItem } from "@/app/api/screener/route";

const CAT_LABELS: Record<string, string> = {
  all: "All", pokemon: "Pokémon", mtg: "MTG", cs2: "CS2",
};

const CAT_COLORS: Record<string, string> = {
  pokemon: "text-yellow-400",
  mtg:     "text-purple-400",
  cs2:     "text-[#F59E0B]",
};

const PRESETS = [
  {
    id: "expensive",
    label: "Most Expensive",
    icon: "👑",
    desc: "Top items by price",
    filter: (i: ScreenerItem) => (i.priceEur ?? i.priceUsd ?? 0) > 100,
  },
  {
    id: "liquid",
    label: "Most Liquid",
    icon: "💧",
    desc: "Highest volume / most listings",
    filter: (i: ScreenerItem) => (i.volume ?? 0) > 100,
  },
  {
    id: "rising",
    label: "Rising 7d",
    icon: "📈",
    desc: "Up in last 7 days (Pokémon / Cardmarket)",
    filter: (i: ScreenerItem) => i.change7d !== null && i.change7d > 0.05,
  },
  {
    id: "dip",
    label: "Dip",
    icon: "💎",
    desc: "Down 7d but up 30d",
    filter: (i: ScreenerItem) =>
      i.change7d !== null && i.change30d !== null &&
      i.change7d < -0.02 && i.change30d > 0.05,
  },
  {
    id: "budget",
    label: "Under €50",
    icon: "🎯",
    desc: "Accessible price range",
    filter: (i: ScreenerItem) => {
      const p = i.priceEur ?? (i.priceUsd ? i.priceUsd * 0.92 : null);
      return p !== null && p < 50 && p > 1;
    },
  },
];

function fmtPrice(item: ScreenerItem): string {
  if (item.priceEur != null) return `€${item.priceEur.toFixed(2)}`;
  if (item.priceUsd != null) return `$${item.priceUsd.toFixed(2)}`;
  return "—";
}

function fmtChange(v: number | null): string {
  if (v === null) return "—";
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
}

export function Screener() {
  const [items, setItems]   = useState<ScreenerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [preset, setPreset] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"price" | "volume" | "change7d" | "change30d">("price");

  useEffect(() => {
    setLoading(true);
    fetch("/api/screener")
      .then((r) => r.json())
      .then((d) => { setItems(d.items ?? []); setLoading(false); })
      .catch(() => { setError("Failed to load"); setLoading(false); });
  }, []);

  const results = useMemo(() => {
    let list = items;

    if (preset) {
      const p = PRESETS.find((p) => p.id === preset);
      if (p) list = list.filter(p.filter);
    }
    if (category !== "all") list = list.filter((i) => i.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) => i.name.toLowerCase().includes(q) || i.set.toLowerCase().includes(q),
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === "volume")   return (b.volume ?? 0) - (a.volume ?? 0);
      if (sortBy === "change7d") return (b.change7d ?? -99) - (a.change7d ?? -99);
      if (sortBy === "change30d") return (b.change30d ?? -99) - (a.change30d ?? -99);
      const pa = a.priceEur ?? (a.priceUsd ?? 0);
      const pb = b.priceEur ?? (b.priceUsd ?? 0);
      return pb - pa;
    });
  }, [items, preset, category, search, sortBy]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[#4E6080]">
          Market Screener
        </h2>
        <div className="flex items-center gap-3">
          {!loading && (
            <span className="text-xs text-[#2A3A50]">{results.length} / {items.length} items</span>
          )}
          <span className="text-[10px] text-[#2A3A50]">
            Scryfall · Steam · Cardmarket
          </span>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-[#2A3A50] text-sm gap-2">
          <span className="animate-spin">↻</span> Loading market data…
        </div>
      )}

      {error && (
        <div className="py-8 text-center text-xs text-[#F87171]">{error}</div>
      )}

      {!loading && !error && (
        <>
          {/* Presets */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPreset(preset === p.id ? null : p.id)}
                title={p.desc}
                className={clsx(
                  "rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors",
                  preset === p.id
                    ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                    : "border-[#1C2640] bg-[#080F1C] text-[#4E6080] hover:border-[#3E5070] hover:text-[#B0C4DE]",
                )}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded border border-[#1C2640] bg-[#080F1C] px-2 py-1.5 text-xs text-[#B0C4DE] focus:outline-none focus:border-[#F59E0B]/50"
            >
              {Object.entries(CAT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded border border-[#1C2640] bg-[#080F1C] px-2 py-1.5 text-xs text-[#B0C4DE] focus:outline-none focus:border-[#F59E0B]/50"
            >
              <option value="price">Sort: Price ↓</option>
              <option value="volume">Sort: Volume ↓</option>
              <option value="change7d">Sort: 7d Change ↓</option>
              <option value="change30d">Sort: 30d Change ↓</option>
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name / set…"
              className="col-span-2 rounded border border-[#1C2640] bg-[#080F1C] px-2 py-1.5 text-xs text-[#B0C4DE] placeholder:text-[#2A3A50] focus:outline-none focus:border-[#F59E0B]/50"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-[#1C2640]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1C2640] bg-[#080F1C] text-[#4E6080] font-medium">
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-right">Price</th>
                  <th className="px-3 py-2 text-right hidden sm:table-cell">7d</th>
                  <th className="px-3 py-2 text-right hidden sm:table-cell">30d</th>
                  <th className="px-3 py-2 text-right hidden md:table-cell">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#162035]">
                {results.slice(0, 50).map((item) => (
                  <tr key={item.id} className="hover:bg-[#162035] transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt="" className="h-8 w-8 object-contain rounded shrink-0 bg-[#0E1830]" />
                        ) : (
                          <div className="h-8 w-8 rounded bg-[#0E1830] shrink-0" />
                        )}
                        <div className="min-w-0">
                          <a
                            href={item.sourceUrl ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#B0C4DE] hover:text-[#F59E0B] transition-colors truncate block max-w-[180px]"
                          >
                            {item.name}
                          </a>
                          <p className="text-[10px] text-[#2A3A50] truncate max-w-[180px]">
                            <span className={clsx("font-medium mr-1", CAT_COLORS[item.category])}>
                              {item.category.toUpperCase()}
                            </span>
                            {item.set}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#E8F0FF] font-medium whitespace-nowrap">
                      {fmtPrice(item)}
                    </td>
                    <td className={clsx(
                      "px-3 py-2 text-right tabular-nums font-bold hidden sm:table-cell",
                      item.change7d === null ? "text-[#2A3A50]"
                        : item.change7d > 0 ? "text-emerald-400" : "text-[#F87171]",
                    )}>
                      {fmtChange(item.change7d)}
                    </td>
                    <td className={clsx(
                      "px-3 py-2 text-right tabular-nums hidden sm:table-cell",
                      item.change30d === null ? "text-[#2A3A50]"
                        : item.change30d > 0 ? "text-emerald-400" : "text-[#F87171]",
                    )}>
                      {fmtChange(item.change30d)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#4E6080] hidden md:table-cell">
                      {item.volume != null ? item.volume.toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {results.length === 0 && (
              <div className="py-8 text-center text-xs text-[#2A3A50]">
                No items match your filters.
              </div>
            )}
          </div>

          <p className="text-[10px] text-[#2A3A50] px-1 mt-2">
            MTG prices: <a href="https://scryfall.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#4E6080]">Scryfall</a> (Cardmarket EUR) ·
            {" "}CS2: <a href="https://steamcommunity.com/market" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#4E6080]">Steam Market</a> ·
            {" "}Pokémon: <a href="https://www.cardmarket.com/en/Pokemon" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#4E6080]">Cardmarket</a> via pokemontcg.io ·
            {" "}7d/30d change only for Pokémon · cached 1h
          </p>
        </>
      )}
    </div>
  );
}
