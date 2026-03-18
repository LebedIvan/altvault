"use client";

import { useState, useMemo } from "react";
import { clsx } from "clsx";
import { usePortfolio } from "@/store/portfolioStore";
import { AutocompleteInput, type Suggestion } from "@/components/ui/AutocompleteInput";
import type { Asset } from "@/types/asset";
import { formatCents } from "@/lib/formatters";

const inputCls =
  "rounded-lg border border-[#1C2640] bg-[#080F1C] px-3 py-2 text-sm text-[#E8F0FF] " +
  "placeholder-[#2A3A50] focus:border-[#F87171]/50 focus:outline-none focus:ring-1 focus:ring-[#F87171]/30";

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
      <label className="fm text-xs font-medium text-[#4E6080]">{label}</label>
      {children}
      {hint  && <p className="fm text-xs text-[#2A3A50]">{hint}</p>}
      {error && <p className="fm text-xs text-[#F87171]">{error}</p>}
    </div>
  );
}

function euros(str: string): number {
  return Math.round(parseFloat(str.replace(",", ".")) * 100);
}

const PLATFORM_SUGGESTIONS: Suggestion[] = [
  { label: "eBay",              value: "eBay"              },
  { label: "Steam Market",      value: "Steam Market"      },
  { label: "TCGPlayer",         value: "TCGPlayer"         },
  { label: "Cardmarket",        value: "Cardmarket"        },
  { label: "Bricklink",         value: "Bricklink"         },
  { label: "Heritage Auctions", value: "Heritage Auctions" },
  { label: "Royalty Exchange",  value: "Royalty Exchange"  },
  { label: "Skinport",          value: "Skinport"          },
  { label: "DMarket",           value: "DMarket"           },
];

interface Props {
  asset: Asset;
  onClose: () => void;
}

