import { describe, it, expect } from "vitest";
import { computeHeikinAshi } from "../../src/market-data/indicators/heikinAshi.js";
import type { Candle } from "@trade/shared";

function makeCandle(o: number, h: number, l: number, c: number): Candle {
  return {
    symbol: "BTC/USDT",
    timeframe: "15m",
    openTime: 0,
    closeTime: 1,
    open: o,
    high: h,
    low: l,
    close: c,
    volume: 100,
  };
}

describe("computeHeikinAshi", () => {
  it("returns empty for empty input", () => {
    expect(computeHeikinAshi([])).toEqual([]);
  });

  it("HA close = (O+H+L+C)/4", () => {
    const candles = [makeCandle(10, 14, 8, 12)];
    const ha = computeHeikinAshi(candles);
    expect(ha[0]!.close).toBeCloseTo((10 + 14 + 8 + 12) / 4, 5);
  });

  it("HA high >= max(open, close) for all candles", () => {
    const candles = Array.from({ length: 5 }, (_, i) =>
      makeCandle(100 + i, 110 + i, 90 + i, 105 + i)
    );
    const ha = computeHeikinAshi(candles);
    for (const c of ha) {
      expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
    }
  });

  it("HA low <= min(open, close) for all candles", () => {
    const candles = Array.from({ length: 5 }, (_, i) =>
      makeCandle(100 + i, 110 + i, 90 + i, 105 + i)
    );
    const ha = computeHeikinAshi(candles);
    for (const c of ha) {
      expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
    }
  });

  it("output length equals input length", () => {
    const candles = Array.from({ length: 10 }, (_, i) =>
      makeCandle(100 + i, 110 + i, 90 + i, 105 + i)
    );
    expect(computeHeikinAshi(candles)).toHaveLength(10);
  });

  it("preserves openTime from source candle", () => {
    const candles: Candle[] = [
      { symbol: "BTC/USDT", timeframe: "15m", openTime: 1234, closeTime: 5678, open: 10, high: 14, low: 8, close: 12, volume: 100 },
    ];
    const ha = computeHeikinAshi(candles);
    expect(ha[0]!.openTime).toBe(1234);
  });
});
