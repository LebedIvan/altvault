"use client";

import { useMemo, useState, useEffect } from "react";
import { clsx } from "clsx";

interface WhaleTrade {
  id: string;
  asset: string;
  category: string;
  qty: number;
  unitCents: number;
  totalCents: number;
  side: "buy" | "sell";
  buyer: string;
  seller: string;
  minsAgo: number;
}

// ─── Market items (mirrored from Screener for consistency) ───────────────────
const WHALE_POOL = [
  { name: "Charizard Base Set 1st Ed PSA 9", cat: "Pokémon", cents: 280000 },
  { name: "Tropical Mega Battle Promo 2001",  cat: "Pokémon", cents: 1200000 },
  { name: "Rayquaza VMAX AA (Evolving Skies)", cat: "Pokémon", cents: 28000 },
  { name: "Shaymin ex PSA 10",                cat: "Pokémon", cents: 55000 },
  { name: "Black Lotus (Alpha)",              cat: "MTG",     cents: 280000 },
  { name: "Mox Sapphire (Beta)",              cat: "MTG",     cents: 140000 },
  { name: "The One Ring (LotR)",              cat: "MTG",     cents: 9500 },
  { name: "Wrenn and Six (Modern Horizons)",  cat: "MTG",     cents: 8900 },
  { name: "AWP | Dragon Lore (FN)",           cat: "CS2",     cents: 148000 },
  { name: "AK-47 | Fire Serpent (MW)",        cat: "CS2",     cents: 82000 },
  { name: "Karambit | Doppler P2 (FN)",       cat: "CS2",     cents: 91000 },
  { name: "Sport Gloves | Pandora's Box (MW)", cat: "CS2",    cents: 118000 },
  { name: "Charizard ex SAR (Obsidian Flames)", cat: "Pokémon", cents: 19000 },
  { name: "Umbreon VMAX AA (Evolving Skies)", cat: "Pokémon", cents: 22000 },
  { name: "AK-47 | Wild Lotus (FN)",          cat: "CS2",     cents: 31000 },
  { name: "Butterfly Knife | Fade (FN)",      cat: "CS2",     cents: 68000 },
];

const BUYER_NAMES = ["TraderX", "InvstBot", "SealedSpecialist", "GradedGrail", "AltHedge", "VaultCollector", "CardWhale", "MarketMaker"];
const SELLER_NAMES = ["LongHolder", "PortfolioExit", "ProfitTaker", "FlipperPro", "GradedSeller", "BulkLiquidator", "VaultRelease", "SkinTrader"];

// ─── Seeded PRNG ─────────────────────────────────────────────────────────────
function makePrng(seed: number) {
  let s = seed >>> 0;
  return () => { s = Math.imul(1664525, s) + 1013904223; return (s >>> 0) / 0xffffffff; };
}

function generateTrades(epochMinute: number, count = 40): WhaleTrade[] {
  const trades: WhaleTrade[] = [];
  for (let i = 0; i < count; i++) {
    const rng = makePrng((epochMinute - i * 3) * 9973 + i * 1337);
    const item = WHALE_POOL[Math.floor(rng() * WHALE_POOL.length)]!;
    const qty = Math.floor(rng() * 12) + 1;
    const priceVariance = 0.95 + rng() * 0.10;
    const unitCents = Math.round(item.cents * priceVariance);
    const totalCents = unitCents * qty;
    if (totalCents < 50000) continue; // only ≥€500 trades
    const side: "buy" | "sell" = rng() > 0.5 ? "buy" : "sell";
    trades.push({
      id: `${epochMinute}-${i}`,
      asset: item.name,
      category: item.cat,
      qty,
      unitCents,
      totalCents,
      side,
      buyer:    BUYER_NAMES[Math.floor(rng() * BUYER_NAMES.length)]!,
      seller:   SELLER_NAMES[Math.floor(rng() * SELLER_NAMES.length)]!,
      minsAgo: i * 3 + Math.floor(rng() * 3),
    });
    if (trades.length >= 25) break;
  }
  return trades;
}

function fmtEur(cents: number): string {
  const val = cents / 100;
  if (val >= 1000) return `€${(val / 1000).toFixed(1)}K`;
  return `€${val.toFixed(0)}`;
}

const CAT_COLORS: Record<string, string> = {
  "Pokémon": "text-yellow-400 border-yellow-800/40 bg-yellow-950/20",
  "MTG":     "text-purple-400 border-purple-800/40 bg-purple-950/20",
  "CS2":     "text-red-400 border-red-800/40 bg-red-950/20",
};

const THRESHOLD_LABELS = [
  { label: "All",    min: 0 },
  { label: "€500+",  min: 50000 },
  { label: "€1K+",   min: 100000 },
  { label: "€5K+",   min: 500000 },
  { label: "€10K+",  min: 1000000 },
];

