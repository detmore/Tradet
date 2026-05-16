import type { Candle } from "@trade/shared";

export function computeMfi(candles: Candle[], period: number): number[] {
  if (candles.length < period + 1) return [];
  const result: number[] = [];
  const typicalPrices = candles.map((c) => (c.high + c.low + c.close) / 3);
  const rawMoneyFlows = typicalPrices.map((tp, i) => tp * (candles[i]?.volume ?? 0));

  for (let i = period; i < candles.length; i++) {
    let posFlow = 0;
    let negFlow = 0;
    for (let j = i - period + 1; j <= i; j++) {
      // Skip the first bar in the window if there is no previous bar to compare against
      if (j === 0) continue;
      const tp = typicalPrices[j] ?? 0;
      const prevTp = typicalPrices[j - 1] ?? 0;
      const flow = rawMoneyFlows[j] ?? 0;
      if (tp > prevTp) posFlow += flow;
      else negFlow += flow;
    }
    const mfr = negFlow === 0 ? 100 : posFlow / negFlow;
    result.push(100 - 100 / (1 + mfr));
  }
  return result;
}

export function latestMfi(candles: Candle[], period: number): number {
  const series = computeMfi(candles, period);
  return series[series.length - 1] ?? 50;
}
