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

  // Require 2 consecutive bullish HA candles to filter single-bar noise
  const prevClose = ctx.indicators.heikinAshiPrevClose;
  const prevOpen = ctx.indicators.heikinAshiPrevOpen;
  const currentBullish = heikinAshiClose > heikinAshiOpen;
  const prevBullish = prevClose !== undefined && prevOpen !== undefined ? prevClose > prevOpen : true;
  const passed = currentBullish && prevBullish;

  return {
    layer: "heikin_ashi_structure",
    passed,
    value: heikinAshiClose,
    threshold: heikinAshiOpen,
    contribution: passed ? LAYER_SCORES.heikinAshi : 0,
  };
}
