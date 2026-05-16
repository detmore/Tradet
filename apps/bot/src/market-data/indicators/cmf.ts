import type { Candle } from "@trade/shared";

export function computeCmf(candles: Candle[], period: number): number[] {
  if (candles.length < period) return [];
  const result: number[] = [];

  for (let i = period - 1; i < candles.length; i++) {
    let sumMfv = 0;
    let sumVolume = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const c = candles[j]!;
      const range = c.high - c.low;
      if (range === 0) continue;
      const mfm = (c.close - c.low - (c.high - c.close)) / range;
      sumMfv += mfm * c.volume;
      sumVolume += c.volume;
    }
    result.push(sumVolume === 0 ? 0 : sumMfv / sumVolume);
  }
  return result;
}

export function latestCmf(candles: Candle[], period: number): number {
  const series = computeCmf(candles, period);
  return series[series.length - 1] ?? 0;
}
