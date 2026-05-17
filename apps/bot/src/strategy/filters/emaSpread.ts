import type { LayerResult } from "@trade/shared";
import type { EvaluationContext } from "../pipeline.js";

export function mandatoryEmaSpreadFilter(ctx: EvaluationContext): LayerResult {
  const spread = ctx.indicators.emaSpreadPct ?? 0;
  const min = ctx.config.thresholds.emaSpreadMin ?? 0.3;
  const passed = spread >= min;
  return {
    layer: "ema_spread_filter",
    passed,
    value: parseFloat(spread.toFixed(4)),
    threshold: min,
    contribution: 0,
  };
}
