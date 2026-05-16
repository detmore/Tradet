import type { Candle } from "@trade/shared";

function smma(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const result: number[] = [];
  let sum = values.slice(0, period).reduce((a, b) => a + b, 0);
  result.push(sum / period);
  for (let i = period; i < values.length; i++) {
    const smmaVal = (result[result.length - 1]! * (period - 1) + values[i]!) / period;
    result.push(smmaVal);
  }
  return result;
}

export function computeAlligator(
  candles: Candle[],
  jawPeriod = 13,
  teethPeriod = 8,
  lipsPeriod = 5
): { jaw: number[]; teeth: number[]; lips: number[] } {
  const midpoints = candles.map((c) => (c.high + c.low) / 2);
  return {
    jaw: smma(midpoints, jawPeriod),
    teeth: smma(midpoints, teethPeriod),
    lips: smma(midpoints, lipsPeriod),
  };
}

export function latestAlligator(candles: Candle[]): { jaw: number; teeth: number; lips: number } {
  const { jaw, teeth, lips } = computeAlligator(candles);
  return {
    jaw: jaw[jaw.length - 1] ?? 0,
    teeth: teeth[teeth.length - 1] ?? 0,
    lips: lips[lips.length - 1] ?? 0,
  };
}
