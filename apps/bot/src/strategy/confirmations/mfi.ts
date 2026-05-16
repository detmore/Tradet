import type { LayerResult } from "@trade/shared";
import type { EvaluationContext } from "../pipeline.js";
import { LAYER_SCORES } from "@trade/config";

export function confirmMfi(ctx: EvaluationContext): LayerResult {
  const mfi = ctx.indicators.mfi ?? 50;
  const { mfiMin } = ctx.config.thresholds;
  const passed = mfi >= mfiMin;
  return {
    layer: "mfi_confirmation",
    passed,
    value: mfi,
    threshold: mfiMin,
    contribution: passed ? LAYER_SCORES.mfi : 0,
  };
}
