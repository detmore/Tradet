import type { Candle, HeikinAshiCandle } from "@trade/shared";

export function computeHeikinAshi(candles: Candle[]): HeikinAshiCandle[] {
  if (candles.length === 0) return [];
  const result: HeikinAshiCandle[] = [];

  let prevHaOpen = (candles[0]!.open + candles[0]!.close) / 2;
  let prevHaClose =
    (candles[0]!.open + candles[0]!.high + candles[0]!.low + candles[0]!.close) / 4;

  for (const c of candles) {
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = (prevHaOpen + prevHaClose) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);
    result.push({ open: haOpen, high: haHigh, low: haLow, close: haClose, openTime: c.openTime });
    prevHaOpen = haOpen;
    prevHaClose = haClose;
  }
  return result;
}
