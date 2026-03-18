"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { clsx } from "clsx";
import type { LegoSetRecord } from "@/lib/legoSetRecord";
import { LegoSetPriceChart } from "./LegoSetPriceChart";
import { LegoAIPrediction } from "./LegoAIPrediction";
import { EbaySoldPanel } from "@/components/asset/EbaySoldPanel";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtUsd(v: number | null | undefined): string {
  if (v == null) return "—";
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

function retiring(exitDate: string | null | undefined): boolean {
  if (!exitDate) return false;
  const exit = new Date(exitDate + "T00:00:00Z").getTime();
  const now  = Date.now();
  return exit > now && exit - now < 90 * 24 * 60 * 60 * 1000;
}

function retired(exitDate: string | null | undefined): boolean {
  if (!exitDate) return false;
  return new Date(exitDate + "T00:00:00Z").getTime() < Date.now();
}

// ─── Detail row ────────────────────────────────────────────────────────────────

function Row({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#1C2640] last:border-0">
      <span className="text-xs text-[#4E6080] uppercase tracking-wider">{label}</span>
      <span className={clsx("text-sm font-medium tabular-nums", accent ? "text-[#F59E0B]" : "text-[#B0C4DE]")}>
        {value}
      </span>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface Props {
  set: LegoSetRecord;
}

export function LegoSetPage({ set }: Props) {
  const [gbpToUsd, setGbpToUsd] = useState(1.27);

  // Fetch live exchange rate GBP → USD
  useEffect(() => {
    fetch("/api/rates")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { rates?: Record<string, number> } | null) => {
        if (!data?.rates) return;
        const usdRate = data.rates["USD"] ?? 1.09;
        const gbpRate = data.rates["GBP"] ?? 0.85;
        setGbpToUsd(usdRate / gbpRate);
      })
      .catch(() => {});
  }, []);

  const marketUsd  = set.marketPriceGbp != null ? set.marketPriceGbp * gbpToUsd : null;
  const premiumPct = set.msrpUsd && marketUsd ? ((marketUsd - set.msrpUsd) / set.msrpUsd) * 100 : null;
  const isAboveMsrp = premiumPct != null && premiumPct >= 0;

  const isRetiring = retiring(set.exitDate);
  const isRetired  = retired(set.exitDate);

  const ebayQuery = `LEGO ${set.setNumber} ${set.name}`;

  return (
    <div className="min-h-screen bg-[#0B1120] text-[#E8F0FF]">
      {/* Navbar */}
      <header className="sticky top-0 z-20 border-b border-[#1C2640] bg-[#0B1120]/90 backdrop-blur">
        <div className="mx-auto flex max-w-screen-xl items-center gap-4 px-6 py-3">
          <Link
            href="/terminal"
            className="text-sm text-[#4E6080] hover:text-[#B0C4DE] transition-colors"
          >
            ← LEGO Sets
          </Link>
          <span className="text-[#1C2640]">/</span>
          <span className="text-sm font-medium text-[#B0C4DE] truncate max-w-xs">
            {set.setNumber} — {set.name}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-6 py-8 space-y-8">

        {/* ── Hero card ── */}
        <div className="rounded-2xl border border-[#1C2640] bg-[#0E1830] p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">

            {/* Image */}
            {set.imageUrl && (
              <div className="shrink-0 flex items-center justify-center rounded-xl bg-white/5 p-3 w-36 h-36">
                <Image
                  src={set.imageUrl}
                  alt={set.name}
                  width={120}
                  height={120}
                  className="object-contain max-h-[120px] w-auto"
                />
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {/* Theme badge */}
                <span className="rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#F59E0B]">
                  {set.theme}
                </span>
                {set.year && (
                  <span className="rounded-full border border-[#1C2640] px-2.5 py-0.5 text-[11px] text-[#4E6080]">
                    {set.year}
                  </span>
                )}
                {set.pieces && (
                  <span className="rounded-full border border-[#1C2640] px-2.5 py-0.5 text-[11px] text-[#4E6080]">
                    {set.pieces.toLocaleString()} pcs
                  </span>
                )}
                {/* Status badge */}
                {isRetired ? (
                  <span className="rounded-full border border-red-700/40 bg-red-900/20 px-2.5 py-0.5 text-[11px] font-semibold text-red-400">
                    RETIRED
                  </span>
                ) : isRetiring ? (
                  <span className="rounded-full border border-amber-700/40 bg-amber-900/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400 animate-pulse">
                    RETIRING SOON
                  </span>
                ) : (
                  <span className="rounded-full border border-emerald-700/40 bg-emerald-900/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                    ACTIVE
                  </span>
                )}
              </div>

              <h1 className="text-xl font-bold text-[#E8F0FF] mb-3">
                {set.setNumber} — {set.name}
              </h1>

              {/* Key metrics */}
              <div className="flex flex-wrap gap-6">
                {set.msrpUsd && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#4E6080]">MSRP</p>
                    <p className="text-lg font-bold text-[#E8F0FF]">{fmtUsd(set.msrpUsd)}</p>
                  </div>
                )}
                {marketUsd != null && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#4E6080]">Market Price</p>
                    <p className="text-lg font-bold text-[#E8F0FF]">{fmtUsd(marketUsd)}</p>
                  </div>
                )}
                {premiumPct != null && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#4E6080]">vs MSRP</p>
                    <p className={clsx("text-lg font-bold", isAboveMsrp ? "text-emerald-400" : "text-red-400")}>
                      {isAboveMsrp ? "+" : ""}{premiumPct.toFixed(1)}%
                    </p>
                  </div>
                )}
                {set.exitDate && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#4E6080]">
                      {isRetired ? "Retired" : "Retires"}
                    </p>
                    <p className={clsx("text-base font-semibold", isRetired ? "text-red-400" : isRetiring ? "text-amber-400" : "text-[#B0C4DE]")}>
                      {fmtDate(set.exitDate)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Left: chart + eBay */}
          <div className="lg:col-span-2 space-y-6">
            <LegoSetPriceChart set={set} gbpToUsd={gbpToUsd} />
            <EbaySoldPanel query={ebayQuery} currency="USD" />
          </div>

          {/* Right: AI prediction + details */}
          <div className="lg:col-span-1 space-y-6">
            <LegoAIPrediction set={set} gbpToUsd={gbpToUsd} />
            <div className="rounded-2xl border border-[#1C2640] bg-[#0E1830] p-5 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#2A3A50] mb-3">
                Set Details
              </p>

              <Row label="Set #"    value={set.setNumber} />
              <Row label="Name"     value={set.name} />
              <Row label="Theme"    value={set.theme} accent />
              {set.year    && <Row label="Year"    value={set.year} />}
              {set.pieces  && <Row label="Pieces"  value={set.pieces.toLocaleString()} />}

              {/* Dates */}
              <Row label="Launch"  value={fmtDate(set.launchDate)} />
              <Row label="Exit"    value={fmtDate(set.exitDate)} />

              {/* Pricing */}
              <div className="pt-2">
                <p className="text-[10px] uppercase tracking-wider text-[#2A3A50] pb-2">Pricing (USD)</p>
                {set.msrpUsd   && <Row label="MSRP"         value={fmtUsd(set.msrpUsd)} accent />}
                {marketUsd != null && <Row label="Market (est.)" value={fmtUsd(marketUsd)} accent />}
                {premiumPct != null && (
                  <Row
                    label="Premium"
                    value={
                      <span className={isAboveMsrp ? "text-emerald-400" : "text-red-400"}>
                        {isAboveMsrp ? "+" : ""}{premiumPct.toFixed(1)}%
                      </span>
                    }
                  />
                )}
              </div>

              {/* Other currencies */}
              {(set.msrpGbp || set.msrpEur || set.marketPriceGbp) && (
                <div className="pt-2">
                  <p className="text-[10px] uppercase tracking-wider text-[#2A3A50] pb-2">Other Currencies</p>
                  {set.msrpGbp && <Row label="MSRP GBP" value={`£${set.msrpGbp.toFixed(2)}`} />}
                  {set.msrpEur && <Row label="MSRP EUR" value={`€${set.msrpEur.toFixed(2)}`} />}
                  {set.marketPriceGbp && <Row label="Market GBP" value={`£${set.marketPriceGbp.toFixed(2)}`} />}
                </div>
              )}

              {/* Links */}
              <div className="pt-3 flex flex-wrap gap-2">
                {set.bricksetUrl && (
                  <a
                    href={set.bricksetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-[#1C2640] px-3 py-1.5 text-xs text-[#4E6080] hover:border-[#F59E0B]/40 hover:text-[#F59E0B] transition-colors"
                  >
                    BrickSet ↗
                  </a>
                )}
                {set.rebrickableUrl && (
                  <a
                    href={set.rebrickableUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-[#1C2640] px-3 py-1.5 text-xs text-[#4E6080] hover:border-[#F59E0B]/40 hover:text-[#F59E0B] transition-colors"
                  >
                    Rebrickable ↗
                  </a>
                )}
                {set.brickowlUrl && (
                  <a
                    href={set.brickowlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-[#1C2640] px-3 py-1.5 text-xs text-[#4E6080] hover:border-[#F59E0B]/40 hover:text-[#F59E0B] transition-colors"
                  >
                    BrickOwl ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
