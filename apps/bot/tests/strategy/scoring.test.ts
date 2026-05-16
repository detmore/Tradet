import { describe, it, expect } from "vitest";
import { scoreDecision } from "../../src/strategy/scoring.js";
import type { LayerResult, StrategyConfig } from "@trade/shared";

function makeConfig(scoreThreshold: number): StrategyConfig {
  return {
    id: "test",
    name: "test",
    version: 1,
    timeframe: "15m",
    symbols: ["BTC/USDT"],
    enabled: true,
    thresholds: {
      scoreThreshold,
      rsiMin: 55,
      rsiMax: 70,
      mfiMin: 50,
      cmfMin: 0,
      volSmaMultiplier: 1,
      atrMin: 0,
      atrMax: Infinity,
      emaCrossoverBars: 5,
    },
    flags: {
      useMfi: true,
      useCmf: true,
      usePivot: true,
      useFractal: true,
      useAlligator: true,
      useHeikinAshi: true,
      breakoutCloseConfirm: true,
      retestConfirm: false,
    },
    risk: {
      riskPerTrade: 0.005,
      maxDailyLoss: 0.02,
      maxOpenExposure: 0.03,
      consecutiveLossPause: 3,
      cooldownDurationHours: 4,
    },
    exits: { slAtrMult: 1.5, tpAtrMult: 2.5, trailingEnabled: false },
  };
}

describe("scoreDecision", () => {
  it("returns no_trade when score below threshold", () => {
    const layers: LayerResult[] = [
      { layer: "rsi_confirmation", passed: true, value: 60, threshold: 55, contribution: 20 },
    ];
    const { action, score } = scoreDecision(layers, makeConfig(60));
    expect(score).toBe(20);
    expect(action).toBe("no_trade");
  });

  it("returns buy when score meets threshold", () => {
    const layers: LayerResult[] = [
      { layer: "rsi_confirmation", passed: true, value: 60, threshold: 55, contribution: 20 },
      { layer: "mfi_confirmation", passed: true, value: 55, threshold: 50, contribution: 15 },
      { layer: "cmf_confirmation", passed: true, value: 0.1, threshold: 0, contribution: 15 },
      { layer: "breakout_confirmation", passed: true, value: 100, threshold: 95, contribution: 20 },
    ];
    const { action, score } = scoreDecision(layers, makeConfig(60));
    expect(score).toBe(70);
    expect(action).toBe("buy");
  });

  it("score is sum of contributions regardless of passed flag", () => {
    const layers: LayerResult[] = [
      { layer: "rsi_confirmation", passed: false, value: 40, threshold: 55, contribution: 0 },
      { layer: "mfi_confirmation", passed: true, value: 55, threshold: 50, contribution: 15 },
    ];
    const { score } = scoreDecision(layers, makeConfig(60));
    expect(score).toBe(15);
  });

  it("returns no_trade when layers array is empty", () => {
    const { action, score } = scoreDecision([], makeConfig(60));
    expect(score).toBe(0);
    expect(action).toBe("no_trade");
  });

  it("returns buy when score exactly equals threshold", () => {
    const layers: LayerResult[] = [
      { layer: "rsi_confirmation", passed: true, value: 60, threshold: 55, contribution: 60 },
    ];
    const { action } = scoreDecision(layers, makeConfig(60));
    expect(action).toBe("buy");
  });
});
