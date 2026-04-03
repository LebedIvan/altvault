"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { clsx } from "clsx";
import { usePortfolio } from "@/store/portfolioStore";
import type { Asset, AssetClass, Currency, Transaction } from "@/types/asset";
import { DEFAULT_PLATFORM_FEE_RATES } from "@/constants/fees";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchResult {
  key: string;
  assetClass: AssetClass;
  categoryLabel: string;
  name: string;
  externalId?: string;
  priceCents: number | null;
  currency: string;
  iconUrl?: string | null;
  imageUrl?: string;
  imageThumbnailUrl?: string;
  meta?: string;
  // Set if already in user's portfolio
  portfolioAssetId?: string;
  unitsHeld?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<AssetClass, string> = {
  trading_cards:            "🃏 Покемон / MTG",
  basketball_cards:         "🏀 Баскетбол",
  football_cards:           "⚽ Футбол",
  hockey_cards:             "🏒 Хоккей",
  american_football_cards:  "🏈 Американский футбол",
  comics:                   "📚 Комиксы",
  lego:                     "🧱 LEGO",
  cs2_skins:                "🎯 CS2 скины",
  music_royalties:          "🎵 Роялти",
  p2p_lending:              "💰 P2P кредитование",
  domain_names:             "🌐 Домены",
  anime_cels:               "🎌 Аниме целлы",
  commodities:              "⚡ Сырьевые товары",
  sports_betting:           "🎲 Ставки",
  games_tech:               "🎮 Игры & Техника",
};

const ASSET_DEFAULTS: Record<string, { liquidityDays: number; riskScore: number }> = {
  trading_cards:            { liquidityDays: 14,  riskScore: 65 },
  basketball_cards:         { liquidityDays: 14,  riskScore: 60 },
  football_cards:           { liquidityDays: 14,  riskScore: 60 },
  hockey_cards:             { liquidityDays: 14,  riskScore: 60 },
  american_football_cards:  { liquidityDays: 14,  riskScore: 60 },
  comics:                   { liquidityDays: 30,  riskScore: 55 },
  lego:                     { liquidityDays: 21,  riskScore: 45 },
  cs2_skins:                { liquidityDays: 1,   riskScore: 70 },
  music_royalties:          { liquidityDays: 90,  riskScore: 50 },
  p2p_lending:              { liquidityDays: 180, riskScore: 55 },
  domain_names:             { liquidityDays: 60,  riskScore: 60 },
  anime_cels:               { liquidityDays: 60,  riskScore: 70 },
  commodities:              { liquidityDays: 1,   riskScore: 30 },
  sports_betting:           { liquidityDays: 1,   riskScore: 90 },
  games_tech:               { liquidityDays: 14,  riskScore: 50 },
};

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: "EUR", label: "EUR €" },
  { value: "USD", label: "USD $" },
  { value: "GBP", label: "GBP £" },
];

const inputCls =
  "w-full rounded-lg border border-[#1C2640] bg-[#080F1C] px-3 py-2 text-sm text-[#E8F0FF] " +
  "placeholder-[#2A3A50] focus:border-[#F59E0B]/50 focus:outline-none focus:ring-1 focus:ring-[#F59E0B]/20";

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  hint,
  children,
  required,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="fm text-xs font-medium text-[#4E6080] uppercase tracking-wider">
        {label}
        {required && <span className="ml-0.5 text-[#F87171]">*</span>}
      </label>
      {children}
      {hint  && <p className="fm text-xs text-[#2A3A50]">{hint}</p>}
      {error && <p className="fm text-xs text-[#F87171]">{error}</p>}
    </div>
  );
}

// ── Catalog search ────────────────────────────────────────────────────────────

