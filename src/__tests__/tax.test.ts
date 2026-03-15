import { computeIRPFTax } from "@/lib/calculations/tax";

describe("computeIRPFTax", () => {
  it("returns zero for zero or negative gain", () => {
    expect(computeIRPFTax(0).taxCents).toBe(0);
    expect(computeIRPFTax(-1000).taxCents).toBe(0);
  });

  it("applies 19% on gains within first bracket (≤ €6,000)", () => {
    // €3,000 gain → €570 tax
    const result = computeIRPFTax(300_000);
    expect(result.taxCents).toBe(Math.round(300_000 * 0.19));
    expect(result.bracketBreakdown).toHaveLength(1);
    expect(result.bracketBreakdown[0]?.bracket.rate).toBe(0.19);
  });

  it("applies progressive brackets across the €6,000 boundary", () => {
    // €10,000 gain:
    //   First €6,000 @ 19% = €1,140
    //   Next  €4,000 @ 21% = €840
    //   Total = €1,980
    const result = computeIRPFTax(1_000_000);
    const expected = Math.round(600_000 * 0.19) + Math.round(400_000 * 0.21);
    expect(result.taxCents).toBe(expected);
    expect(result.bracketBreakdown).toHaveLength(2);
  });

  it("spans all 5 brackets for a gain > €300,000", () => {
    const result = computeIRPFTax(35_000_000); // €350,000
    expect(result.bracketBreakdown).toHaveLength(5);
    expect(result.bracketBreakdown.at(-1)?.bracket.rate).toBe(0.28);
  });

  it("effective rate is always < max bracket rate", () => {
    const result = computeIRPFTax(50_000_000);
    expect(result.effectiveRate).toBeLessThan(0.28);
    expect(result.effectiveRate).toBeGreaterThan(0);
  });

  it("computes exact tax for €50,000 gain", () => {
    // €6,000 @ 19% = €1,140
    // €44,000 @ 21% = €9,240
    // Total = €10,380
    const result = computeIRPFTax(5_000_000);
    const expected = Math.round(600_000 * 0.19) + Math.round(4_400_000 * 0.21);
    expect(result.taxCents).toBe(expected);
  });
});
