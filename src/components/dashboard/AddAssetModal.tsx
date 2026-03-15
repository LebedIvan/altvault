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
  { value: "trading_cards",   label: "Торговые карточки" },
  { value: "lego",            label: "LEGO" },
  { value: "cs2_skins",       label: "CS2 скины" },
  { value: "music_royalties", label: "Музыкальные роялти" },
  { value: "p2p_lending",     label: "P2P кредитование" },
  { value: "domain_names",    label: "Домены" },
  { value: "anime_cels",      label: "Аниме целлы" },
  { value: "commodities",     label: "Сырьевые товары" },
  { value: "sports_betting",  label: "Ставки" },
];

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
      <label className="text-xs font-medium text-slate-400">{label}</label>
      {children}
      {hint  && <p className="text-xs text-slate-600">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

const inputCls =
  "rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white " +
  "placeholder-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

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
    return (data.suggestions ?? []).map((s) => ({
      label:      s.name,
      value:      s.name,
      externalId: s.name,
      priceCents: s.priceCents,
      meta:       s.type,
      iconUrl:    s.iconUrl,
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

  function set(key: keyof FormValues, value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "assetClass") {
        const rate = DEFAULT_PLATFORM_FEE_RATES[value] ?? 0.1;
        next.platformFeeRate = String(Math.round(rate * 100));
        next.name = "";
        next.externalId = "";
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  // Called when user picks a suggestion
  const handleSuggestionSelect = useCallback(
    (suggestion: Suggestion) => {
      setForm((prev) => ({
        ...prev,
        name:              suggestion.value,
        externalId:        suggestion.externalId ?? prev.externalId,
        currentPriceCents:
          suggestion.priceCents != null
            ? (suggestion.priceCents / 100).toFixed(2)
            : prev.currentPriceCents,
        // Pre-fill buy price too if empty
        buyPrice:
          prev.buyPrice === "" && suggestion.priceCents != null
            ? (suggestion.priceCents / 100).toFixed(2)
            : prev.buyPrice,
      }));
      setErrors((prev) => ({
        ...prev,
        name: undefined,
        currentPriceCents: undefined,
      }));
    },
    [],
  );

  // Determine suggestion source
  const staticSuggestions =
    form.assetClass !== "cs2_skins"
      ? getStaticSuggestions(form.assetClass)
      : undefined;

  const fetchSuggestions =
    form.assetClass === "cs2_skins" ? fetchSteamSuggestions : undefined;

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

  const isCS2 = form.assetClass === "cs2_skins";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-700 bg-[#0d1117] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-[#0d1117] px-6 py-4">
          <h2 className="text-base font-bold text-white">Добавить актив</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">

          {/* ── Asset class + currency ── */}
          <div className="grid grid-cols-2 gap-3">
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

          {/* ── Name with autocomplete ── */}
          <Field
            label={
              isCS2
                ? "Название предмета (Steam Market)"
                : "Название актива"
            }
            error={errors.name}
            hint={
              isCS2
                ? "Поиск в реальном времени через Steam Market"
                : staticSuggestions && staticSuggestions.length > 0
                  ? "Начните вводить — появятся подсказки"
                  : undefined
            }
          >
            <AutocompleteInput
              value={form.name}
              onChange={(v) => set("name", v)}
              onSelect={handleSuggestionSelect}
              suggestions={staticSuggestions}
              fetchSuggestions={fetchSuggestions}
              placeholder={
                isCS2
                  ? "AK-47 | Redline (Field-Tested)..."
                  : "Начните вводить название..."
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

          {/* ── Condition + Grade (only for cards/collectibles) ── */}
          {(form.assetClass === "trading_cards" ||
            form.assetClass === "anime_cels" ||
            form.assetClass === "lego") && (
            <div className="grid grid-cols-2 gap-3">
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
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Рыночная цена & параметры
            </p>
            <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Сделка покупки
            </p>
            <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-6 py-2 text-sm font-semibold text-white hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
];