async function safeJson(p: Promise<Response>): Promise<unknown> {
  try {
    const r = await p;
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}

type RawSuggestions = { suggestions?: unknown[] } | null;

function getSuggestions(data: unknown): unknown[] {
  return (data as RawSuggestions)?.suggestions ?? [];
}

async function fetchCatalog(query: string): Promise<SearchResult[]> {
  if (query.length < 2) return [];
  const q = encodeURIComponent(query);

  const [legoR, mtgR, pokR, comicsR, gamesR, steamR, bballR, socR] =
    await Promise.all([
      safeJson(fetch(`/api/search/lego?q=${q}`)),
      safeJson(fetch(`/api/search/mtg?q=${q}`)),
      safeJson(fetch(`/api/search/pokemon?q=${q}`)),
      safeJson(fetch(`/api/search/comics?q=${q}`)),
      safeJson(fetch(`/api/search/games-tech?q=${q}`)),
      safeJson(fetch(`/api/search/steam?q=${q}`)),
      safeJson(fetch(`/api/search/sports-cards?q=${q}&sport=basketball`)),
      safeJson(fetch(`/api/search/sports-cards?q=${q}&sport=football`)),
    ]);

  const results: SearchResult[] = [];

  type LegoS = { id: string; fullName: string; theme: string; pieces: number | null; priceCents: number | null; imageSmall: string | null; imageLarge: string | null; currency: string };
  for (const s of (getSuggestions(legoR) as LegoS[]).slice(0, 5)) {
    results.push({
      key: `lego-${s.id}`,
      assetClass: "lego",
      categoryLabel: "🧱 LEGO",
      name: s.fullName,
      externalId: s.id,
      priceCents: s.priceCents,
      currency: s.currency ?? "GBP",
      iconUrl: s.imageSmall,
      imageUrl: s.imageLarge ?? undefined,
      imageThumbnailUrl: s.imageSmall ?? undefined,
      meta: [s.theme, s.pieces ? `${s.pieces} дет.` : null].filter(Boolean).join(" · "),
    });
  }

  type MtgS = { id: string; fullName: string; setName: string; rarity: string; imageSmall: string | null; imageLarge: string | null; priceCents: number | null; currency: string };
  for (const s of (getSuggestions(mtgR) as MtgS[]).slice(0, 5)) {
    results.push({
      key: `mtg-${s.id}`,
      assetClass: "trading_cards",
      categoryLabel: "🃏 MTG",
      name: s.fullName,
      externalId: s.id,
      priceCents: s.priceCents,
      currency: s.currency ?? "EUR",
      iconUrl: s.imageSmall,
      imageUrl: s.imageLarge ?? undefined,
      imageThumbnailUrl: s.imageSmall ?? undefined,
      meta: [s.setName, s.rarity].filter(Boolean).join(" · "),
    });
  }

  type PokS = { id: string; fullName: string; set: string; rarity: string | null; imageSmall: string; imageLarge: string; priceCents: number | null; currency: string };
  for (const s of (getSuggestions(pokR) as PokS[]).slice(0, 5)) {
    results.push({
      key: `pok-${s.id}`,
      assetClass: "trading_cards",
      categoryLabel: "🔴 Покемон",
      name: s.fullName,
      externalId: s.id,
      priceCents: s.priceCents,
      currency: s.currency ?? "EUR",
      iconUrl: s.imageSmall,
      imageUrl: s.imageLarge ?? undefined,
      imageThumbnailUrl: s.imageSmall ?? undefined,
      meta: [s.set, s.rarity].filter(Boolean).join(" · "),
    });
  }

  type ComicS = { id: string; fullName: string; set: string; imageSmall: string | null; imageLarge: string | null; priceCents: number | null; currency: string };
  for (const s of (getSuggestions(comicsR) as ComicS[]).slice(0, 5)) {
    results.push({
      key: `comics-${s.id}`,
      assetClass: "comics",
      categoryLabel: "📚 Комиксы",
      name: s.fullName,
      externalId: s.id,
      priceCents: s.priceCents,
      currency: s.currency ?? "USD",
      iconUrl: s.imageSmall,
      imageUrl: s.imageLarge ?? undefined,
      imageThumbnailUrl: s.imageSmall ?? undefined,
      meta: s.set || undefined,
    });
  }

  type GamesS = { id: string; fullName: string; platform: string; loosePriceCents: number | null; priceCents: number | null; currency: string };
  for (const s of (getSuggestions(gamesR) as GamesS[]).slice(0, 5)) {
    results.push({
      key: `games-${s.id}`,
      assetClass: "games_tech",
      categoryLabel: "🎮 Игры",
      name: s.fullName,
      externalId: s.id,
      priceCents: s.loosePriceCents ?? s.priceCents,
      currency: s.currency ?? "USD",
      iconUrl: null,
      meta: s.platform || undefined,
    });
  }

  type SteamS = { name: string; priceCents: number | null; type: string; iconUrl: string | null };
  for (const s of (getSuggestions(steamR) as SteamS[]).slice(0, 5)) {
    results.push({
      key: `cs2-${s.name}`,
      assetClass: "cs2_skins",
      categoryLabel: "🎯 CS2",
      name: s.name,
      externalId: s.name,
      priceCents: s.priceCents,
      currency: "EUR",
      iconUrl: s.iconUrl,
      imageUrl: s.iconUrl ?? undefined,
      imageThumbnailUrl: s.iconUrl ?? undefined,
      meta: s.type || undefined,
    });
  }

  type SportsS = { id: string; fullName: string; set: string; rarity: string | null; imageSmall: string | null; imageLarge: string | null; priceCents: number | null; currency: string };
  for (const s of (getSuggestions(bballR) as SportsS[]).slice(0, 4)) {
    results.push({
      key: `bball-${s.id}`,
      assetClass: "basketball_cards",
      categoryLabel: "🏀 Баскетбол",
      name: s.fullName,
      externalId: s.id,
      priceCents: s.priceCents,
      currency: s.currency ?? "USD",
      iconUrl: s.imageSmall,
      imageUrl: s.imageLarge ?? undefined,
      imageThumbnailUrl: s.imageSmall ?? undefined,
      meta: [s.set, s.rarity].filter(Boolean).join(" · "),
    });
  }

  for (const s of (getSuggestions(socR) as SportsS[]).slice(0, 4)) {
    results.push({
      key: `soc-${s.id}`,
      assetClass: "football_cards",
      categoryLabel: "⚽ Футбол",
      name: s.fullName,
      externalId: s.id,
      priceCents: s.priceCents,
      currency: s.currency ?? "USD",
      iconUrl: s.imageSmall,
      imageUrl: s.imageLarge ?? undefined,
      imageThumbnailUrl: s.imageSmall ?? undefined,
      meta: [s.set, s.rarity].filter(Boolean).join(" · "),
    });
  }

  return results;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export function NewTransactionModal({ onClose }: Props) {
  const { assets, addAsset, addTransaction } = usePortfolio();

  // ── Search state ──
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [catalogItems, setCatalogItems] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<SearchResult | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // ── Form state ──
  const today = new Date().toISOString().slice(0, 10);
  const [operation, setOperation] = useState<"buy" | "sell">("buy");
  const [date, setDate] = useState(today);
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [commission, setCommission] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Portfolio results (client-side) ──
  const portfolioResults = useMemo((): SearchResult[] => {
    if (query.length < 1) return [];
    const q = query.toLowerCase();
    return assets
      .filter((a) => a.name.toLowerCase().includes(q))
      .map((a): SearchResult => {
        const held = a.transactions.reduce(
          (s, t) => s + (t.type === "buy" ? t.quantity : -t.quantity),
          0,
        );
        return {
          key: `portfolio-${a.id}`,
          assetClass: a.assetClass,
          categoryLabel: CATEGORY_LABELS[a.assetClass] ?? a.assetClass,
          name: a.name,
          externalId: a.externalId,
          priceCents: a.currentPriceCents,
          currency: a.currency,
          iconUrl: a.imageThumbnailUrl ?? null,
          imageUrl: a.imageUrl,
          imageThumbnailUrl: a.imageThumbnailUrl,
          portfolioAssetId: a.id,
          unitsHeld: Math.max(0, held),
        };
      })
      .slice(0, 5);
  }, [query, assets]);

  // ── Debounced catalog search ──
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.length < 2) {
      setCatalogItems([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timerRef.current = setTimeout(async () => {
      try {
        const results = await fetchCatalog(query);
        setCatalogItems(results);
      } catch {
        setCatalogItems([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  // ── Close dropdown on outside click ──
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── All dropdown items (portfolio first, then catalog) ──
  const allDropdownItems = useMemo((): SearchResult[] => {
    return [...portfolioResults, ...catalogItems];
  }, [portfolioResults, catalogItems]);

  const showDropdown =
    searchOpen &&
    !selectedAsset &&
    query.length >= 1 &&
    (allDropdownItems.length > 0 || searching);

  function pickAsset(result: SearchResult) {
    setSelectedAsset(result);
    setQuery(result.name);
    setSearchOpen(false);
    setActiveIndex(-1);
    setCurrency((result.currency as Currency) ?? "EUR");
    if (result.priceCents != null) {
      setPrice((result.priceCents / 100).toFixed(2));
    }
    if (errors.asset) setErrors((e) => ({ ...e, asset: "" }));
  }

  function clearAsset() {
    setSelectedAsset(null);
    setQuery("");
    setPrice("");
    setCurrency("EUR");
    setSearchOpen(false);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || allDropdownItems.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, allDropdownItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const item = allDropdownItems[activeIndex];
      if (item) pickAsset(item);
    } else if (e.key === "Escape") {
      setSearchOpen(false);
    }
  }

  // ── Live calculation ──
  const qtyNum   = parseFloat(quantity.replace(",", "."))   || 0;
  const priceNum = parseFloat(price.replace(",", "."))      || 0;
  const commNum  = parseFloat(commission.replace(",", ".")) || 0;
  const subtotal = qtyNum * priceNum;
  const total    = operation === "buy" ? subtotal + commNum : subtotal - commNum;
  const currSym  = currency === "USD" ? "$" : currency === "GBP" ? "£" : "€";

  // ── Sell warning ──
  const unitsHeld  = selectedAsset?.unitsHeld ?? 0;
  const sellWarn   =
    operation === "sell" &&
    selectedAsset != null &&
    qtyNum > 0 &&
    (selectedAsset.portfolioAssetId == null || qtyNum > unitsHeld);

  // ── Validation ──
  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!selectedAsset)              errs.asset      = "Выберите актив из каталога";
    if (!date)                       errs.date       = "Укажите дату";
    if (date > today)                errs.date       = "Дата не может быть в будущем";
    if (!quantity || qtyNum <= 0)   errs.quantity   = "Укажите количество";
    if (!price)                      errs.price      = "Укажите цену";
    if (priceNum <= 0)               errs.price      = "Цена должна быть больше нуля";
    if (commNum < 0)                 errs.commission = "Комиссия не может быть отрицательной";
    if (notes.length > 500)          errs.notes      = "Максимум 500 символов";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function buildTx(assetId: string): Transaction {
    return {
      id:                crypto.randomUUID(),
      assetId,
      type:              operation,
      pricePerUnitCents: Math.round(priceNum * 100),
      quantity:          qtyNum,
      currency,
      feeCents:          Math.round(commNum * 100),
      otherCostsCents:   0,
      date:              new Date(date),
      platform:          "",
      notes:             notes.trim() || undefined,
    };
  }

  function handleSubmit(addMore: boolean) {
    if (!validate() || !selectedAsset) return;

    if (selectedAsset.portfolioAssetId) {
      // Asset already in portfolio — just add transaction
      addTransaction(selectedAsset.portfolioAssetId, buildTx(selectedAsset.portfolioAssetId));
    } else {
      // New asset from catalog — create it with this transaction
      const assetId = crypto.randomUUID();
      const tx = buildTx(assetId);
      const def = ASSET_DEFAULTS[selectedAsset.assetClass] ?? { liquidityDays: 30, riskScore: 50 };
      const newAsset: Asset = {
        id:               assetId,
        name:             selectedAsset.name,
        assetClass:       selectedAsset.assetClass,
        externalId:       selectedAsset.externalId,
        currency,
        currentPriceCents: Math.round(priceNum * 100),
        priceSnapshots:   [],
        liquidityDays:    def.liquidityDays,
        riskScore:        def.riskScore,
        platformFeeRate:  DEFAULT_PLATFORM_FEE_RATES[selectedAsset.assetClass] ?? 0.1,
        holdingCostCents: 0,
        transactions:     [tx],
        tags:             [],
        imageUrl:         selectedAsset.imageUrl,
        imageThumbnailUrl: selectedAsset.imageThumbnailUrl,
        createdAt:        new Date(),
        updatedAt:        new Date(),
      };
      addAsset(newAsset);
    }

    if (addMore) {
      setSelectedAsset(null);
      setQuery("");
      setOperation("buy");
      setQuantity("");
      setPrice("");
      setCurrency("EUR");
      setCommission("");
      setNotes("");
      setErrors({});
    } else {
      onClose();
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const portfolioCount = portfolioResults.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg max-h-[94vh] overflow-y-auto rounded-2xl border border-[#1C2640] bg-[#0B1120] shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#1C2640] bg-[#0B1120] px-6 py-4">
          <h2 className="fb text-base font-bold text-[#E8F0FF]">Новая сделка</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#4E6080] hover:bg-[#1C2640] hover:text-[#E8F0FF] transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 p-6">

          {/* 1. Asset search */}
          <Field label="Актив / Компания" error={errors.asset} required>
            <div ref={searchContainerRef} className="relative">
              {selectedAsset ? (
                /* Selected asset chip */
                <div className="flex items-center gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-2">
                  {selectedAsset.iconUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedAsset.iconUrl}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded object-contain bg-[#080F1C]"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#E8F0FF]">{selectedAsset.name}</p>
                    <p className="fm truncate text-xs text-[#4E6080]">
                      {selectedAsset.categoryLabel}
                      {selectedAsset.portfolioAssetId && (
                        <span className="ml-1.5 rounded-full bg-[#4ADE80]/15 px-1.5 py-0.5 text-[10px] text-[#4ADE80]">
                          В портфеле
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearAsset}
                    className="shrink-0 text-[#4E6080] hover:text-[#E8F0FF] transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <input
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setSearchOpen(true);
                        setActiveIndex(-1);
                      }}
                      onFocus={() => setSearchOpen(true)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Начните вводить название актива, тикер или номер…"
                      autoComplete="off"
                      className={clsx(inputCls, searching && "pr-8")}
                    />
                    {searching && (
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#4E6080] text-sm animate-spin">
                        ↻
                      </span>
                    )}
                  </div>

                  {showDropdown && (
                    <ul className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto rounded-xl border border-[#1C2640] bg-[#0E1830] shadow-2xl">

                      {/* Portfolio group header */}
                      {portfolioCount > 0 && (
                        <li className="px-3 pt-2 pb-1">
                          <span className="fm text-[10px] font-semibold uppercase tracking-wider text-[#4E6080]">
                            В портфеле
                          </span>
                        </li>
                      )}

                      {allDropdownItems.map((item, i) => {
                        const isPortfolio = item.portfolioAssetId != null;
                        const isCatalogHeader = !isPortfolio && (i === 0 || allDropdownItems[i - 1]?.portfolioAssetId != null);
                        return (
                          <li key={item.key}>
                            {isCatalogHeader && (
                              <div className="px-3 pt-2 pb-1">
                                <span className="fm text-[10px] font-semibold uppercase tracking-wider text-[#4E6080]">
                                  Каталог
                                </span>
                              </div>
                            )}
                            <div
                              onMouseDown={() => pickAsset(item)}
                              onMouseEnter={() => setActiveIndex(i)}
                              className={clsx(
                                "flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors",
                                i === activeIndex
                                  ? "bg-[#F59E0B]/10 text-[#E8F0FF]"
                                  : "text-[#B0C4DE] hover:bg-[#162035]",
                              )}
                            >
                              {item.iconUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.iconUrl}
                                  alt=""
                                  className="h-8 w-8 shrink-0 rounded object-contain bg-[#080F1C]"
                                />
                              ) : (
                                <span className="h-8 w-8 shrink-0 rounded bg-[#080F1C] flex items-center justify-center text-base">
                                  {item.categoryLabel.split(" ")[0]}
                                </span>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-sm">{item.name}</p>
                                <p className="fm truncate text-xs text-[#4E6080]">
                                  {item.categoryLabel}
                                  {item.meta ? ` · ${item.meta}` : ""}
                                  {isPortfolio && item.unitsHeld != null && (
                                    <span className="ml-1.5 text-[#4ADE80]">
                                      {item.unitsHeld} шт.
                                    </span>
                                  )}
                                </p>
                              </div>
                              {item.priceCents != null && (
                                <span className="fm shrink-0 text-xs font-semibold text-[#4ADE80]">
                                  {item.currency === "GBP" ? "£" : item.currency === "USD" ? "$" : "€"}
                                  {(item.priceCents / 100).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })}

                      {searching && allDropdownItems.length === 0 && (
                        <li className="fm px-4 py-3 text-sm text-[#4E6080]">Поиск по каталогу…</li>
                      )}

                      {!searching && allDropdownItems.length === 0 && query.length >= 2 && (
                        <li className="fm px-4 py-3 text-sm text-[#4E6080]">Ничего не найдено</li>
                      )}
                    </ul>
                  )}
                </>
              )}
            </div>
          </Field>

          {/* 2. Operation + Date */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Операция" required>
              <div className="flex rounded-lg border border-[#1C2640] bg-[#080F1C] p-0.5 gap-0.5">
                {(["buy", "sell"] as const).map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setOperation(op)}
                    className={clsx(
                      "flex-1 rounded-md py-1.5 text-sm font-semibold transition-colors",
                      operation === op
                        ? op === "buy"
                          ? "bg-[#4ADE80] text-[#0B1120]"
                          : "bg-[#F87171] text-[#0B1120]"
                        : "text-[#4E6080] hover:text-[#B0C4DE]",
                    )}
                  >
                    {op === "buy" ? "Покупка" : "Продажа"}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Дата" error={errors.date} required>
              <input
                type="date"
                value={date}
                max={today}
                onChange={(e) => setDate(e.target.value)}
                className={clsx(inputCls, "text-[#B0C4DE]")}
              />
            </Field>
          </div>

          {/* 3. Quantity + Price */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Количество, шт." error={errors.quantity} required>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="0.001"
                step="any"
                placeholder="Количество"
                inputMode="decimal"
                className={inputCls}
              />
            </Field>

            <Field
              label="Цена за единицу"
              error={errors.price}
              hint={
                selectedAsset?.priceCents != null && price
                  ? `Рыночная цена на ${new Date().toLocaleDateString("ru-RU")}`
                  : selectedAsset && selectedAsset.priceCents == null
                    ? "Рыночная цена недоступна"
                    : undefined
              }
              required
            >
              <div className="flex gap-1.5">
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="0"
                  step="any"
                  placeholder="Цена"
                  inputMode="decimal"
                  className={clsx(inputCls, "flex-1")}
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="rounded-lg border border-[#1C2640] bg-[#080F1C] px-2 py-2 text-xs text-[#B0C4DE] focus:border-[#F59E0B]/40 focus:outline-none"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.value}</option>
                  ))}
                </select>
              </div>
            </Field>
          </div>

          {/* 4. Commission */}
          <Field label="Комиссия (необязательно)" error={errors.commission}>
            <input
              type="number"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              min="0"
              step="any"
              placeholder="0.00"
              inputMode="decimal"
              className={inputCls}
            />
          </Field>

          {/* 5. Notes */}
          <Field label="Примечание (необязательно)" error={errors.notes}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Добавить примечание…"
              rows={2}
              maxLength={500}
              className={clsx(
                inputCls,
                "resize-none",
                notes.length > 480 && "border-[#F59E0B]/50",
              )}
            />
            {notes.length > 400 && (
              <p className="fm text-right text-xs text-[#3E5070]">{notes.length}/500</p>
            )}
          </Field>

          {/* Sell warning */}
          {sellWarn && (
            <div className="rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-4 py-3 text-sm text-[#F59E0B]">
              {selectedAsset?.portfolioAssetId
                ? `⚠ Недостаточно единиц: в портфеле ${unitsHeld} шт., продаёте ${qtyNum}.`
                : "⚠ Этот актив не найден в вашем портфеле."}
            </div>
          )}

          {/* Live total */}
          {qtyNum > 0 && priceNum > 0 && (
            <div className="rounded-xl border border-[#1C2640] bg-[#080F1C] p-4 space-y-2 text-sm">
              <p className="fm text-xs font-semibold uppercase tracking-wider text-[#4E6080] mb-2">Итого</p>
              <div className="flex justify-between text-[#4E6080]">
                <span>
                  {currSym}{priceNum.toFixed(2)} × {qtyNum}
                </span>
                <span className="fm tabular-nums text-[#E8F0FF]">
                  {currSym}{subtotal.toFixed(2)}
                </span>
              </div>
              {commNum > 0 && (
                <div className="flex justify-between text-[#4E6080]">
                  <span>Комиссия</span>
                  <span className={clsx("fm tabular-nums", operation === "buy" ? "text-[#F87171]" : "text-[#4ADE80]")}>
                    {operation === "buy" ? "+" : "−"}{currSym}{commNum.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t border-[#1C2640] pt-2">
                <span className="text-[#B0C4DE]">
                  {operation === "buy" ? "Стоимость покупки" : "Чистая выручка"}
                </span>
                <span className="fm tabular-nums text-[#E8F0FF] font-bold">
                  {currSym}{total.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="order-last sm:order-first rounded-lg px-4 py-2.5 text-sm font-medium text-[#4E6080] hover:bg-[#1C2640] hover:text-[#E8F0FF] transition-colors"
            >
              Отменить
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              className="rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-5 py-2.5 text-sm font-semibold text-[#F59E0B] hover:bg-[#F59E0B]/20 transition-colors"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              className="rounded-lg bg-[#F59E0B] px-5 py-2.5 text-sm font-bold text-[#0B1120] hover:bg-[#FCD34D] transition-colors"
            >
              Сохранить и добавить ещё
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
