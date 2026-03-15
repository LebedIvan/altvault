"use client";

import { Card } from "@/components/ui/Card";
import { formatCents, formatPct } from "@/lib/formatters";
import type { TaxReport } from "@/types/portfolio";
import { clsx } from "clsx";

interface Props {
  report: TaxReport;
}

export function TaxReportPanel({ report }: Props) {
  const { totalGainCents, totalTaxCents, effectiveTaxRate, lineItems, bracketBreakdown } =
    report;

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Total Realized Gain
          </p>
          <p
            className={clsx(
              "mt-1 text-xl font-bold tabular-nums",
              totalGainCents >= 0 ? "text-emerald-400" : "text-red-400",
            )}
          >
            {formatCents(totalGainCents)}
          </p>
          <p className="mt-1 text-xs text-slate-500">FY {report.taxYear}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            IRPF Tax Owed
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-amber-400">
            {formatCents(totalTaxCents)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Spain base del ahorro</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Effective Rate
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-white">
            {formatPct(effectiveTaxRate)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Blended across brackets</p>
        </Card>
      </div>

      {/* Bracket breakdown */}
      {bracketBreakdown.length > 0 && (
        <Card>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Progressive Bracket Breakdown
          </h3>
          <div className="space-y-2">
            {bracketBreakdown.map((b, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-36 text-slate-400">{b.bracket.label}</span>
                  <span className="text-slate-500">
                    {formatPct(b.bracket.rate, 0)} rate
                  </span>
                </div>
                <div className="flex gap-6 text-right">
                  <span className="w-28 tabular-nums text-slate-300">
                    {formatCents(b.taxableAmountCents)} taxable
                  </span>
                  <span className="w-20 tabular-nums font-medium text-amber-400">
                    {formatCents(b.taxCents)} tax
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Per-asset realized events */}
      {lineItems.length > 0 && (
        <Card>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Per-Asset Realized Events
          </h3>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="pb-2 text-left text-xs text-slate-500">Asset</th>
                <th className="pb-2 text-right text-xs text-slate-500">Gain/Loss</th>
                <th className="pb-2 text-right text-xs text-slate-500">Tax</th>
                <th className="pb-2 text-right text-xs text-slate-500">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {lineItems.map((item) => (
                <tr key={`${item.assetId}-${item.taxYear}`}>
                  <td className="py-2 text-slate-300">{item.assetName}</td>
                  <td
                    className={clsx(
                      "py-2 text-right tabular-nums font-medium",
                      item.gainCents >= 0 ? "text-emerald-400" : "text-red-400",
                    )}
                  >
                    {formatCents(item.gainCents)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-amber-400">
                    {formatCents(item.taxCents)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-slate-500">
                    {formatPct(item.effectiveRate, 1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {lineItems.length === 0 && (
        <Card>
          <p className="py-4 text-center text-sm text-slate-500">
            No taxable sell events recorded for {report.taxYear}.
          </p>
        </Card>
      )}
    </div>
  );
}
