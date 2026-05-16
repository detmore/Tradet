import { describe, it, expect } from "vitest";
import { computeAtr, latestAtr } from "../../src/market-data/indicators/atr.js";
import type { Candle } from "@trade/shared";

function makeCandle(close: number, high?: number, low?: number): Candle {
  return {
    symbol: "BTC/USDT",
    timeframe: "15m",
    openTime: Date.now(),
    closeTime: Date.now() + 900_000,
    open: close,
    high: high ?? close + 1,
    low: low ?? close - 1,
    close,
    volume: 100,
  };
}

describe("computeAtr", () => {
  it("returns empty for insufficient candles", () => {
    const candles = Array.from({ length: 10 }, (_, i) => makeCandle(100 + i));
    expect(computeAtr(candles, 14)).toEqual([]);
  });

  it("ATR is positive", () => {
    const candles = Array.from({ length: 30 }, (_, i) => makeCandle(100 + i));
    const atr = computeAtr(candles, 14);
    expect(atr.every((v) => v > 0)).toBe(true);
  });

  it("higher volatility candles produce higher ATR", () => {
    const lowVol = Array.from({ length: 30 }, (_, i) =>
      makeCandle(100 + i, 100 + i + 0.5, 100 + i - 0.5)
    );
    const highVol = Array.from({ length: 30 }, (_, i) =>
      makeCandle(100 + i, 100 + i + 10, 100 + i - 10)
    );
    const atrLow = latestAtr(lowVol, 14);
    const atrHigh = latestAtr(highVol, 14);
    expect(atrHigh).toBeGreaterThan(atrLow);
  });

  it("latestAtr returns 0 for insufficient candles", () => {
    const candles = Array.from({ length: 5 }, (_, i) => makeCandle(100 + i));
    expect(latestAtr(candles, 14)).toBe(0);
  });
});
