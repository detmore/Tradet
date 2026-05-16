import type { LayerResult } from "@trade/shared";
import type { EvaluationContext } from "../pipeline.js";

export function mandatoryVolumeFilter(ctx: EvaluationContext): LayerResult {
  const { volume, volumeSma } = ctx.indicators;
  const { volSmaMultiplier } = ctx.config.thresholds;
  const threshold = volumeSma * volSmaMultiplier;
  const passed = volume >= threshold;
  const result: LayerResult = { layer: "volume_filter", passed, value: volume, threshold, contribution: 0 };
  if (!passed) result.reason = `Volume ${volume.toFixed(0)} below threshold ${threshold.toFixed(0)}`;
  return result;
}
