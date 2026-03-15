import { z } from "zod";
import { AssetSchema, CurrencySchema } from "./asset";

// ─── Portfolio ────────────────────────────────────────────────────────────────

export const PortfolioSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  ownerId: z.string().uuid(),
  baseCurrency: CurrencySchema,
  assets: z.array(AssetSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Portfolio = z.infer<typeof PortfolioSchema>;

// ─── Computed metrics (derived, never persisted) ──────────────────────────────

export interface AssetMetrics {
  assetId: string;
  /** Total cost basis including fees and holding costs, in cents */
  totalCostCents: number;
  /** Current market value of all units held, in cents */
  currentValueCents: number;
  /** Unrealized P&L in cents */
  unrealizedPnLCents: number;
  /** Realized P&L from closed positions, in cents */
  realizedPnLCents: number;
  /** Units currently held */
  unitsHeld: number;
  /** Annualized ROI as a decimal (e.g. 0.35 = 35%) */
  annualizedROI: number;
  /** Simple ROI as a decimal */
  simpleROI: number;
  /** Net value after platform fee (sell-side), in cents */
  netValueAfterFeeCents: number;
  /** Days held (average weighted) */
  avgDaysHeld: number;
}

export interface PortfolioSummary {
  totalCostCents: number;
  totalCurrentValueCents: number;
  totalUnrealizedPnLCents: number;
  totalRealizedPnLCents: number;
  totalNetValueCents: number;
  overallSimpleROI: number;
  overallAnnualizedROI: number;
  taxableGainCents: number;
  /** Spain IRPF tax owed on realized gains, in cents */
  irpfTaxCents: number;
  /** Effective tax rate as a decimal */
  effectiveTaxRate: number;
  assetBreakdown: AssetMetrics[];
  byClass: Record<string, ClassSummary>;
}

export interface ClassSummary {
  totalCostCents: number;
  totalCurrentValueCents: number;
  unrealizedPnLCents: number;
  allocation: number; // fraction of total portfolio value
  count: number;
}

// ─── Tax report ───────────────────────────────────────────────────────────────

export interface IRPFBracket {
  from: number; // EUR cents
  to: number | null; // null = unbounded
  rate: number; // decimal
  label: string;
}

export interface TaxLineItem {
  assetId: string;
  assetName: string;
  gainCents: number;
  taxCents: number;
  effectiveRate: number;
  taxYear: number;
}

export interface TaxReport {
  taxYear: number;
  totalGainCents: number;
  totalTaxCents: number;
  effectiveTaxRate: number;
  lineItems: TaxLineItem[];
  bracketBreakdown: Array<{
    bracket: IRPFBracket;
    taxableAmountCents: number;
    taxCents: number;
  }>;
}
