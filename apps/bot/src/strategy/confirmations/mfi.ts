import type { LayerResult } from "@trade/shared";
import type { EvaluationContext } from "../pipeline.js";
import { LAYER_SCORES } from "@trade/config";

export function confirmMfi(ctx: EvaluationContext): LayerResult {
  const mfi = ctx.indicators.mfi;
  if (mfi === undefined) {
    return { layer: "mfi_confirmation", passed: false, value: "no data", threshold: ctx.config.thresholds.mfiMin, contribution: 0 };
  }
  const { mfiMin } = ctx.config.thresholds;
  const passed = mfi >= mfiMin;
  return { layer: "mfi_confirmation", passed, value: mfi, threshold: mfiMin, contribution: passed ? LAYER_SCORES.mfi : 0 };
}
