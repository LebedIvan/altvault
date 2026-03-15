/** Synthetic portfolio value history (daily, last 12 months). Values in EUR cents. */
export interface HistoryPoint {
  date: string; // ISO date
  valueCents: number;
  costCents: number;
}

/** Simple seeded LCG so server and client always get identical values. */
function makePrng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateHistory(): HistoryPoint[] {
  const rand = makePrng(42);
  const points: HistoryPoint[] = [];
  const start = new Date("2024-03-15");
  const initialCost = 62_000_00;

  let value = 68_000_00;

  for (let i = 0; i < 366; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);

    const dailyReturn = (rand() - 0.44) * 0.012;
    value = Math.round(value * (1 + dailyReturn));

    points.push({
      date: d.toISOString().slice(0, 10),
      valueCents: value,
      costCents: initialCost,
    });
  }
  return points;
}

export const MOCK_HISTORY: HistoryPoint[] = generateHistory();