export function SellAssetModal({ asset, onClose }: Props) {
  const { addTransaction } = usePortfolio();

  // Compute available units from transactions
  const unitsHeld = useMemo(() => {
    let held = 0;
    for (const tx of asset.transactions) {
      if (tx.type === "buy")  held += tx.quantity;
      if (tx.type === "sell") held -= tx.quantity;
    }
    return Math.max(0, held);
  }, [asset.transactions]);

  const [qty,      setQty]      = useState(String(unitsHeld));
  const [price,    setPrice]    = useState(
    (asset.currentPriceCents / 100).toFixed(2),
  );
  const [fee,      setFee]      = useState(
    (asset.currentPriceCents * asset.platformFeeRate / 100).toFixed(2),
  );
  const [date,     setDate]     = useState(new Date().toISOString().slice(0, 10));
  const [platform, setPlatform] = useState("");
  const [errors,   setErrors]   = useState<Record<string, string>>({});

  // Live summary
  const qtyNum      = parseFloat(qty.replace(",", ".")) || 0;
  const priceNum    = parseFloat(price.replace(",", ".")) || 0;
  const feeNum      = parseFloat(fee.replace(",", ".")) || 0;
  const grossCents  = Math.round(qtyNum * priceNum * 100);
  const feeCents    = Math.round(feeNum * 100);
  const netCents    = grossCents - feeCents;

  // Avg buy price for realized P&L preview
  const buys = asset.transactions.filter((t) => t.type === "buy");
  const totalBuyUnits = buys.reduce((s, t) => s + t.quantity, 0);
  const totalBuyCents = buys.reduce(
    (s, t) => s + t.pricePerUnitCents * t.quantity + t.feeCents + t.otherCostsCents,
    0,
  );
  const avgBuyCentsPerUnit = totalBuyUnits > 0 ? totalBuyCents / totalBuyUnits : 0;
  const costBasis = Math.round(qtyNum * avgBuyCentsPerUnit);
  const realizedPnL = netCents - costBasis;

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!qtyNum || qtyNum <= 0)           errs.qty      = "Укажите количество";
    if (qtyNum > unitsHeld)               errs.qty      = `Максимум ${unitsHeld} шт.`;
    if (!priceNum || priceNum <= 0)       errs.price    = "Укажите цену продажи";
    if (!date)                            errs.date     = "Укажите дату";
    if (!platform.trim())                 errs.platform = "Укажите платформу";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    addTransaction(asset.id, {
      id:                crypto.randomUUID(),
      assetId:           asset.id,
      type:              "sell",
      pricePerUnitCents: euros(price),
      quantity:          qtyNum,
      currency:          asset.currency,
      feeCents:          euros(fee || "0"),
      otherCostsCents:   0,
      date:              new Date(date),
      platform,
    });

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl border border-[#1C2640] bg-[#0B1120] shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#1C2640] bg-[#0B1120] px-6 py-4">
          <div>
            <h2 className="fb text-base font-bold text-[#E8F0FF]">Продать актив</h2>
            <p className="fm text-xs text-[#4E6080] truncate max-w-xs mt-0.5">{asset.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#4E6080] hover:bg-[#1C2640] hover:text-[#E8F0FF]"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">

          {/* Asset summary */}
          <div className="rounded-xl border border-[#1C2640] bg-[#080F1C] p-4 grid grid-cols-3 gap-3 text-center text-xs">
            <div>
              <p className="fm text-[#4E6080] mb-0.5">В наличии</p>
              <p className="fb font-bold text-[#E8F0FF] text-sm">{unitsHeld} шт.</p>
            </div>
            <div>
              <p className="fm text-[#4E6080] mb-0.5">Тек. цена</p>
              <p className="fb font-bold text-[#E8F0FF] text-sm">
                {formatCents(asset.currentPriceCents, asset.currency)}
              </p>
            </div>
            <div>
              <p className="fm text-[#4E6080] mb-0.5">Ср. покупка</p>
              <p className="fb font-bold text-[#E8F0FF] text-sm">
                {formatCents(avgBuyCentsPerUnit, asset.currency)}
              </p>
            </div>
          </div>

          {/* Qty + price */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Количество" error={errors.qty}>
              <input
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                type="number"
                min="0.001"
                max={unitsHeld}
                step="any"
                placeholder="1"
                className={inputCls}
              />
            </Field>
            <Field label="Цена продажи (1 шт.)" error={errors.price}>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className={inputCls}
              />
            </Field>
          </div>

          {/* Fee + date */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Комиссия платформы" hint={`${(asset.platformFeeRate * 100).toFixed(1)}% по умолчанию`}>
              <input
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="0.00"
                className={inputCls}
              />
            </Field>
            <Field label="Дата продажи" error={errors.date}>
              <input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                type="date"
                className={clsx(inputCls, "text-[#B0C4DE]")}
              />
            </Field>
          </div>

          {/* Platform */}
          <Field label="Платформа" error={errors.platform}>
            <AutocompleteInput
              value={platform}
              onChange={setPlatform}
              onSelect={(s) => setPlatform(s.value)}
              suggestions={PLATFORM_SUGGESTIONS}
              placeholder="eBay, Steam Market, Cardmarket..."
            />
          </Field>

          {/* Summary */}
          {qtyNum > 0 && priceNum > 0 && (
            <div className="rounded-xl border border-[#1C2640] bg-[#080F1C] p-4 space-y-2 text-sm">
              <p className="fm text-xs font-semibold uppercase tracking-wider text-[#4E6080] mb-2">
                Итого
              </p>
              <div className="flex justify-between text-[#4E6080]">
                <span>Валовая выручка</span>
                <span className="fm tabular-nums text-[#E8F0FF]">{formatCents(grossCents, asset.currency)}</span>
              </div>
              <div className="flex justify-between text-[#4E6080]">
                <span>Комиссия</span>
                <span className="fm tabular-nums text-[#F87171]">−{formatCents(feeCents, asset.currency)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-[#1C2640] pt-2">
                <span className="text-[#B0C4DE]">Чистая выручка</span>
                <span className="fm tabular-nums text-[#E8F0FF]">{formatCents(netCents, asset.currency)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-[#B0C4DE]">Реализ. P&L</span>
                <span className={clsx(
                  "fm tabular-nums font-bold",
                  realizedPnL >= 0 ? "text-[#4ADE80]" : "text-[#F87171]",
                )}>
                  {realizedPnL >= 0 ? "+" : ""}{formatCents(realizedPnL, asset.currency)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-[#4E6080] hover:bg-[#1C2640] hover:text-[#E8F0FF]"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={unitsHeld === 0}
              className="rounded-lg bg-[#F87171] px-6 py-2 text-sm font-semibold text-[#0B1120] hover:bg-[#FCA5A5] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Записать продажу
            </button>
          </div>

          {unitsHeld === 0 && (
            <p className="fm text-center text-xs text-[#2A3A50]">Нет доступных единиц для продажи</p>
          )}
        </form>
      </div>
    </div>
  );
}
