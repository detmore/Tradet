import type { Candle } from "@trade/shared";

export function detectFractals(
  candles: Candle[],
  period = 2
): { bullFractals: number[]; bearFractals: number[] } {
  const bullFractals: number[] = [];
  const bearFractals: number[] = [];

  for (let i = period; i < candles.length - period; i++) {
    const center = candles[i]!;
    let isBull = true;
    let isBear = true;

    for (let j = 1; j <= period; j++) {
      if ((candles[i - j]?.low ?? Infinity) <= center.low) isBull = false;
      if ((candles[i + j]?.low ?? Infinity) <= center.low) isBull = false;
      if ((candles[i - j]?.high ?? 0) >= center.high) isBear = false;
      if ((candles[i + j]?.high ?? 0) >= center.high) isBear = false;
    }

    if (isBull) bullFractals.push(i);
    if (isBear) bearFractals.push(i);
  }

  return { bullFractals, bearFractals };
}
