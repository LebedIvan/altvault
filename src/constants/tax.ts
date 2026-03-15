import type { IRPFBracket } from "@/types/portfolio";

/**
 * Spain IRPF capital gains tax brackets for 2024 (savings base / base del ahorro).
 * Source: Agencia Tributaria — Ley 35/2006, art. 66, updated by PGE 2023.
 *
 * All thresholds stored in EUR cents.
 */
export const IRPF_BRACKETS: readonly IRPFBracket[] = [
  { from: 0,           to: 600_000,    rate: 0.19, label: "0 – 6,000 €"        },
  { from: 600_000,     to: 5_000_000,  rate: 0.21, label: "6,000 – 50,000 €"   },
  { from: 5_000_000,   to: 20_000_000, rate: 0.23, label: "50,000 – 200,000 €" },
  { from: 20_000_000,  to: 30_000_000, rate: 0.27, label: "200,000 – 300,000 €"},
  { from: 30_000_000,  to: null,       rate: 0.28, label: "> 300,000 €"         },
] as const;

/** Minimum holding period (days) for long-term capital gain treatment in Spain. */
export const IRPF_LONG_TERM_DAYS = 365;

/** Spanish fiscal year starts January 1 */
export const FISCAL_YEAR_START_MONTH = 1; // January
