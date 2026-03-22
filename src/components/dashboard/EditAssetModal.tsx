"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { usePortfolio } from "@/store/portfolioStore";
import type { Asset } from "@/types/asset";

const inputCls =
  "rounded-lg border border-[#1C2640] bg-[#080F1C] px-3 py-2 text-sm text-[#E8F0FF] " +
  "placeholder-[#2A3A50] focus:border-[#F59E0B]/50 focus:outline-none focus:ring-1 focus:ring-[#F59E0B]/30";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="fm text-xs font-medium uppercase tracking-wide text-[#4E6080]">{label}</label>
      {children}
      {hint && <p className="fm text-xs text-[#2A3A50]">{hint}</p>}
    </div>
  );
}

interface Props {
  asset: Asset;
  onClose: () => void;
}

export function EditAssetModal({ asset, onClose }: Props) {
  const { updateAsset } = usePortfolio();

  const [name,           setName]           = useState(asset.name);
  const [externalId,     setExternalId]     = useState(asset.externalId ?? "");
  const [currentPrice,   setCurrentPrice]   = useState((asset.currentPriceCents / 100).toFixed(2));
  const [platformFee,    setPlatformFee]    = useState(String(Math.round(asset.platformFeeRate * 100)));
  const [liquidityDays,  setLiquidityDays]  = useState(String(asset.liquidityDays));
  const [riskScore,      setRiskScore]      = useState(String(asset.riskScore));
  const [currency,       setCurrency]       = useState<"EUR" | "USD" | "GBP">(asset.currency as "EUR" | "USD" | "GBP");
  const [error,          setError]          = useState<string | null>(null);

  function handleSave() {
    const priceVal = parseFloat(currentPrice.replace(",", "."));
    const feeVal   = parseFloat(platformFee);
    const liqVal   = parseInt(liquidityDays);
    const riskVal  = parseInt(riskScore);

    if (!name.trim()) { setError("Название обязательно"); return; }
    if (isNaN(priceVal) || priceVal <= 0) { setError("Неверная цена"); return; }
    if (isNaN(feeVal)   || feeVal < 0 || feeVal > 100) { setError("Неверная комиссия (0–100)"); return; }
    if (isNaN(liqVal)   || liqVal < 1) { setError("Неверная ликвидность"); return; }
    if (isNaN(riskVal)  || riskVal < 0 || riskVal > 100) { setError("Неверный риск-скор (0–100)"); return; }

    updateAsset(asset.id, {
      name:            name.trim(),
      externalId:      externalId.trim() || undefined,
      currentPriceCents: Math.round(priceVal * 100),
      platformFeeRate: feeVal / 100,
      liquidityDays:   liqVal,
      riskScore:       riskVal,
      currency,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#1C2640] bg-[#0E1830] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="fb text-lg font-bold text-[#E8F0FF]">Редактировать актив</h2>
          <button
            onClick={onClose}
            className="text-[#4E6080] hover:text-[#B0C4DE] transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Название">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="Название актива"
            />
          </Field>

          <Field label="External ID" hint="Номер набора LEGO, PSA номер, тикер и т.д.">
            <input
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              className={inputCls}
              placeholder="21336, PSA-12345..."
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Текущая цена">
              <input
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                type="number"
                min="0.01"
                step="0.01"
                className={inputCls}
              />
            </Field>
            <Field label="Валюта">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as "EUR" | "USD" | "GBP")}
                className={clsx(inputCls, "cursor-pointer")}
              >
                <option value="EUR">EUR €</option>
                <option value="USD">USD $</option>
                <option value="GBP">GBP £</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Комиссия %">
              <input
                value={platformFee}
                onChange={(e) => setPlatformFee(e.target.value)}
                type="number"
                min="0"
                max="100"
                className={inputCls}
              />
            </Field>
            <Field label="Ликвидность (дн.)">
              <input
                value={liquidityDays}
                onChange={(e) => setLiquidityDays(e.target.value)}
                type="number"
                min="1"
                className={inputCls}
              />
            </Field>
            <Field label="Риск (0–100)">
              <input
                value={riskScore}
                onChange={(e) => setRiskScore(e.target.value)}
                type="number"
                min="0"
                max="100"
                className={inputCls}
              />
            </Field>
          </div>

          {error && <p className="fm text-xs text-[#F87171]">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 rounded-lg bg-[#F59E0B] py-2.5 text-sm font-bold text-[#0B1120] hover:bg-[#FCD34D] transition-colors"
            >
              Сохранить
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-[#1C2640] px-4 py-2.5 text-sm text-[#4E6080] hover:text-[#B0C4DE] transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
