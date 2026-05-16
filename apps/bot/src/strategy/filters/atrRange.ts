import type { LayerResult } from "@trade/shared";
import type { EvaluationContext } from "../pipeline.js";

export function mandatoryAtrRangeFilter(ctx: EvaluationContext): LayerResult {
  const { atr } = ctx.indicators;
  const { atrMin, atrMax } = ctx.config.thresholds;
  // atrMax may be null or Infinity (JSON serialises Infinity as null)
  const maxOk = atrMax == null || atrMax === Infinity || atr <= atrMax;
  const passed = atr >= atrMin && maxOk;
  return {
    layer: "atr_range_filter",
    passed,
    value: atr,
    threshold: `[${atrMin}, ${!maxOk || atrMax == null || atrMax === Infinity ? "∞" : atrMax}]`,
    contribution: 0,
  };
}