export function WhaleTracker() {
  const [epochMinute, setEpochMinute] = useState(() => Math.floor(Date.now() / 60000));
  const [minThreshold, setMinThreshold] = useState(0);
  const [sideFilter, setSideFilter] = useState<"all" | "buy" | "sell">("all");
  const [catFilter, setCatFilter] = useState("all");

  // Refresh trades every minute
  useEffect(() => {
    const id = setInterval(() => setEpochMinute(Math.floor(Date.now() / 60000)), 60000);
    return () => clearInterval(id);
  }, []);

  const allTrades = useMemo(() => generateTrades(epochMinute), [epochMinute]);

  const filtered = useMemo(() => {
    return allTrades.filter((t) => {
      if (t.totalCents < minThreshold) return false;
      if (sideFilter !== "all" && t.side !== sideFilter) return false;
      if (catFilter !== "all" && t.category !== catFilter) return false;
      return true;
    });
  }, [allTrades, minThreshold, sideFilter, catFilter]);

  const totalVolume = filtered.reduce((s, t) => s + t.totalCents, 0);
  const buyVol  = filtered.filter(t => t.side === "buy").reduce((s, t) => s + t.totalCents, 0);
  const sellVol = filtered.filter(t => t.side === "sell").reduce((s, t) => s + t.totalCents, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xs fm font-bold uppercase tracking-widest text-[#4E6080]">
            🐋 Whale Tracker
          </h2>
          <p className="text-[10px] text-[#2A3A50] mt-0.5">Large trades detected in the last 2h · simulated</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-emerald-400 font-bold tabular-nums">
            ↑ {fmtEur(buyVol)}
          </span>
          <span className="text-[#F87171] font-bold tabular-nums">
            ↓ {fmtEur(sellVol)}
          </span>
          <span className="text-[#2A3A50] tabular-nums">
            vol {fmtEur(totalVolume)}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-1">
          {THRESHOLD_LABELS.map((t) => (
            <button
              key={t.label}
              onClick={() => setMinThreshold(t.min)}
              className={clsx(
                "rounded px-2 py-0.5 text-xs font-medium border transition-colors",
                minThreshold === t.min
                  ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                  : "border-[#1C2640] text-[#2A3A50] hover:text-[#4E6080]",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          {(["all", "buy", "sell"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSideFilter(s)}
              className={clsx(
                "rounded px-2 py-0.5 text-xs font-medium border transition-colors capitalize",
                sideFilter === s
                  ? s === "buy"  ? "border-emerald-600 bg-emerald-900/30 text-emerald-300"
                  : s === "sell" ? "border-red-600 bg-red-900/30 text-red-300"
                  : "border-[#1C2640] bg-[#162035] text-[#E8F0FF]"
                  : "border-[#1C2640] text-[#2A3A50] hover:text-[#4E6080]",
              )}
            >
              {s === "buy" ? "▲ Buy" : s === "sell" ? "▼ Sell" : "All"}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {["all", "Pokémon", "MTG", "CS2"].map((c) => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={clsx(
                "rounded px-2 py-0.5 text-xs font-medium border transition-colors",
                catFilter === c
                  ? "border-[#1C2640] bg-[#162035] text-[#E8F0FF]"
                  : "border-[#1C2640] text-[#2A3A50] hover:text-[#4E6080]",
              )}
            >
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
      </div>

      {/* Trade feed */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="py-8 text-center text-xs text-[#2A3A50]">
            No whale trades match your filters.
          </div>
        )}
        {filtered.map((trade) => {
          const catStyle = CAT_COLORS[trade.category] ?? "text-[#4E6080] border-[#1C2640]/40 bg-[#0E1830]/20";
          const isBig = trade.totalCents >= 500000; // ≥€5000
          return (
            <div
              key={trade.id}
              className={clsx(
                "rounded-lg border p-3 transition-colors",
                trade.side === "buy"
                  ? "border-emerald-900/50 bg-emerald-950/10 hover:bg-emerald-950/20"
                  : "border-red-900/50 bg-red-950/10 hover:bg-red-950/20",
              )}
            >
              <div className="flex items-start gap-3">
                {/* Side indicator */}
                <div className={clsx(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-black",
                  trade.side === "buy" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400",
                )}>
                  {trade.side === "buy" ? "B" : "S"}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={clsx("inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold", catStyle)}>
                      {trade.category}
                    </span>
                    {isBig && (
                      <span className="text-[10px] font-bold text-amber-400">🐋 WHALE</span>
                    )}
                    <span className="ml-auto text-[10px] text-[#2A3A50] shrink-0">
                      {trade.minsAgo === 0 ? "just now" : `${trade.minsAgo}m ago`}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-[#B0C4DE] leading-snug">
                    {trade.asset}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3 text-xs flex-wrap">
                    <span className="text-[#4E6080]">
                      {trade.qty > 1 ? `${trade.qty}× ` : ""}{fmtEur(trade.unitCents)}
                    </span>
                    <span className={clsx("font-bold tabular-nums", trade.side === "buy" ? "text-emerald-400" : "text-[#F87171]")}>
                      = {fmtEur(trade.totalCents)}
                    </span>
                    <span className="text-[#2A3A50] text-[10px]">
                      {trade.side === "buy" ? `Buyer: ${trade.buyer}` : `Seller: ${trade.seller}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
