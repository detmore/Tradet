import type { LayerResult } from "@trade/shared";
import type { BacktestConfig, BacktestResults, BacktestTrade } from "./types.js";
import { computeAllIndicators } from "../market-data/indicators/index.js";
import { StrategyPipeline } from "../strategy/pipeline.js";
import { computePositionSize } from "../risk/sizing.js";
import { INDICATOR_PERIODS } from "@trade/config";
import type { EvaluationContext } from "../strategy/pipeline.js";

const FEE_RATE = 0.001; // 0.1% taker fee

function timeframeToBarsPerHour(tf: string): number {
  if (tf === "1m")  return 60;
  if (tf === "5m")  return 12;
  if (tf === "15m") return 4;
  if (tf === "30m") return 2;
  if (tf === "1h")  return 1;
  if (tf === "4h")  return 0.25;
  if (tf === "1d")  return 1 / 24;
  return 4; // fallback: 15m
}
const MIN_WINDOW = INDICATOR_PERIODS.ema200 + 10;
const MAX_BARS_OPEN = 50;

interface OpenTrade {
  entryIndex: number;
  entryPrice: number;
  qty: number;
  sl: number;
  tp: number;
  score: number;
  trace: LayerResult[];
}

export class BacktestEngine {
  private readonly pipeline = new StrategyPipeline();

  run(config: BacktestConfig): BacktestResults {
    const { candles, strategyConfig, symbol, initialBalance } = config;

    if (candles.length < MIN_WINDOW) {
      throw new Error(`Need at least ${MIN_WINDOW} candles, got ${candles.length}`);
    }

    let balance = initialBalance;
    const trades: BacktestTrade[] = [];
    const equityCurve: Array<{ index: number; equity: number }> = [];

    let openTrade: OpenTrade | null = null;
    let consecutiveLosses = 0;
    let cooldownUntilIndex: number | null = null;
    let peakBalance = initialBalance;
    let maxDrawdown = 0;

    for (let i = MIN_WINDOW; i < candles.length; i++) {
      const currentCandle = candles[i];
      if (!currentCandle) continue;

      const currentPrice = currentCandle.close;
      const inCooldown = cooldownUntilIndex !== null && i < cooldownUntilIndex;

      // --- Check exit on open trade ---
      if (openTrade !== null) {
        let exitPrice: number | null = null;
        let exitReason: BacktestTrade["exitReason"] | null = null;

        if (currentCandle.low <= openTrade.sl) {
          exitPrice = openTrade.sl;
          exitReason = "sl";
        } else if (currentCandle.high >= openTrade.tp) {
          exitPrice = openTrade.tp;
          exitReason = "tp";
        } else if (i - openTrade.entryIndex >= MAX_BARS_OPEN) {
          exitPrice = currentPrice;
          exitReason = "max_bars";
        }

        if (exitPrice !== null && exitReason !== null) {
          // Fees cover both entry and exit legs: (entryPrice + exitPrice) * qty * rate
          const fees = (openTrade.entryPrice + exitPrice) * openTrade.qty * FEE_RATE;
          const pnl = (exitPrice - openTrade.entryPrice) * openTrade.qty - fees;
          const pnlPercent = (pnl / (openTrade.entryPrice * openTrade.qty)) * 100;

          balance += pnl;
          if (balance > peakBalance) peakBalance = balance;
          const drawdown = peakBalance - balance;
          if (drawdown > maxDrawdown) maxDrawdown = drawdown;

          if (pnl < 0) {
            consecutiveLosses++;
            if (consecutiveLosses >= strategyConfig.risk.consecutiveLossPause) {
              const barsPerHour = timeframeToBarsPerHour(strategyConfig.timeframe);
              cooldownUntilIndex = i + Math.round(strategyConfig.risk.cooldownDurationHours * barsPerHour);
              consecutiveLosses = 0;
            }
          } else {
            consecutiveLosses = 0;
          }

          const entryCandle = candles[openTrade.entryIndex];
          trades.push({
            openedAt: new Date(entryCandle?.closeTime ?? 0),
            closedAt: new Date(currentCandle.closeTime),
            entryPrice: openTrade.entryPrice,
            exitPrice,
            qty: openTrade.qty,
            sl: openTrade.sl,
            tp: openTrade.tp,
            exitReason,
            pnl,
            pnlPercent,
            score: openTrade.score,
            trace: openTrade.trace,
          });

          openTrade = null;
        }
      }

      equityCurve.push({ index: i, equity: balance });

      // --- Check entry (only if no open trade and not in cooldown) ---
      if (openTrade === null && !inCooldown) {
        if (balance <= 0) continue;

        const window = candles.slice(i - MIN_WINDOW, i + 1);
        const indicators = computeAllIndicators(window, strategyConfig.flags);
        const ctx: EvaluationContext = {
          symbol,
          timeframe: strategyConfig.timeframe,
          candle: currentCandle,
          indicators,
          config: strategyConfig,
        };

        const decision = this.pipeline.evaluate(ctx);

        if (decision.action === "buy") {
          const sl = currentPrice - indicators.atr * strategyConfig.exits.slAtrMult;
          const tp = currentPrice + indicators.atr * strategyConfig.exits.tpAtrMult;
          const qty = computePositionSize(
            balance,
            strategyConfig.risk.riskPerTrade,
            currentPrice,
            sl,
            strategyConfig.risk.maxOpenExposure
          );

          if (qty <= 0) continue;

          const cost = currentPrice * qty;
          if (cost > balance) continue;

          openTrade = {
            entryIndex: i,
            entryPrice: currentPrice,
            qty,
            sl,
            tp,
            score: decision.score,
            trace: decision.trace,
          };
        }
      }
    }

    // Force-close any remaining open trade at end of data
    if (openTrade !== null) {
      const lastCandle = candles[candles.length - 1];
      if (lastCandle) {
        const exitPrice = lastCandle.close;
        const fees = (openTrade.entryPrice + exitPrice) * openTrade.qty * FEE_RATE;
        const pnl = (exitPrice - openTrade.entryPrice) * openTrade.qty - fees;
        const pnlPercent = (pnl / (openTrade.entryPrice * openTrade.qty)) * 100;

        balance += pnl;

        const entryCandle = candles[openTrade.entryIndex];
        trades.push({
          openedAt: new Date(entryCandle?.closeTime ?? 0),
          closedAt: new Date(lastCandle.closeTime),
          entryPrice: openTrade.entryPrice,
          exitPrice,
          qty: openTrade.qty,
          sl: openTrade.sl,
          tp: openTrade.tp,
          exitReason: "max_bars",
          pnl,
          pnlPercent,
          score: openTrade.score,
          trace: openTrade.trace,
        });
      }
    }

    return this.buildResults(
      symbol,
      strategyConfig.timeframe,
      candles.length,
      trades,
      initialBalance,
      balance,
      maxDrawdown,
      equityCurve
    );
  }

