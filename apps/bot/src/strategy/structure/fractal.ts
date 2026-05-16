import type { LayerResult } from "@trade/shared";
import type { EvaluationContext } from "../pipeline.js";
import { LAYER_SCORES } from "@trade/config";

export function structureFractal(ctx: EvaluationContext): LayerResult {
  const passed = ctx.indicators.isBullishFractalBreakout === true;
  return {
    layer: "fractal_structure",
    passed,
    value: passed,
    threshold: true,
    contribution: passed ? LAYER_SCORES.fractal : 0,
  };
}
