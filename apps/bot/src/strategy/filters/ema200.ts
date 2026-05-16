import type { LayerResult } from "@trade/shared";
import type { EvaluationContext } from "../pipeline.js";

export function mandatoryEma200Filter(ctx: EvaluationContext): LayerResult {
  const { close } = ctx.candle;
  const { ema200 } = ctx.indicators;
  const passed = close > ema200;
  const result: LayerResult = { layer: "ema200_filter", passed, value: close, threshold: ema200, contribution: 0 };
  if (!passed) result.reason = `Price ${close.toFixed(2)} below EMA200 ${ema200.toFixed(2)}`;
  return result;
}
