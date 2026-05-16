import type { LayerResult } from "@trade/shared";
import type { EvaluationContext } from "../pipeline.js";
import { LAYER_SCORES } from "@trade/config";

export function confirmBreakout(ctx: EvaluationContext): LayerResult {
  const { pivotLevels } = ctx.indicators;
  const { close } = ctx.candle;
  const { breakoutCloseConfirm } = ctx.config.flags;

  if (!pivotLevels) {
    return {
      layer: "breakout_confirmation",
      passed: false,
      value: close,
      threshold: "no pivot data",
      contribution: 0,
    };
  }

  const aboveR1 = breakoutCloseConfirm ? close > pivotLevels.r1 : ctx.candle.high > pivotLevels.r1;
  const passed = aboveR1;

  return {
    layer: "breakout_confirmation",
    passed,
    value: close,
    threshold: pivotLevels.r1,
    contribution: passed ? LAYER_SCORES.breakout : 0,
  };
}
