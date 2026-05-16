import { describe, it, expect } from "vitest";
import { computeEma, latestEma } from "../../src/market-data/indicators/ema.js";

describe("computeEma", () => {
  it("returns empty array when insufficient data", () => {
    expect(computeEma([1, 2, 3], 5)).toEqual([]);
  });

  it("first EMA value equals SMA of first N prices", () => {
    const prices = [10, 20, 30, 40, 50];
    const ema = computeEma(prices, 3);
    // First value should be SMA of first 3: (10+20+30)/3 = 20
    expect(ema[0]).toBeCloseTo(20, 5);
  });

  it("EMA smooths toward new price", () => {
    const prices = [10, 10, 10, 10, 10, 20];
    const ema = computeEma(prices, 3);
    const last = ema[ema.length - 1]!;
    expect(last).toBeGreaterThan(10);
    expect(last).toBeLessThan(20);
  });

  it("latestEma returns last element", () => {
    const prices = [10, 20, 30, 40, 50, 60];
    const full = computeEma(prices, 3);
    expect(latestEma(prices, 3)).toBeCloseTo(full[full.length - 1]!, 5);
  });

  it("returns 0 for insufficient data via latestEma", () => {
    expect(latestEma([1, 2], 5)).toBe(0);
  });
});