  private buildResults(
    symbol: string,
    timeframe: string,
    candlesAnalyzed: number,
    trades: BacktestTrade[],
    initialBalance: number,
    finalBalance: number,
    maxDrawdown: number,
    equityCurve: Array<{ index: number; equity: number }>
  ): BacktestResults {
    const wins = trades.filter((t) => t.pnl > 0);
    const losses = trades.filter((t) => t.pnl <= 0);
    const totalPnl = finalBalance - initialBalance;
    const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
    const avgWin =
      wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
    const avgLoss =
      losses.length > 0
        ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length)
        : 0;
    const expectancy = (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss;

    // Sharpe: sample daily returns — bars per day derived from timeframe
    const barsPerDay = timeframeToBarsPerHour(timeframe) * 24;
    const dailyPoints = equityCurve.filter((_, idx) => idx % Math.max(1, Math.round(barsPerDay)) === 0);
    const dailyReturns: number[] = [];
    for (let i = 1; i < dailyPoints.length; i++) {
      const prev = dailyPoints[i - 1];
      const curr = dailyPoints[i];
      if (prev && curr && prev.equity !== 0) {
        dailyReturns.push((curr.equity - prev.equity) / prev.equity);
      }
    }

    const meanR =
      dailyReturns.length > 0
        ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
        : 0;
    const stdR =
      dailyReturns.length > 1
        ? Math.sqrt(
            dailyReturns.reduce((s, r) => s + (r - meanR) ** 2, 0) /
              dailyReturns.length
          )
        : 0;
    const sharpeRatio = stdR > 0 ? (meanR / stdR) * Math.sqrt(365) : 0;

    return {
      symbol,
      timeframe,
      candlesAnalyzed,
      tradesTotal: trades.length,
      tradesWon: wins.length,
      tradesLost: losses.length,
      winRate,
      totalPnl,
      totalPnlPercent: (totalPnl / initialBalance) * 100,
      avgWin,
      avgLoss,
      maxDrawdown,
      maxDrawdownPercent: (maxDrawdown / initialBalance) * 100,
      expectancy,
      sharpeRatio,
      trades,
      equityCurve,
    };
  }
}
