import type { LayerResult } from "@trade/shared";
import type { EvaluationContext } from "../pipeline.js";
import { LAYER_SCORES } from "@trade/config";

export function confirmCmf(ctx: EvaluationContext): LayerResult {
  const cmf = ctx.indicators.cmf;
  if (cmf === undefined) {
    return { layer: "cmf_confirmation", passed: false, value: "no data", threshold: ctx.config.thresholds.cmfMin, contribution: 0 };
  }
  const { cmfMin } = ctx.config.thresholds;
  const passed = cmf >= cmfMin;
  return { layer: "cmf_confirmation", passed, value: cmf, threshold: cmfMin, contribution: passed ? LAYER_SCORES.cmf : 0 };
}
