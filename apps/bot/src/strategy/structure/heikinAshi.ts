import type { LayerResult } from "@trade/shared";
import type { EvaluationContext } from "../pipeline.js";
import { LAYER_SCORES } from "@trade/config";

export function structureHeikinAshi(ctx: EvaluationContext): LayerResult {
  const { heikinAshiClose, heikinAshiOpen } = ctx.indicators;

  if (heikinAshiClose === undefined || heikinAshiOpen === undefined) {
    return {
      layer: "heikin_ashi_structure",
      passed: false,
      value: false,
      threshold: "no data",
      contribution: 0,
    };
  }

  // Bullish HA candle: close > open
  const passed = heikinAshiClose > heikinAshiOpen;

  return {
    layer: "heikin_ashi_structure",
    passed,
    value: heikinAshiClose,
    threshold: heikinAshiOpen,
    contribution: passed ? LAYER_SCORES.heikinAshi : 0,
  };
}
