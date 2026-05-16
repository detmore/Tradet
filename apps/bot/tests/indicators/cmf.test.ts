import { describe, it, expect } from "vitest";
import { computeCmf } from "../../src/market-data/indicators/cmf.js";
import type { Candle } from "@trade/shared";

function makeCandle(close: number, volume = 1000, high?: number, low?: number): Candle {
  return {
    symbol: "BTC/USDT",
    timeframe: "15m",
    openTime: Date.now(),
    closeTime: Date.now() + 900_000,
    open: close,
    high: high ?? close + 2,
    low: low ?? close - 2,
    close,
    volume,
  };
}

describe("computeCmf", () => {
  it("CMF is bounded [-1, 1]", () => {
    const candles = Array.from({ length: 30 }, (_, i) => makeCandle(100 + i));
    const cmf = computeCmf(candles, 20);
    for (const v of cmf) {
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("returns empty for insufficient data", () => {
    expect(computeCmf([], 20)).toEqual([]);
  });

  it("bullish close at high → CMF close to 1", () => {
    // close = high means money flow multiplier = (close - low - (high - close)) / (high - low)
    // = (high - low - 0) / (high - low) = 1
    const candles: Candle[] = Array.from({ length: 30 }, (_, i) => ({
      symbol: "BTC/USDT",
      timeframe: "15m",
      openTime: i,
      closeTime: i + 1,
      open: 100,
      high: 110,
      low: 90,
      close: 110,
      volume: 1000,
    }));
    const cmf = computeCmf(candles, 20);
    expect(cmf[cmf.length - 1]).toBeCloseTo(1, 1);
  });

  it("bearish close at low → CMF close to -1", () => {
    // close = low means money flow multiplier = (low - low - (high - low)) / (high - low) = -1
    const candles: Candle[] = Array.from({ length: 30 }, (_, i) => ({
      symbol: "BTC/USDT",
      timeframe: "15m",
      openTime: i,
      closeTime: i + 1,
      open: 100,
      high: 110,
      low: 90,
      close: 90,
      volume: 1000,
    }));
    const cmf = computeCmf(candles, 20);
    expect(cmf[cmf.length - 1]).toBeCloseTo(-1, 1);
  });
});
