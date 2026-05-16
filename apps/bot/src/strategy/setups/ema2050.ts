import type { LayerResult } from "@trade/shared";
import type { EvaluationContext } from "../pipeline.js";

export function setupEma2050(ctx: EvaluationContext): LayerResult {
  const { ema20, ema50, ema2050CrossoverBarsAgo } = ctx.indicators;
  const { emaCrossoverBars } = ctx.config.thresholds;
  const { close } = ctx.candle;

  const trendAligned = ema20 > ema50 && close > ema20;
  const recentCrossover =
    ema2050CrossoverBarsAgo !== undefined && ema2050CrossoverBarsAgo <= emaCrossoverBars;
  const passed = trendAligned || recentCrossover;

  const result: LayerResult = { layer: "ema2050_setup", passed, value: ema20, threshold: ema50, contribution: 0 };
  if (!passed) result.reason = `EMA20 ${ema20.toFixed(2)} not above EMA50 ${ema50.toFixed(2)}`;
  return result;
}
