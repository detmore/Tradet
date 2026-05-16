import { describe, it, expect } from "vitest";
import { computePivotLevels } from "../../src/market-data/indicators/pivot.js";

describe("computePivotLevels", () => {
  it("computes pivot P = (H+L+C)/3", () => {
    const { p } = computePivotLevels(110, 90, 100);
    expect(p).toBeCloseTo((110 + 90 + 100) / 3, 5);
  });

  it("R1 > P > S1", () => {
    const levels = computePivotLevels(110, 90, 100);
    expect(levels.r1).toBeGreaterThan(levels.p);
    expect(levels.p).toBeGreaterThan(levels.s1);
  });

  it("R2 > R1 and S2 < S1", () => {
    const levels = computePivotLevels(110, 90, 100);
    expect(levels.r2).toBeGreaterThan(levels.r1);
    expect(levels.s2).toBeLessThan(levels.s1);
  });

  it("R1 = 2*P - low", () => {
    const { p, r1 } = computePivotLevels(110, 90, 100);
    expect(r1).toBeCloseTo(2 * p - 90, 10);
  });

  it("S1 = 2*P - high", () => {
    const { p, s1 } = computePivotLevels(110, 90, 100);
    expect(s1).toBeCloseTo(2 * p - 110, 10);
  });

  it("R2 = P + (high - low)", () => {
    const { p, r2 } = computePivotLevels(110, 90, 100);
    expect(r2).toBeCloseTo(p + (110 - 90), 10);
  });

  it("S2 = P - (high - low)", () => {
    const { p, s2 } = computePivotLevels(110, 90, 100);
    expect(s2).toBeCloseTo(p - (110 - 90), 10);
  });
});
