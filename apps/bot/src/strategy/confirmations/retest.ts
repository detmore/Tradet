import type { LayerResult } from "@trade/shared";
import type { EvaluationContext } from "../pipeline.js";
import { LAYER_SCORES } from "@trade/config";

export function confirmRetest(ctx: EvaluationContext): LayerResult {
  const { retestValid, pivotLevels } = ctx.indicators;
  const { close } = ctx.candle;

  return {
    layer: "retest_confirmation",
    passed: retestValid === true,
    value: close,
    threshold: pivotLevels?.r1 ?? "no pivot",
    contribution: retestValid ? LAYER_SCORES.breakout : 0,
  };
}
