import type { LayerResult } from "@trade/shared";
import type { EvaluationContext } from "../pipeline.js";
import { LAYER_SCORES } from "@trade/config";

export function confirmBreakout(ctx: EvaluationContext): LayerResult {
  const { swingHigh } = ctx.indicators;
  const { close, high } = ctx.candle;
  const { breakoutCloseConfirm } = ctx.config.flags;

  if (swingHigh === undefined || swingHigh <= 0) {
    return {
      layer: "breakout_confirmation",
      passed: false,
      value: close,
      threshold: "no swing data",
      contribution: 0,
    };
  }

  // Swing high = max of last 20 bars — a real resistance level the market tracks
  const passed = breakoutCloseConfirm ? close > swingHigh : high > swingHigh;

  return {
    layer: "breakout_confirmation",
    passed,
    value: close,
    threshold: swingHigh,
    contribution: passed ? LAYER_SCORES.breakout : 0,
  };
}
