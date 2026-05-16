import type { LayerResult, DecisionAction, StrategyConfig } from "@trade/shared";

export function scoreDecision(
  layers: LayerResult[],
  config: StrategyConfig
): { score: number; action: DecisionAction } {
  const totalScore = layers.reduce((sum, layer) => sum + layer.contribution, 0);
  const action: DecisionAction = totalScore >= config.thresholds.scoreThreshold ? "buy" : "no_trade";
  return { score: totalScore, action };
}
