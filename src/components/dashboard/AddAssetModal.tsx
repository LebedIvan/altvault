"use client";

import { useState, useCallback } from "react";
import { z } from "zod";
import { clsx } from "clsx";
import { usePortfolio } from "@/store/portfolioStore";
import { AutocompleteInput, type Suggestion } from "@/components/ui/AutocompleteInput";
import { getStaticSuggestions } from "@/data/suggestions";
import type { AssetClass, Currency, Condition } from "@/types/asset";
import { DEFAULT_PLATFORM_FEE_RATES } from "@/constants/fees";

// ─── Form schema ──────────────────────────────────────────────────────────────

const FormSchema = z.object({
  name:              z.string().min(1, "Название обязательно"),
  assetClass:        z.string().min(1),
  externalId:        z.string().optional(),
  condition:         z.string().optional(),
  grade:             z.string().optional(),
  currency:          z.enum(["EUR", "USD", "GBP"]),
  currentPriceCents: z.string().min(1, "Цена обязательна"),
  liquidityDays:     z.string().min(1),
  riskScore:         z.string().min(1),
  platformFeeRate:   z.string().min(1),
  buyPrice:          z.string().min(1, "Цена покупки обязательна"),
  buyQty:            z.string().min(1),
  buyFee:            z.string(),
  buyDate:           z.string().min(1, "Дата обязательна"),
  buyPlatform:       z.string().min(1, "Платформа обязательна"),
});

type FormValues = z.infer<typeof FormSchema>;

const ASSET_CLASSES: { value: AssetClass; label: string }[] = [
  { value: "trading_cards",           label: "Покемон / MTG карточки"    },
  { value: "basketball_cards",        label: "🏀 Баскетбол карточки"      },
  { value: "football_cards",          label: "⚽ Футбол карточки"          },
  { value: "hockey_cards",            label: "🏒 Хоккей карточки"          },
  { value: "american_football_cards", label: "🏈 Американский футбол"      },
  { value: "comics",                  label: "📚 Комиксы"                  },
  { value: "lego",                    label: "LEGO"                       },
  { value: "cs2_skins",              label: "CS2 скины"                  },
  { value: "music_royalties",         label: "Музыкальные роялти"         },
  { value: "p2p_lending",             label: "P2P кредитование"           },
  { value: "domain_names",            label: "Домены"                     },
  { value: "anime_cels",              label: "Аниме целлы"                },
  { value: "commodities",             label: "Сырьевые товары"            },
  { value: "sports_betting",          label: "Ставки"                     },
  { value: "games_tech",              label: "Игры & Техника"              },
];

const SPORTS_CARD_CLASSES: AssetClass[] = [
  "basketball_cards",
  "football_cards",
  "hockey_cards",
  "american_football_cards",
];

const SPORTS_CARD_TO_PARAM: Record<string, string> = {
  basketball_cards:        "basketball",
  football_cards:          "football",
  hockey_cards:            "hockey",
  american_football_cards: "american_football",
};

const CONDITIONS: { value: Condition; label: string }[] = [
  { value: "mint",      label: "Mint"      },
  { value: "near_mint", label: "Near Mint" },
  { value: "excellent", label: "Excellent" },
  { value: "good",      label: "Good"      },
  { value: "fair",      label: "Fair"      },
  { value: "poor",      label: "Poor"      },
];

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: "EUR", label: "EUR €" },
  { value: "USD", label: "USD $" },
  { value: "GBP", label: "GBP £" },
];

