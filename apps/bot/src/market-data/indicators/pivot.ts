import type { PivotLevels } from "@trade/shared";

export function computePivotLevels(high: number, low: number, close: number): PivotLevels {
  const p = (high + low + close) / 3;
  return {
    p,
    r1: 2 * p - low,
    r2: p + (high - low),
    s1: 2 * p - high,
    s2: p - (high - low),
  };
}
