import { IRPF_BRACKETS } from "@/constants/tax";
import type { Asset } from "@/types/asset";
import type { TaxReport, TaxLineItem } from "@/types/portfolio";

// ─── IRPF progressive tax calculator ─────────────────────────────────────────

/**
 * Compute Spain IRPF tax on capital gains using progressive brackets.
 * @param gainCents  Total gain in EUR cents (must be positive to owe tax)
 */
export function computeIRPFTax(gainCents: number): {
  taxCents: number;
  effectiveRate: number;
  bracketBreakdown: TaxReport["bracketBreakdown"];
} {
  if (gainCents <= 0) {
    return { taxCents: 0, effectiveRate: 0, bracketBreakdown: [] };
  }

  let remaining = gainCents;
  let totalTaxCents = 0;
  const bracketBreakdown: TaxReport["bracketBreakdown"] = [];

  for (const bracket of IRPF_BRACKETS) {
    if (remaining <= 0) break;

    const bracketCapCents =
      bracket.to !== null ? bracket.to - bracket.from : Infinity;
    const taxableInBracket = Math.min(remaining, bracketCapCents);
    const taxInBracket = Math.round(taxableInBracket * bracket.rate);

    totalTaxCents += taxInBracket;

    if (taxableInBracket > 0) {
      bracketBreakdown.push({
        bracket,
        taxableAmountCents: taxableInBracket,
        taxCents: taxInBracket,
      });
    }

    remaining -= taxableInBracket;
  }

  return {
    taxCents: totalTaxCents,
    effectiveRate: gainCents > 0 ? totalTaxCents / gainCents : 0,
    bracketBreakdown,
  };
}

// ─── Tax report builder ───────────────────────────────────────────────────────

/**
 * Identify all realized gains for a given tax year using FIFO matching.
 * Returns a full TaxReport for Spain IRPF.
 */
export function buildTaxReport(assets: Asset[], taxYear: number): TaxReport {
  const lineItems: TaxLineItem[] = [];
  let totalGainCents = 0;

  for (const asset of assets) {
    const buys = asset.transactions
      .filter((tx) => tx.type === "buy")
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const sells = asset.transactions
      .filter(
        (tx) =>
          tx.type === "sell" &&
          new Date(tx.date).getFullYear() === taxYear,
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (sells.length === 0) continue;

    // Clone buy lots for FIFO matching
    const lots = buys.map((tx) => ({
      quantity: tx.quantity,
      costPerUnitCents:
        tx.pricePerUnitCents +
        Math.round((tx.feeCents + tx.otherCostsCents) / tx.quantity),
    }));

    for (const sell of sells) {
      let remaining = sell.quantity;
      const netPricePerUnit =
        sell.pricePerUnitCents -
        Math.round((sell.feeCents + sell.otherCostsCents) / sell.quantity);

      let gainCents = 0;

      while (remaining > 0 && lots.length > 0) {
        const lot = lots[0]!;
        const consumed = Math.min(lot.quantity, remaining);
        gainCents += Math.round(
          consumed * (netPricePerUnit - lot.costPerUnitCents),
        );
        lot.quantity -= consumed;
        remaining -= consumed;
        if (lot.quantity === 0) lots.shift();
      }

      totalGainCents += gainCents;
      const { taxCents, effectiveRate } = computeIRPFTax(Math.max(0, gainCents));

      lineItems.push({
        assetId: asset.id,
        assetName: asset.name,
        gainCents,
        taxCents,
        effectiveRate,
        taxYear,
      });
    }
  }

  // Apply all losses to offset gains before final bracket-level calculation
  const netTaxableGainCents = Math.max(0, totalGainCents);
  const { taxCents: totalTaxCents, effectiveRate, bracketBreakdown } =
    computeIRPFTax(netTaxableGainCents);

  return {
    taxYear,
    totalGainCents,
    totalTaxCents,
    effectiveTaxRate: effectiveRate,
    lineItems,
    bracketBreakdown,
  };
}
