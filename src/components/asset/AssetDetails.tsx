"use client";

import { clsx } from "clsx";
import { formatCents, formatPct, ASSET_CLASS_LABELS } from "@/lib/formatters";
import type { Asset } from "@/types/asset";
import type { AssetMetrics } from "@/types/portfolio";

interface Props {
  asset: Asset;
  metrics: AssetMetrics;
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-800 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={clsx("text-sm font-medium tabular-nums", accent ?? "text-slate-200")}>
        {value}
      </span>
    </div>
  );
}

export function AssetDetails({ asset, metrics }: Props) {
  const holdingMonths = Math.round(metrics.avgDaysHeld / 30);

  const buyTxs = asset.transactions.filter((t) => t.type === "buy");
  const sellTxs = asset.transactions.filter((t) => t.type === "sell");
  const avgBuyPrice = buyTxs.length > 0
    ? buyTxs.reduce((s, t) => s + t.pricePerUnitCents * t.quantity, 0) /
      buyTxs.reduce((s, t) => s + t.quantity, 0)
    : 0;

  return (
    <div className="space-y-4">
      {/* Position */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Позиция
        </h3>
        <Row label="В портфеле"        value={`${metrics.unitsHeld} шт.`} />
        <Row label="Средняя цена"      value={formatCents(avgBuyPrice, asset.currency)} />
        <Row label="Себестоимость"     value={formatCents(metrics.totalCostCents, asset.currency)} />
        <Row
          label="Нереализ. P&L"
          value={`${metrics.unrealizedPnLCents >= 0 ? "+" : ""}${formatCents(metrics.unrealizedPnLCents, asset.currency)}`}
          accent={metrics.unrealizedPnLCents >= 0 ? "text-emerald-400" : "text-red-400"}
        />
        <Row
          label="Реализ. P&L"
          value={`${metrics.realizedPnLCents >= 0 ? "+" : ""}${formatCents(metrics.realizedPnLCents, asset.currency)}`}
          accent={metrics.realizedPnLCents >= 0 ? "text-emerald-400" : "text-red-400"}
        />
        <Row
          label="Простой ROI"
          value={formatPct(metrics.simpleROI)}
          accent={metrics.simpleROI >= 0 ? "text-emerald-400" : "text-red-400"}
        />
        <Row
          label="Годовой ROI"
          value={formatPct(metrics.annualizedROI)}
          accent={metrics.annualizedROI >= 0 ? "text-emerald-400" : "text-red-400"}
        />
        <Row label="Чистая (после комиссии)" value={formatCents(metrics.netValueAfterFeeCents, asset.currency)} />
      </div>

      {/* Asset info */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
          О активе
        </h3>
        <Row label="Класс"               value={ASSET_CLASS_LABELS[asset.assetClass] ?? asset.assetClass} />
        {asset.externalId && (
          <Row label="ID / Тикер"        value={asset.externalId} />
        )}
        {asset.condition && (
          <Row label="Состояние"         value={asset.condition.replace("_", " ")} />
        )}
        {asset.grade !== undefined && (
          <Row label="Грейд"             value={`PSA / BGS ${asset.grade}`} accent="text-amber-400" />
        )}
        <Row label="Комиссия платформы"  value={`${(asset.platformFeeRate * 100).toFixed(1)}%`} />
        <Row label="Ликвидность"         value={`~${asset.liquidityDays} дн.`} />
        <Row
          label="Риск-скор"
          value={`${asset.riskScore} / 100`}
          accent={
            asset.riskScore < 30 ? "text-emerald-400" :
            asset.riskScore < 60 ? "text-amber-400"   : "text-red-400"
          }
        />
        <Row label="В портфеле"          value={`${holdingMonths} мес.`} />
        <Row label="Валюта"              value={asset.currency} />
      </div>

      {/* Transaction history */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Сделки ({asset.transactions.length})
        </h3>
        <div className="space-y-2">
          {asset.transactions
            .slice()
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      "rounded px-1.5 py-0.5 text-xs font-bold uppercase",
                      tx.type === "buy"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-red-500/15 text-red-400",
                    )}
                  >
                    {tx.type === "buy" ? "Покупка" : "Продажа"}
                  </span>
                  <span className="text-slate-500">
                    {new Date(tx.date).toLocaleDateString("ru-RU")}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-300">
                    {tx.quantity} × {formatCents(tx.pricePerUnitCents, tx.currency)}
                  </span>
                  {tx.feeCents > 0 && (
                    <span className="ml-1.5 text-xs text-slate-600">
                      +{formatCents(tx.feeCents, tx.currency)} комиссия
                    </span>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Suppress unused */}
      {void buyTxs}{void sellTxs}
    </div>
  );
}
