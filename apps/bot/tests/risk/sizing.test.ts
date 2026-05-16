import { describe, it, expect } from "vitest";
import { computePositionSize } from "../../src/risk/sizing.js";

describe("computePositionSize", () => {
  it("computes correct position size", () => {
    // balance=10000, risk=0.5%, entry=50000, sl=49000 → risk_amount=50, sl_distance=1000
    // size = 50/1000 = 0.05
    const size = computePositionSize(10_000, 0.005, 50_000, 49_000);
    expect(size).toBeCloseTo(0.05, 6);
  });

  it("returns 0 when SL equals entry", () => {
    expect(computePositionSize(10_000, 0.005, 50_000, 50_000)).toBe(0);
  });

  it("scales proportionally with risk percent", () => {
    const size1 = computePositionSize(10_000, 0.005, 50_000, 49_000);
    const size2 = computePositionSize(10_000, 0.01, 50_000, 49_000);
    expect(size2).toBeCloseTo(size1 * 2, 6);
  });

  it("larger SL distance → smaller position", () => {
    const tight = computePositionSize(10_000, 0.005, 50_000, 49_500); // 500 distance
    const wide = computePositionSize(10_000, 0.005, 50_000, 49_000);  // 1000 distance
    expect(tight).toBeGreaterThan(wide);
  });

  it("scales proportionally with balance", () => {
    const size1 = computePositionSize(10_000, 0.005, 50_000, 49_000);
    const size2 = computePositionSize(20_000, 0.005, 50_000, 49_000);
    expect(size2).toBeCloseTo(size1 * 2, 6);
  });

  it("SL above entry (short scenario) also works correctly", () => {
    // Uses Math.abs so entry=49000, sl=50000 → same distance as before
    const size = computePositionSize(10_000, 0.005, 49_000, 50_000);
    expect(size).toBeCloseTo(0.05, 6);
  });
});