function euros(str: string): number {
  return Math.round(parseFloat(str.replace(",", ".")) * 100);
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="fm text-xs font-medium text-[#4E6080] uppercase tracking-wider">{label}</label>
      {children}
      {hint  && <p className="fm text-xs text-[#2A3A50]">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

const inputCls =
  "rounded-lg border border-[#1C2640] bg-[#080F1C] px-3 py-2 text-sm text-[#E8F0FF] " +
  "placeholder-[#2A3A50] focus:border-[#F59E0B]/40 focus:outline-none focus:ring-1 focus:ring-[#F59E0B]/20";

// ─── Steam live search ────────────────────────────────────────────────────────

async function fetchSteamSuggestions(query: string): Promise<Suggestion[]> {
  if (query.length < 2) return [];
  try {
    const res = await fetch(`/api/search/steam?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      suggestions: {
        name: string;
        price: string | null;
        priceCents: number | null;
        type: string;
        iconUrl: string | null;
      }[];
    };
    return (data.suggestions ?? []).map((s) => {
      const base: Suggestion = {
        label:      s.name,
        value:      s.name,
        externalId: s.name,
        priceCents: s.priceCents,
        meta:       s.type,
        iconUrl:    s.iconUrl,
      };
      if (s.iconUrl) base.imageUrl = s.iconUrl;
      return base;
    });
  } catch {
    return [];
  }
}

async function fetchPokemonSuggestions(query: string): Promise<Suggestion[]> {
  if (query.length < 2) return [];
  try {
    const res = await fetch(`/api/search/pokemon?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      suggestions: {
        id: string;
        name: string;
        fullName: string;
        set: string;
        rarity: string | null;
        imageSmall: string;
        imageLarge: string;
        priceCents: number | null;
        currency: string;
        foilTypes: string | null;
      }[];
    };
    return (data.suggestions ?? []).map((s) => ({
      label:            s.fullName,
      value:            s.fullName,
      externalId:       s.id,
      priceCents:       s.priceCents,
      meta:             [s.set, s.rarity, s.foilTypes].filter(Boolean).join(" · "),
      iconUrl:          s.imageSmall,
      imageUrl:         s.imageLarge,
      imageThumbnailUrl:s.imageSmall,
      currency:         s.currency,
    }));
  } catch {
    return [];
  }
}

async function fetchMtgSuggestions(query: string): Promise<Suggestion[]> {
  if (query.length < 2) return [];
  try {
    const res = await fetch(`/api/search/mtg?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      suggestions: {
        id: string;
        fullName: string;
        setName: string;
        rarity: string;
        imageSmall: string | null;
        imageLarge: string | null;
        priceCents: number | null;
        currency: string;
      }[];
    };
    return (data.suggestions ?? []).map((s) => ({
      label:            s.fullName,
      value:            s.fullName,
      externalId:       s.id,
      priceCents:       s.priceCents,
      meta:             [s.setName, s.rarity].filter(Boolean).join(" · "),
      iconUrl:          s.imageSmall ?? undefined,
      imageUrl:         s.imageLarge ?? undefined,
      imageThumbnailUrl:s.imageSmall ?? undefined,
      currency:         s.currency,
    }));
  } catch {
    return [];
  }
}

function makeSportsCardsFetcher(sport: string) {
  return async function fetchSportsCardSuggestions(query: string): Promise<Suggestion[]> {
    if (query.length < 2) return [];
    try {
      const res = await fetch(
        `/api/search/sports-cards?q=${encodeURIComponent(query)}&sport=${encodeURIComponent(sport)}`,
      );
      if (!res.ok) return [];
      const data = (await res.json()) as {
        suggestions: {
          id: string;
          name: string;
          fullName: string;
          set: string;
          rarity: string | null;
          imageSmall: string | null;
          imageLarge: string | null;
          priceCents: number | null;
          currency: string;
        }[];
      };
      return (data.suggestions ?? []).map((s) => ({
        label:            s.fullName,
        value:            s.fullName,
        externalId:       s.id,
        priceCents:       s.priceCents,
        meta:             [s.set, s.rarity].filter(Boolean).join(" · "),
        iconUrl:          s.imageSmall ?? undefined,
        imageUrl:         s.imageLarge ?? undefined,
        imageThumbnailUrl:s.imageSmall ?? undefined,
        currency:         s.currency ?? "USD",
      }));
    } catch {
      return [];
    }
  };
}

async function fetchLegoSuggestions(query: string): Promise<Suggestion[]> {
  if (query.length < 1) return [];
  try {
    const res = await fetch(`/api/search/lego?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      suggestions: {
        id: string;
        name: string;
        fullName: string;
        theme: string;
        year: number | null;
        pieces: number | null;
        imageSmall: string | null;
        imageLarge: string | null;
        priceCents: number | null;
        currency: string;
      }[];
    };
    return (data.suggestions ?? []).map((s) => ({
      label:            s.fullName,
      value:            s.fullName,
      externalId:       s.id,
      priceCents:       s.priceCents,
      meta:             [s.theme, s.pieces ? `${s.pieces} дет.` : null].filter(Boolean).join(" · "),
      iconUrl:          s.imageSmall ?? undefined,
      imageUrl:         s.imageLarge ?? undefined,
      imageThumbnailUrl:s.imageSmall ?? undefined,
      currency:         s.currency ?? "GBP",
    }));
  } catch {
    return [];
  }
}

async function fetchComicsSuggestions(query: string): Promise<Suggestion[]> {
  if (query.length < 2) return [];
  try {
    const res = await fetch(`/api/search/comics?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      suggestions: {
        id: string;
        name: string;
        fullName: string;
        set: string;
        rarity: string | null;
        imageSmall: string | null;
        imageLarge: string | null;
        priceCents: number | null;
        currency: string;
      }[];
    };
    return (data.suggestions ?? []).map((s) => ({
      label:            s.fullName,
      value:            s.fullName,
      externalId:       s.id,
      priceCents:       s.priceCents,
      meta:             [s.set, s.rarity].filter(Boolean).join(" · "),
      iconUrl:          s.imageSmall ?? undefined,
      imageUrl:         s.imageLarge ?? undefined,
      imageThumbnailUrl:s.imageSmall ?? undefined,
      currency:         s.currency ?? "USD",
    }));
  } catch {
    return [];
  }
}

async function fetchGamesTechSuggestions(query: string): Promise<Suggestion[]> {
  if (query.length < 2) return [];
  try {
    const res = await fetch(`/api/search/games-tech?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      suggestions: {
        id: string;
        fullName: string;
        platform: string;
        loosePriceCents: number | null;
        cibPriceCents: number | null;
        newPriceCents: number | null;
        priceCents: number | null;
        currency: string;
      }[];
    };
    return (data.suggestions ?? []).map((s) => ({
      label:           s.fullName,
      value:           s.fullName,
      externalId:      s.id,
      priceCents:      s.loosePriceCents ?? s.priceCents,
      loosePriceCents: s.loosePriceCents,
      cibPriceCents:   s.cibPriceCents,
      newPriceCents:   s.newPriceCents,
      meta:            s.platform,
      currency:        s.currency ?? "USD",
      iconUrl:         null,
    }));
  } catch {
    return [];
  }
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

const DEFAULT_FORM: FormValues = {
  name:              "",
  assetClass:        "trading_cards",
  externalId:        "",
  condition:         "",
  grade:             "",
  currency:          "EUR",
  currentPriceCents: "",
  liquidityDays:     "30",
  riskScore:         "50",
  platformFeeRate:   "10",
  buyPrice:          "",
  buyQty:            "1",
  buyFee:            "0",
  buyDate:           new Date().toISOString().slice(0, 10),
  buyPlatform:       "",
};

export function AddAssetModal({ onClose }: Props) {
  const { addAsset } = usePortfolio();
  const [form, setForm] = useState<FormValues>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [imageThumbnailUrl, setImageThumbnailUrl] = useState<string | undefined>();
  // Games & Tech: stores loose/CIB/new prices for condition-aware pricing
  const [gamesPrices, setGamesPrices] = useState<{ loose: number | null; cib: number | null; newP: number | null } | null>(null);

  function set(key: keyof FormValues, value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "assetClass") {
        const rate = DEFAULT_PLATFORM_FEE_RATES[value] ?? 0.1;
        next.platformFeeRate = String(Math.round(rate * 100));
        next.name = "";
        next.externalId = "";
        setImageUrl(undefined);
        setImageThumbnailUrl(undefined);
        setGamesPrices(null);
      }
      // Games & Tech: update price when condition changes
      if (key === "condition" && prev.assetClass === "games_tech" && gamesPrices) {
        const priceMap: Record<string, number | null> = {
          fair:      gamesPrices.loose,
          near_mint: gamesPrices.cib,
          mint:      gamesPrices.newP,
        };
        const mapped = priceMap[value] ?? null;
        if (mapped != null) next.currentPriceCents = (mapped / 100).toFixed(2);
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  // Called when user picks a suggestion
  const handleSuggestionSelect = useCallback(
    (suggestion: Suggestion) => {
      // Games & Tech: condition-aware pricing
      const isGamesTech = suggestion.loosePriceCents !== undefined || suggestion.cibPriceCents !== undefined;
      if (isGamesTech) {
        const gp = {
          loose: suggestion.loosePriceCents ?? null,
          cib:   suggestion.cibPriceCents   ?? null,
          newP:  suggestion.newPriceCents   ?? null,
        };
        setGamesPrices(gp);
        setForm((prev) => ({
          ...prev,
          name:              suggestion.value,
          externalId:        suggestion.externalId ?? prev.externalId,
          currency:          (suggestion.currency as "EUR" | "USD" | "GBP") ?? "USD",
          currentPriceCents: gp.loose != null ? (gp.loose / 100).toFixed(2) : prev.currentPriceCents,
          buyPrice:          prev.buyPrice === "" && gp.loose != null ? (gp.loose / 100).toFixed(2) : prev.buyPrice,
          condition:         "fair",
          liquidityDays:     "14",
          riskScore:         "45",
        }));
        setErrors((prev) => ({ ...prev, name: undefined, currentPriceCents: undefined }));
        return;
      }

      setForm((prev) => {
        const isLegoClass = prev.assetClass === "lego";
        return {
          ...prev,
          name:              suggestion.value,
          externalId:        suggestion.externalId ?? prev.externalId,
          currency:          (suggestion.currency as "EUR" | "USD" | "GBP") ?? prev.currency,
          currentPriceCents:
            suggestion.priceCents != null
              ? (suggestion.priceCents / 100).toFixed(2)
              : prev.currentPriceCents,
          buyPrice:
            prev.buyPrice === "" && suggestion.priceCents != null
              ? (suggestion.priceCents / 100).toFixed(2)
              : prev.buyPrice,
          ...(isLegoClass && { liquidityDays: "45", riskScore: "30" }),
        };
      });
      if (suggestion.imageUrl)          setImageUrl(suggestion.imageUrl);
      if (suggestion.imageThumbnailUrl) setImageThumbnailUrl(suggestion.imageThumbnailUrl);
      setErrors((prev) => ({ ...prev, name: undefined, currentPriceCents: undefined }));
    },
    [gamesPrices],
  );

  // Live search vs static suggestions per asset class
  const isSportsCard  = SPORTS_CARD_CLASSES.includes(form.assetClass as AssetClass);
  const isComics      = form.assetClass === "comics";
  const isLego        = form.assetClass === "lego";
  const isGamesTech   = form.assetClass === "games_tech";
  const useLiveSearch = ["cs2_skins", "trading_cards"].includes(form.assetClass)
    || isSportsCard
    || isComics
    || isLego
    || isGamesTech;

  const staticSuggestions = useLiveSearch
    ? undefined
    : getStaticSuggestions(form.assetClass);

  const fetchSuggestions = useLiveSearch
    ? form.assetClass === "cs2_skins"
      ? fetchSteamSuggestions
      : isSportsCard
        ? makeSportsCardsFetcher(SPORTS_CARD_TO_PARAM[form.assetClass] ?? "basketball")
        : isComics
          ? fetchComicsSuggestions
          : isLego
            ? fetchLegoSuggestions
            : isGamesTech
              ? fetchGamesTechSuggestions
              : fetchPokemonSuggestions   // default trading_cards → Pokemon
    : undefined;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = FormSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormValues;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    const v = parsed.data;
    const assetId = crypto.randomUUID();

    addAsset({
      id:                assetId,
      name:              v.name,
      assetClass:        v.assetClass as AssetClass,
      externalId:        v.externalId ?? undefined,
      condition:         (v.condition as Condition) || undefined,
      grade:             v.grade ? parseFloat(v.grade) : undefined,
      currency:          v.currency,
      currentPriceCents: euros(v.currentPriceCents),
      liquidityDays:     parseInt(v.liquidityDays),
      riskScore:         parseInt(v.riskScore),
      platformFeeRate:   parseFloat(v.platformFeeRate) / 100,
      holdingCostCents:  0,
      tags:              [],
      priceSnapshots:    [],
      imageUrl:          imageUrl,
      imageThumbnailUrl: imageThumbnailUrl,
      loosePriceCents:   gamesPrices?.loose ?? undefined,
      cibPriceCents:     gamesPrices?.cib   ?? undefined,
      createdAt:         new Date(),
      updatedAt:         new Date(),
      transactions: [
        {
          id:                crypto.randomUUID(),
          assetId,
          type:              "buy",
          pricePerUnitCents: euros(v.buyPrice),
          quantity:          parseFloat(v.buyQty.replace(",", ".")),
          currency:          v.currency,
          feeCents:          euros(v.buyFee || "0"),
          otherCostsCents:   0,
          date:              new Date(v.buyDate),
          platform:          v.buyPlatform,
        },
      ],
    });

    onClose();
  }

  const isCS2      = form.assetClass === "cs2_skins";
  const isCards    = form.assetClass === "trading_cards";
  const isGamesModal = form.assetClass === "games_tech";

  // For trading_cards, user can toggle between Pokemon and MTG live search
  const [cardSearchMode, setCardSearchMode] = useState<"pokemon" | "mtg">("pokemon");
  const activeFetchSuggestions = isCards
    ? (cardSearchMode === "pokemon" ? fetchPokemonSuggestions : fetchMtgSuggestions)
    : fetchSuggestions;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4">
      <div className="relative w-full max-w-lg max-h-[95vh] sm:max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[#1C2640] bg-[#0B1120] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#1C2640] bg-[#0B1120] px-4 sm:px-6 py-3 sm:py-4">
          <h2 className="fb text-base font-bold text-[#E8F0FF]">Добавить актив</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#3E5070] hover:bg-[#0E1830] hover:text-[#E8F0FF] transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-6">

          {/* ── Asset class + currency ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Класс актива">
              <select
                value={form.assetClass}
                onChange={(e) => set("assetClass", e.target.value)}
                className={inputCls}
              >
                {ASSET_CLASSES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Валюта">
              <select
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
                className={inputCls}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* ── Card search mode toggle (Pokemon vs MTG) ── */}
          {isCards && (
            <div className="flex items-center gap-1 rounded-lg bg-[#080F1C] p-1 w-fit border border-[#1C2640]">
              {(["pokemon", "mtg"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setCardSearchMode(mode);
                    set("name", "");
                    setImageUrl(undefined);
                    setImageThumbnailUrl(undefined);
                  }}
                  className={clsx(
                    "fm rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                    cardSearchMode === mode
                      ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/25"
                      : "text-[#4E6080] hover:text-[#B0C4DE]",
                  )}
                >
                  {mode === "pokemon" ? "🃏 Pokémon" : "🧙 MTG"}
                </button>
              ))}
            </div>
          )}

          {/* ── Card image preview ── */}
          {imageUrl && (
            <div className="flex items-center gap-4 rounded-xl border border-[#1C2640] bg-[#080F1C] p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Preview"
                className="h-28 w-auto rounded-lg object-contain shadow-lg"
              />
              <div className="flex-1 min-w-0">
                <p className="fb text-sm font-medium text-[#E8F0FF] truncate">{form.name}</p>
                {form.externalId && (
                  <p className="fm text-xs text-[#4E6080]">{form.externalId}</p>
                )}
                <button
                  type="button"
                  onClick={() => { setImageUrl(undefined); setImageThumbnailUrl(undefined); }}
                  className="fm mt-1 text-xs text-[#F87171] hover:text-[#F87171]/80 transition-colors"
                >
                  Убрать картинку
                </button>
              </div>
            </div>
          )}

          {/* ── Name with autocomplete ── */}
          <Field
            label={
              isCS2         ? "Название предмета (Steam Market)" :
              isCards       ? (cardSearchMode === "pokemon" ? "Поиск Pokémon карточки" : "Поиск MTG карточки") :
              isSportsCard  ? "Поиск спортивной карточки" :
              isComics      ? "Поиск комикса" :
              isLego        ? "Поиск набора LEGO" :
              isGamesModal  ? "Поиск игры или консоли" :
              "Название актива"
            }
            error={errors.name}
            hint={
              isCS2         ? "Живой поиск через Steam Market" :
              isCards       ? "Живой поиск — появятся картинки и цены" :
              isSportsCard  ? "Живой поиск по игроку или карточке" :
              isComics      ? "Поиск по названию комикса или персонажу" :
              isLego        ? "Поиск по названию, номеру набора или теме" :
              isGamesModal  ? "PriceCharting + eBay, 25 популярных игр в fallback" :
              staticSuggestions && staticSuggestions.length > 0 ? "Начните вводить — появятся подсказки" :
              undefined
            }
          >
            <AutocompleteInput
              value={form.name}
              onChange={(v) => set("name", v)}
              onSelect={handleSuggestionSelect}
              suggestions={staticSuggestions}
              fetchSuggestions={activeFetchSuggestions}
              debounceMs={isCards || isCS2 || isSportsCard || isComics || isLego || isGamesModal ? 500 : 300}
              placeholder={
                isCS2         ? "AK-47 | Redline (Field-Tested)..." :
                isCards && cardSearchMode === "pokemon" ? "Charizard, Pikachu, Lugia..." :
                isCards       ? "Black Lotus, Lightning Bolt..." :
                isSportsCard  ? "LeBron James RC, Ronaldo 2003, Gretzky..." :
                isComics      ? "Amazing Fantasy #15, Batman #1..." :
                isLego        ? "Eiffel Tower, 10307, Icons..." :
                isGamesModal  ? "Chibi-Robo, PS2 Slim, Pokemon Platinum..." :
                "Начните вводить название..."
              }
            />
          </Field>

          {/* ── External ID ── */}
          <Field
            label="External ID"
            hint={
              isCS2
                ? "Заполняется автоматически из поиска"
                : "PSA номер, номер сета LEGO, тикер и т.д."
            }
          >
            <input
              value={form.externalId}
              onChange={(e) => set("externalId", e.target.value)}
              placeholder={isCS2 ? "Заполнится из поиска" : "10307, PSA-12345..."}
              className={clsx(inputCls, "text-slate-400")}
            />
          </Field>

          {/* ── Games & Tech condition (Loose / CIB / Sealed) ── */}
          {isGamesModal && (
            <Field label="Состояние">
              <div className="flex items-center gap-1 rounded-lg bg-[#080F1C] p-1 border border-[#1C2640]">
                {([
                  { value: "fair",      label: "Loose",  price: gamesPrices?.loose },
                  { value: "near_mint", label: "CIB",    price: gamesPrices?.cib   },
                  { value: "mint",      label: "Sealed",  price: gamesPrices?.newP  },
                ] as const).map(({ value, label, price }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set("condition", value)}
                    className={clsx(
                      "fm flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors",
                      form.condition === value
                        ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/25"
                        : "text-[#4E6080] hover:text-[#B0C4DE]",
                    )}
                  >
                    {label}
                    {price != null && (
                      <span className="ml-1 font-mono text-[10px] opacity-70">
                        ${(price / 100).toFixed(0)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </Field>
          )}

          {/* ── Condition + Grade (only for cards/collectibles) ── */}
          {!isGamesModal && (form.assetClass === "trading_cards" ||
            form.assetClass === "anime_cels" ||
            form.assetClass === "lego" ||
            form.assetClass === "comics" ||
            SPORTS_CARD_CLASSES.includes(form.assetClass as AssetClass)) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Состояние">
                <select
                  value={form.condition}
                  onChange={(e) => set("condition", e.target.value)}
                  className={inputCls}
                >
                  <option value="">— не указано —</option>
                  {CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Грейд PSA/BGS (1–10)">
                <input
                  value={form.grade}
                  onChange={(e) => set("grade", e.target.value)}
                  placeholder="9"
                  type="number"
                  min="1"
                  max="10"
                  step="0.5"
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          {/* ── Prices & metrics ── */}
          <div className="space-y-3">
            <p className="fm text-xs font-semibold uppercase tracking-wider text-[#2A3A50]">
              Рыночная цена & параметры
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Текущая рыночная цена (1 шт.)"
                error={errors.currentPriceCents}
                hint={isCS2 ? "Заполняется из поиска Steam" : undefined}
              >
                <input
                  value={form.currentPriceCents}
                  onChange={(e) => set("currentPriceCents", e.target.value)}
                  placeholder="150.00"
                  className={inputCls}
                />
              </Field>
              <Field label="Комиссия платформы %">
                <input
                  value={form.platformFeeRate}
                  onChange={(e) => set("platformFeeRate", e.target.value)}
                  placeholder="15"
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Ликвидность (дней до продажи)">
                <input
                  value={form.liquidityDays}
                  onChange={(e) => set("liquidityDays", e.target.value)}
                  type="number"
                  min="1"
                  className={inputCls}
                />
              </Field>
              <Field label="Риск-скор (0–100)">
                <input
                  value={form.riskScore}
                  onChange={(e) => set("riskScore", e.target.value)}
                  type="number"
                  min="0"
                  max="100"
                  className={inputCls}
                />
              </Field>
            </div>
          </div>

          {/* ── Buy transaction ── */}
          <div className="space-y-3">
            <p className="fm text-xs font-semibold uppercase tracking-wider text-[#2A3A50]">
              Сделка покупки
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Цена покупки (1 шт.)" error={errors.buyPrice}>
                <input
                  value={form.buyPrice}
                  onChange={(e) => set("buyPrice", e.target.value)}
                  placeholder="120.00"
                  className={inputCls}
                />
              </Field>
              <Field label="Количество">
                <input
                  value={form.buyQty}
                  onChange={(e) => set("buyQty", e.target.value)}
                  placeholder="1"
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Комиссия при покупке">
                <input
                  value={form.buyFee}
                  onChange={(e) => set("buyFee", e.target.value)}
                  placeholder="0"
                  className={inputCls}
                />
              </Field>
              <Field label="Дата покупки" error={errors.buyDate}>
                <input
                  value={form.buyDate}
                  onChange={(e) => set("buyDate", e.target.value)}
                  type="date"
                  className={clsx(inputCls, "text-slate-300")}
                />
              </Field>
            </div>
            <Field label="Платформа покупки" error={errors.buyPlatform}>
              <AutocompleteInput
                value={form.buyPlatform}
                onChange={(v) => set("buyPlatform", v)}
                onSelect={(s) => set("buyPlatform", s.value)}
                suggestions={PLATFORM_SUGGESTIONS}
                placeholder="eBay, Steam Market, TCGPlayer..."
              />
            </Field>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="fm rounded-lg border border-[#1C2640] px-4 py-2 text-xs font-medium text-[#4E6080] hover:bg-[#0E1830] hover:text-[#E8F0FF] uppercase tracking-wider transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="fm rounded-lg bg-[#F59E0B] px-6 py-2 text-xs font-bold text-[#0B1120] hover:bg-[#FCD34D] uppercase tracking-wider transition-colors"
            >
              Добавить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const PLATFORM_SUGGESTIONS: Suggestion[] = [
  { label: "eBay",             value: "eBay"             },
  { label: "Steam Market",     value: "Steam Market"     },
  { label: "TCGPlayer",        value: "TCGPlayer"        },
  { label: "Cardmarket",       value: "Cardmarket"       },
  { label: "COMC",             value: "COMC"             },
  { label: "PSA",              value: "PSA"              },
  { label: "Sedo",             value: "Sedo"             },
  { label: "Afternic",         value: "Afternic"         },
  { label: "Royalty Exchange", value: "Royalty Exchange" },
  { label: "Mintos",           value: "Mintos"           },
  { label: "Bondora",          value: "Bondora"          },
  { label: "Bricklink",        value: "Bricklink"        },
  { label: "LEGO Store",       value: "LEGO Store"       },
  { label: "Catawiki",         value: "Catawiki"         },
  { label: "Heritage Auctions",value: "Heritage Auctions"},
  { label: "PWC Auctions",     value: "PWC Auctions"     },
  { label: "CeX",              value: "CeX"              },
  { label: "Decluttr",         value: "Decluttr"         },
  { label: "Facebook Marketplace", value: "Facebook Marketplace" },
];
