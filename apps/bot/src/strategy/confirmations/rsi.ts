import type { LayerResult } from "@trade/shared";
import type { EvaluationContext } from "../pipeline.js";
import { LAYER_SCORES } from "@trade/config";

export function confirmRsi(ctx: EvaluationContext): LayerResult {
  const { rsi } = ctx.indicators;
  const { rsiMin, rsiMax } = ctx.config.thresholds;
  const passed = rsi >= rsiMin && rsi <= rsiMax;
  return {
    layer: "rsi_confirmation",
    passed,
    value: rsi,
    threshold: `[${rsiMin}, ${rsiMax}]`,
    contribution: passed ? LAYER_SCORES.rsi : 0,
  };
}
