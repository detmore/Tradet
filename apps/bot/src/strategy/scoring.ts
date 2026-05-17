import type { LayerResult, StrategyConfig } from "@trade/shared";

export function scoreDecision(
  layers: LayerResult[],
  config: StrategyConfig
): { score: number } {
  const totalScore = layers.reduce((sum, layer) => sum + layer.contribution, 0);
  void config; // threshold comparison done in pipeline to keep action logic in one place
  return { score: totalScore };
}
