import type { Candle, Decision, DecisionAction, IndicatorSnapshot, StrategyConfig } from "@trade/shared";
import { mandatoryEma200Filter } from "./filters/ema200.js";
import { mandatoryAtrRangeFilter } from "./filters/atrRange.js";
import { mandatoryVolumeFilter } from "./filters/volume.js";
import { setupEma2050 } from "./setups/ema2050.js";
import { confirmRsi } from "./confirmations/rsi.js";
import { confirmMfi } from "./confirmations/mfi.js";
import { confirmCmf } from "./confirmations/cmf.js";
import { confirmBreakout } from "./confirmations/breakout.js";
import { structureFractal } from "./structure/fractal.js";
import { structureAlligator } from "./structure/alligator.js";
import { structureHeikinAshi } from "./structure/heikinAshi.js";
import { scoreDecision } from "./scoring.js";

export interface EvaluationContext {
  symbol: string;
  timeframe: string;
  candle: Candle;
  indicators: IndicatorSnapshot;
  config: StrategyConfig;
}

export class StrategyPipeline {
  evaluate(ctx: EvaluationContext): Decision {
    const flags = ctx.config.flags;

    // Layer A: Mandatory filters — always evaluated
    const ema200Result = mandatoryEma200Filter(ctx);
    const atrResult    = mandatoryAtrRangeFilter(ctx);
    const volResult    = mandatoryVolumeFilter(ctx);
    const mandatoryPassed = ema200Result.passed && atrResult.passed && volResult.passed;

    // Layer B: Setup — always evaluated
    const setupResult  = setupEma2050(ctx);
    const setupPassed  = setupResult.passed;

    // Layer C: Confirmations — always evaluated (flags control inclusion in trace)
    const confirmRsiResult      = confirmRsi(ctx);
    const confirmMfiResult      = flags.useMfi     ? confirmMfi(ctx)      : null;
    const confirmCmfResult      = flags.useCmf     ? confirmCmf(ctx)      : null;
    const confirmBreakoutResult = flags.usePivot   ? confirmBreakout(ctx) : null;

    // Layer D: Quality/structure — always evaluated
    const fractalResult    = flags.useFractal    ? structureFractal(ctx)    : null;
    const alligatorResult  = flags.useAlligator  ? structureAlligator(ctx)  : null;
    const heikinAshiResult = flags.useHeikinAshi ? structureHeikinAshi(ctx) : null;

    // Build full trace — all active layers always visible in market panel
    const trace = [
      ema200Result,
      atrResult,
      volResult,
      setupResult,
      confirmRsiResult,
      ...(confirmMfiResult      ? [confirmMfiResult]      : []),
      ...(confirmCmfResult      ? [confirmCmfResult]      : []),
      ...(confirmBreakoutResult ? [confirmBreakoutResult] : []),
      ...(fractalResult         ? [fractalResult]         : []),
      ...(alligatorResult       ? [alligatorResult]       : []),
      ...(heikinAshiResult      ? [heikinAshiResult]      : []),
    ];

    const confirmations  = [confirmRsiResult, confirmMfiResult, confirmCmfResult, confirmBreakoutResult].filter(Boolean);
    const qualityFilters = [fractalResult, alligatorResult, heikinAshiResult].filter(Boolean);
    const confirmationsPassed = confirmations.some((r) => r!.passed);
    const structurePassed     = qualityFilters.length === 0 || qualityFilters.some((r) => r!.passed);

    // Always compute the real score — used by the dashboard even on no_trade
    const { score } = scoreDecision(trace, ctx.config);

    // Gate the action: mandatory, setup, and at least one confirmation must pass
    if (!mandatoryPassed || !setupPassed || !confirmationsPassed) {
      return { action: "no_trade", score, trace, mandatoryPassed, setupPassed, confirmationsPassed, structurePassed };
    }

    const action = score >= ctx.config.thresholds.scoreThreshold ? "buy" : "no_trade";
    return { action, score, trace, mandatoryPassed: true, setupPassed: true, confirmationsPassed, structurePassed };
  }
}
