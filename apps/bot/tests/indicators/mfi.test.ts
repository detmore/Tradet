import { describe, it, expect } from "vitest";
import { computeMfi } from "../../src/market-data/indicators/mfi.js";
import type { Candle } from "@trade/shared";

function makeCandle(close: number, volume = 1000, high?: number, low?: number): Candle {
  return {
    symbol: "BTC/USDT",
    timeframe: "15m",
    openTime: Date.now(),
    closeTime: Date.now() + 900_000,
    open: close,
    high: high ?? close + 1,
    low: low ?? close - 1,
    close,
    volume,
  };
}

describe("computeMfi", () => {
  it("MFI is bounded [0, 100]", () => {
    const candles = Array.from({ length: 30 }, (_, i) => makeCandle(100 + i));
    const mfi = computeMfi(candles, 14);
    for (const v of mfi) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it("returns empty for insufficient data", () => {
    expect(computeMfi([], 14)).toEqual([]);
  });

  it("rising prices with high volume → MFI > 50", () => {
    const candles = Array.from({ length: 30 }, (_, i) => makeCandle(100 + i, 5000));
    const mfi = computeMfi(candles, 14);
    const last = mfi[mfi.length - 1]!;
    expect(last).toBeGreaterThan(50);
  });

  it("returns correct number of values", () => {
    const candles = Array.from({ length: 30 }, (_, i) => makeCandle(100 + i));
    const mfi = computeMfi(candles, 14);
    // computeMfi starts from index period (14), so length = 30 - 14 = 16
    expect(mfi.length).toBe(30 - 14);
  });
});
