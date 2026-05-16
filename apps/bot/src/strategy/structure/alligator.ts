import type { LayerResult } from "@trade/shared";
import type { EvaluationContext } from "../pipeline.js";
import { LAYER_SCORES } from "@trade/config";

export function structureAlligator(ctx: EvaluationContext): LayerResult {
  const alligator = ctx.indicators.alligator;
  const { close } = ctx.candle;

  if (!alligator) {
    return {
      layer: "alligator_structure",
      passed: false,
      value: close,
      threshold: "no data",
      contribution: 0,
    };
  }

  // Alligator "awake" and in order: lips > teeth > jaw (bullish)
  const passed =
    alligator.lips > alligator.teeth &&
    alligator.teeth > alligator.jaw &&
    close > alligator.lips;

  return {
    layer: "alligator_structure",
    passed,
    value: close,
    threshold: alligator.lips,
    contribution: passed ? LAYER_SCORES.alligator : 0,
  };
}
