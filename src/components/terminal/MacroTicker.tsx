"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import type { TickerItem } from "@/app/api/macro/ticker/route";

const CAT_COLORS: Record<string, string> = {
  crypto:     "text-amber-400",
  equity:     "text-[#F59E0B]",
  commodity:  "text-yellow-400",
  volatility: "text-[#4E6080]",
  fx:         "text-emerald-400",
};

function fmt(item: TickerItem): string {
  if (item.price >= 10000) return item.price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (item.price >= 100)   return item.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return item.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function MacroTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/macro/ticker");
        if (!res.ok) return;
        const data = (await res.json()) as { items: TickerItem[] };
        setItems(data.items ?? []);
      } catch { /* silent */ }
    }
    void load();
    const id = setInterval(() => { void load(); }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (items.length === 0) return null;

  // Duplicate for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className="overflow-hidden border-b border-[#1C2640] bg-[#080F1C] py-1.5">
      <div className="ticker-track flex items-center gap-0">
        {doubled.map((item, i) => {
          const isUp = item.change24h >= 0;
          return (
            <span
              key={`${item.symbol}-${i}`}
              className="flex shrink-0 items-center gap-2 px-5 text-xs"
            >
              <span className={clsx("fm font-bold", CAT_COLORS[item.category] ?? "text-[#4E6080]")}>
                {item.symbol}
              </span>
              <span className="fm tabular-nums font-medium text-[#E8F0FF]">{fmt(item)}</span>
              <span className={clsx("tabular-nums font-bold", isUp ? "text-emerald-400" : "text-[#F87171]")}>
                {isUp ? "▲" : "▼"}{Math.abs(item.change24h * 100).toFixed(2)}%
              </span>
              <span className="text-[#2A3A50]">|</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
