export function computeEma(prices: number[], period: number): number[] {
  if (prices.length < period) return [];
  const k = 2 / (period + 1);
  const result: number[] = [];
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(ema);
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i]! - ema) * k + ema;
    result.push(ema);
  }
  return result;
}

export function latestEma(prices: number[], period: number): number {
  const series = computeEma(prices, period);
  return series[series.length - 1] ?? 0;
}
