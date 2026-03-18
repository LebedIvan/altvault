"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import type { LegoSetRecord } from "@/lib/legoSetRecord";
import type { LegoDbResponse } from "@/app/api/lego/db/route";

// ─── Types ──────────────────────────────────────────────────────────────────

type SortBy =
  | "name" | "pieces" | "year" | "theme"
  | "launchDate" | "exitDate" | "msrp" | "marketPrice";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const THEME_COLORS: Record<string, string> = {
  "Star Wars":    "text-yellow-400",
  "Icons":        "text-[#F59E0B]",
  "Technic":      "text-red-400",
  "Ideas":        "text-purple-400",
  "Creator":      "text-orange-400",
  "Harry Potter": "text-violet-400",
  "Marvel":       "text-red-400",
  "DC":           "text-blue-400",
  "Botanical":    "text-emerald-400",
  "Minecraft":    "text-lime-400",
  "City":         "text-yellow-300",
};

function themeColor(theme: string): string {
  for (const [key, cls] of Object.entries(THEME_COLORS)) {
    if (theme.toLowerCase().includes(key.toLowerCase())) return cls;
  }
  return "text-[#4E6080]";
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function retiringsSoon(exitDate: string | null | undefined): boolean {
  if (!exitDate) return false;
  const exit = new Date(exitDate + "T00:00:00Z").getTime();
  const now  = Date.now();
  return exit > now && exit - now < 90 * 24 * 60 * 60 * 1000;
}

function alreadyRetired(exitDate: string | null | undefined): boolean {
  if (!exitDate) return false;
  return new Date(exitDate + "T00:00:00Z").getTime() < Date.now();
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LegoSunset() {
  const [response, setResponse] = useState<LegoDbResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [dbEmpty, setDbEmpty]   = useState(false);
  const [themeFilter, setThemeFilter] = useState("all");
  const [sortBy, setSortBy]     = useState<SortBy>("year");
  const [sortDir, setSortDir]   = useState<"asc" | "desc">("desc");
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);

  const PAGE_SIZE = 100;

  useEffect(() => {
    setLoading(true);
    fetch("/api/lego/db")
      .then((r) => r.json() as Promise<LegoDbResponse>)
      .then((d) => {
        setResponse(d);
        setDbEmpty(d.empty);
        setLoading(false);
      })
      .catch(() => {
        setResponse(null);
        setLoading(false);
      });
  }, []);

  const sets: LegoSetRecord[] = response?.sets ?? [];

  const themes = useMemo(
    () => Array.from(new Set(sets.map((s) => s.theme))).sort(),
    [sets],
  );

  const filtered = useMemo(() => {
    let items = sets;
    if (themeFilter !== "all") items = items.filter((s) => s.theme === themeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.setNumber.includes(q) ||
          s.theme.toLowerCase().includes(q),
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    const nullLast = (
      a: string | number | null | undefined,
      b: string | number | null | undefined,
      cmp: () => number,
    ) => {
      if (a == null && b == null) return 0;
      if (a == null) return 1;
      if (b == null) return -1;
      return cmp() * dir;
    };
    return [...items].sort((a, b) => {
      switch (sortBy) {
        case "pieces":      return nullLast(a.pieces, b.pieces, () => (a.pieces ?? 0) - (b.pieces ?? 0));
        case "year":        return nullLast(a.year, b.year, () => (a.year ?? 0) - (b.year ?? 0));
        case "theme":       return a.theme.localeCompare(b.theme) * dir;
        case "launchDate":  return nullLast(a.launchDate, b.launchDate,
                              () => (a.launchDate ?? "").localeCompare(b.launchDate ?? ""));
        case "exitDate":    return nullLast(a.exitDate, b.exitDate,
                              () => (a.exitDate ?? "").localeCompare(b.exitDate ?? ""));
        case "msrp": {
          const ma = a.msrpUsd ?? a.msrpEur ?? null;
          const mb = b.msrpUsd ?? b.msrpEur ?? null;
          return nullLast(ma, mb, () => (ma ?? 0) - (mb ?? 0));
        }
        case "marketPrice": return nullLast(a.marketPriceGbp, b.marketPriceGbp,
                              () => (a.marketPriceGbp ?? 0) - (b.marketPriceGbp ?? 0));
        default:            return a.name.localeCompare(b.name) * dir;
      }
    });
  }, [sets, themeFilter, sortBy, sortDir, search]);

  function handleSort(col: SortBy) {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("asc"); }
    setPage(1);
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function SortIcon({ col }: { col: SortBy }) {
    if (sortBy !== col) return <span className="ml-1 opacity-20">↕</span>;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const stats = response?.stats;
  const syncedAt = response?.syncedAt;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[#4E6080]">
            🧱 LEGO Sets
          </h2>
          <p className="text-[10px] text-[#2A3A50] mt-0.5">
            {syncedAt ? (
              <>synced {new Date(syncedAt).toLocaleDateString()} · </>
            ) : null}
            {stats && (
              <span>
                {stats.withPrices.toLocaleString()} prices ·{" "}
                {stats.withDates.toLocaleString()} dated
              </span>
            )}
          </p>
        </div>
        {!loading && filtered.length > 0 && (
          <span className="text-xs text-[#2A3A50] tabular-nums self-center">
            {filtered.length.toLocaleString()} / {(stats?.totalSets ?? 0).toLocaleString()} sets
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-[#2A3A50] text-sm gap-2">
          <span className="animate-spin">↻</span>
          Loading LEGO database…
        </div>
      )}

      {/* DB empty — needs sync */}
      {!loading && dbEmpty && (
        <div className="rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-5 py-6 space-y-3">
          <p className="text-[#F59E0B] text-sm font-bold">⚙ Database not yet synced</p>
          <p className="text-xs text-[#4E6080]">Run the sync script to populate the LEGO database:</p>
          <pre className="text-[11px] text-[#4ADE80] bg-[#080F1C] rounded px-3 py-2">
            npx tsx scripts/sync-lego.ts
          </pre>
          <p className="text-xs text-[#2A3A50]">
            Requires <code className="text-[#4E6080]">REBRICKABLE_API_KEY</code> and{" "}
            <code className="text-[#4E6080]">BRICKOWL_API_KEY</code> in .env.local
          </p>
        </div>
      )}

      {/* Error */}
      {!loading && !response && (
        <div className="rounded-lg border border-[#F87171]/25 bg-[#F87171]/10 px-4 py-6 text-center">
          <p className="text-[#F87171] text-sm font-medium">Could not load LEGO database</p>
        </div>
      )}

      {/* Filters + Table */}
      {!loading && !dbEmpty && sets.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, number, theme…"
              className="rounded-lg border border-[#1C2640] bg-[#080F1C] px-3 py-1.5 text-xs text-[#E8F0FF] placeholder:text-[#2A3A50] focus:border-[#F59E0B]/50 focus:outline-none w-52"
            />
            <select
              value={themeFilter}
              onChange={(e) => { setThemeFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-[#1C2640] bg-[#080F1C] px-3 py-1.5 text-xs text-[#E8F0FF] focus:border-[#F59E0B]/50 focus:outline-none"
            >
              <option value="all">All themes ({sets.length.toLocaleString()})</option>
              {themes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#1C2640]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1C2640] bg-[#080F1C] text-[#4E6080] font-medium">
                  {(
                    [
                      ["name",        "Set",      "text-left",  ""],
                      ["theme",       "Theme",    "text-left",  "hidden sm:table-cell"],
                      ["pieces",      "Pieces",   "text-right", "hidden lg:table-cell"],
                      ["year",        "Year",     "text-right", "hidden lg:table-cell"],
                      ["launchDate",  "Release",  "text-right", "hidden xl:table-cell"],
                      ["exitDate",    "Retires",  "text-right", "hidden xl:table-cell"],
                      ["msrp",        "MSRP",     "text-right", "hidden xl:table-cell"],
                      ["marketPrice", "Market £", "text-right", "hidden xl:table-cell"],
                    ] as const
                  ).map(([col, label, align, hide]) => (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className={clsx(
                        "px-3 py-2 cursor-pointer select-none whitespace-nowrap hover:text-[#B0C4DE] transition-colors",
                        align, hide,
                        sortBy === col && "text-[#F59E0B]",
                      )}
                    >
                      {label}<SortIcon col={col} />
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right">Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#162035]">
                {pageItems.map((s) => {
                  const soon    = retiringsSoon(s.exitDate);
                  const retired = alreadyRetired(s.exitDate);
                  const msrp    = s.msrpUsd != null ? `$${s.msrpUsd.toFixed(0)}`
                                : s.msrpGbp != null ? `£${s.msrpGbp.toFixed(0)}`
                                : s.msrpEur != null ? `€${s.msrpEur.toFixed(0)}`
                                : "—";

                  return (
                    <tr key={s.setNumber} className="hover:bg-[#162035] transition-colors">

                      {/* Set */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {s.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.imageUrl} alt={s.name}
                              className="h-10 w-10 object-contain rounded shrink-0 bg-[#0E1830]" />
                          ) : (
                            <div className="h-10 w-10 rounded bg-[#0E1830] flex items-center justify-center text-lg shrink-0">🧱</div>
                          )}
                          <div>
                            <Link href={`/lego/${s.setNumber}`}
                              className="font-medium text-[#B0C4DE] hover:text-[#F59E0B] transition-colors">
                              {s.name}
                            </Link>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-[#2A3A50] text-[10px]">#{s.setNumber}</p>
                              {soon && (
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" title="Retiring within 90 days" />
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Theme */}
                      <td className="px-3 py-2 hidden sm:table-cell">
                        <span className={clsx("font-medium text-[11px]", themeColor(s.theme))}>
                          {s.theme}
                        </span>
                      </td>

                      {/* Pieces */}
                      <td className="px-3 py-2 text-right tabular-nums text-[#4E6080] hidden lg:table-cell">
                        {s.pieces ? s.pieces.toLocaleString() : "—"}
                      </td>

                      {/* Year */}
                      <td className="px-3 py-2 text-right tabular-nums text-[#4E6080] hidden lg:table-cell">
                        {s.year ?? "—"}
                      </td>

                      {/* Release */}
                      <td className="px-3 py-2 text-right tabular-nums text-[#4E6080] hidden xl:table-cell">
                        {fmtDate(s.launchDate)}
                      </td>

                      {/* Retires */}
                      <td className={clsx(
                        "px-3 py-2 text-right tabular-nums hidden xl:table-cell",
                        retired ? "text-[#F87171]" : soon ? "text-amber-400" : "text-[#4E6080]",
                      )}>
                        {fmtDate(s.exitDate)}
                      </td>

                      {/* MSRP */}
                      <td className="px-3 py-2 text-right tabular-nums text-[#4E6080] hidden xl:table-cell">
                        {msrp}
                      </td>

                      {/* Market price */}
                      <td className="px-3 py-2 text-right tabular-nums hidden xl:table-cell">
                        {s.marketPriceGbp != null ? (
                          <span className="text-[#4ADE80]">£{s.marketPriceGbp.toFixed(2)}</span>
                        ) : (
                          <span className="text-[#2A3A50]">—</span>
                        )}
                      </td>

                      {/* Links */}
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/lego/${s.setNumber}`}
                            className="text-[10px] text-[#F59E0B]/70 hover:text-[#F59E0B] font-semibold transition-colors">
                            View →
                          </Link>
                          {s.brickowlUrl && (
                            <a href={s.brickowlUrl} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-[#2A3A50] hover:text-[#4ADE80] transition-colors">
                              BrickOwl
                            </a>
                          )}
                          {s.rebrickableUrl && (
                            <a href={s.rebrickableUrl} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-[#2A3A50] hover:text-[#F59E0B] transition-colors">
                              Rebrickable
                            </a>
                          )}
                          <a href={`https://www.bricklink.com/v2/catalog/catalogitem.page?S=${s.setNumber}-1`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-[10px] text-[#2A3A50] hover:text-orange-400 transition-colors">
                            BrickLink
                          </a>
                          <a href={`https://www.lego.com/en-us/search?q=${encodeURIComponent(s.setNumber)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-[10px] text-[#2A3A50] hover:text-yellow-400 transition-colors">
                            LEGO
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="py-8 text-center text-xs text-[#2A3A50]">
                No sets match your filters.
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2 py-1 text-xs rounded border border-[#1C2640] text-[#4E6080] hover:text-[#E8F0FF] hover:border-[#3E5070] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              <span className="text-[10px] text-[#2A3A50] tabular-nums">
                Page {page} / {totalPages} · {filtered.length.toLocaleString()} sets
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2 py-1 text-xs rounded border border-[#1C2640] text-[#4E6080] hover:text-[#E8F0FF] hover:border-[#3E5070] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          )}

          <p className="text-[10px] text-[#2A3A50] px-1">
            Data from{" "}
            <a href="https://rebrickable.com" target="_blank" rel="noopener noreferrer"
              className="underline hover:text-[#4E6080]">Rebrickable</a>
            {stats && stats.withBrickowl > 0 && (
              <> · <a href="https://www.brickowl.com" target="_blank" rel="noopener noreferrer"
                className="underline hover:text-[#4E6080]">BrickOwl</a> (market prices £)</>
            )}
            {stats && stats.withDates > 0 && (
              <> · <a href="https://brickset.com" target="_blank" rel="noopener noreferrer"
                className="underline hover:text-[#4E6080]">BrickSet</a> (dates &amp; MSRP)</>
            )}
            {syncedAt && (
              <span className="ml-1">· synced {new Date(syncedAt).toLocaleString()}</span>
            )}
          </p>
        </>
      )}
    </div>
  );
}
