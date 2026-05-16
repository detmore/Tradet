import type { StrategyConfig } from "@trade/shared";
import type { CandleService } from "../market-data/candles.js";
import type { StrategyPipeline, EvaluationContext } from "../strategy/pipeline.js";
import type { DecisionTraceWriter } from "../strategy/decision-trace.js";
import type { RiskApprover } from "../risk/approver.js";
import type { OrderManagementService } from "../execution/oms.js";
import type { ExitManager } from "../execution/exits.js";
import type { PositionService } from "../portfolio/positions.js";
import type { AlertDispatcher } from "../alerts/dispatcher.js";
import type { PostgresNotifyPublisher } from "./notify.js";
import type { DomainEventBus } from "../observability/events.js";
import type { Logger } from "../observability/logger.js";
import type { Db } from "@trade/db";
import type { ApprovedOrder } from "@trade/shared";
import { computeAllIndicators } from "../market-data/indicators/index.js";
import { eq, and } from "drizzle-orm";
import { latestAtr } from "../market-data/indicators/atr.js";

export interface EvaluationLoopDeps {
  db: Db;
  candles: CandleService;
  pipeline: StrategyPipeline;
  traceWriter: DecisionTraceWriter;
  approver: RiskApprover;
  oms: OrderManagementService;
  exitManager: ExitManager;
  positions: PositionService;
  alertDispatcher: AlertDispatcher;
  notify: PostgresNotifyPublisher;
  events: DomainEventBus;
  logger: Logger;
  /** Live mode only: fetch real account balance from exchange on demand */
  getLiveBalance?: () => Promise<string>;
}

export class EvaluationLoop {
  constructor(
    private readonly deps: EvaluationLoopDeps,
    private readonly mode: "paper" | "live"
  ) {}

  async onTick(symbol: string, timeframe: string, config: StrategyConfig): Promise<void> {
    const { db, candles, pipeline, traceWriter, approver, oms, positions, alertDispatcher, notify, logger } =
      this.deps;

    // Check exits on open positions first
    await this.checkExits(symbol, config);

    // Get candle window and compute indicators
    const window = candles.getWindow(symbol, timeframe);
    if (window.length < 210) {
      logger.debug({ symbol, timeframe, windowSize: window.length }, "Insufficient candle history, skipping");
      return;
    }

    const latestCandle = window[window.length - 1]!;
    const indicators = computeAllIndicators(window, config.flags);

    const ctx: EvaluationContext = {
      symbol,
      timeframe,
      candle: latestCandle,
      indicators,
      config,
    };

    const decision = pipeline.evaluate(ctx);

    // Persist decision trace
    const strategyRunId = await traceWriter.write(decision, symbol, timeframe as import("@trade/shared").Timeframe, config.id);

    if (decision.action !== "buy") {
      logger.debug({ symbol, decision: decision.action, score: decision.score }, "No trade signal");
      return;
    }

    // Guard: do not open a second position for the same symbol/mode while one is already open
    const { positions: positionsTable, botSettings } = await import("@trade/db");
    const existing = await db
      .select({ id: positionsTable.id })
      .from(positionsTable)
      .where(and(eq(positionsTable.symbol, symbol), eq(positionsTable.status, "open"), eq(positionsTable.mode, this.mode)))
      .limit(1);
    if (existing.length > 0) {
      logger.debug({ symbol }, "Position already open — skipping new entry");
      return;
    }

    // Re-read balance after exits (checkExits may have restored balance from closed positions)
    const settingsRows = await db.select().from(botSettings).limit(1);
    const settings = settingsRows[0];
    if (!settings || settings.killSwitchActive) return;

    // Live mode: fetch fresh balance from exchange (DB value can be up to 5min stale)
    // Paper mode: use DB-tracked balance
    let rawBalance: string | null;
    if (this.mode === "live" && this.deps.getLiveBalance) {
      try {
        rawBalance = await this.deps.getLiveBalance();
      } catch (err) {
        logger.error({ err, symbol }, "Failed to fetch live balance — skipping trade");
        return;
      }
    } else {
      rawBalance = settings.paperCurrentBalance;
    }
    const balance = parseFloat(rawBalance ?? "0");
    if (isNaN(balance) || balance <= 0) {
      logger.warn({ symbol, mode: this.mode }, "Invalid balance — skipping trade");
      return;
    }
    const currentPrice = String(latestCandle.close);
    const currentPriceNum = parseFloat(currentPrice);

    const result = approver.approve(decision, symbol, balance, currentPriceNum, config, strategyRunId);

    // Discriminate RiskRejection from ApprovedOrder by presence of "symbol" key
    if (!("symbol" in result)) {
      const rejection = result;
      logger.warn({ symbol, reason: rejection.reason, category: rejection.category }, "Risk rejected");

      const { riskEvents, strategyRuns } = await import("@trade/db");
      await db.insert(riskEvents).values({
        category: rejection.category,
        reason: rejection.reason,
        payload: { symbol, score: decision.score },
      });
      await db.update(strategyRuns).set({ riskApproved: false, riskRejectionReason: rejection.reason })
        .where(eq(strategyRuns.id, strategyRunId));
      return;
    }

    const approvedOrder = result as ApprovedOrder;

    // Update strategy_run with risk approval
    const { strategyRuns } = await import("@trade/db");
    await db.update(strategyRuns).set({ riskApproved: true }).where(eq(strategyRuns.id, strategyRunId));

    // Son kontrol: fill cost balance'ı geçemez
    const estFillCost = parseFloat(approvedOrder.qty) * currentPriceNum * 1.001;
    if (estFillCost > balance) {
      logger.warn({ symbol, estFillCost, balance }, "Fill cost exceeds balance — skipping trade");
      return;
    }

    // Place order
    const { order, fill } = await oms.placeOrder(approvedOrder);

    // Open position
    await positions.openPosition(order, fill, approvedOrder.sl, approvedOrder.tp);

    // Update exposure tracker
    const openNotional = parseFloat(fill.price) * parseFloat(fill.qty);
    approver.onPositionOpened(openNotional);

    // Paper mode only: deduct fill cost from tracked balance
    // Live mode: balance is synced from exchange, no manual deduction needed
    if (this.mode === "paper") {
      const fillCost = parseFloat(fill.price) * parseFloat(fill.qty) + parseFloat(fill.fee);
      await db.update(botSettings).set({
        paperCurrentBalance: String((balance - fillCost).toFixed(8)),
      }).where(eq(botSettings.id, settings.id));
    }

    // Notify dashboard
    await notify.publish("trade_events", {
      type: "position_opened",
      symbol,
      side: order.side,
      qty: fill.qty,
      price: fill.price,
      sl: approvedOrder.sl,
      tp: approvedOrder.tp,
    });

    // Telegram alert
    await alertDispatcher.dispatch(
      "trade_opened",
      "info",
      `Trade Opened: ${symbol}`,
      `${order.side.toUpperCase()} ${fill.qty} @ ${fill.price} | SL: ${approvedOrder.sl} TP: ${approvedOrder.tp}`
    );

    logger.info(
      { symbol, side: order.side, qty: fill.qty, price: fill.price, sl: approvedOrder.sl, tp: approvedOrder.tp },
      "Trade opened"
    );
  }

  private async checkExits(symbol: string, config: StrategyConfig): Promise<void> {
    const { db, exitManager, positions, approver, alertDispatcher, notify, logger, candles } = this.deps;
    const { positions: positionsTable, botSettings } = await import("@trade/db");

    const openPositions = await db
      .select()
      .from(positionsTable)
      .where(and(eq(positionsTable.symbol, symbol), eq(positionsTable.status, "open"), eq(positionsTable.mode, this.mode)));

    if (openPositions.length === 0) return;

    // Use latest candle close as current price for paper trading
    const window = candles.getWindow(symbol, config.timeframe);
    const latestCandle = window[window.length - 1];
    if (!latestCandle) return;

    const currentPrice = String(latestCandle.close);

    for (const pos of openPositions) {
      const mappedPos: import("@trade/shared").Position = {
        id: pos.id,
        symbol: pos.symbol,
        side: pos.side as "buy" | "sell",
        qty: pos.qty,
        avgEntry: pos.avgEntry,
        status: pos.status as "open" | "closed",
        mode: pos.mode as "paper" | "live",
        openedAt: pos.openedAt,
        ...(pos.closedAt !== null && pos.closedAt !== undefined && { closedAt: pos.closedAt }),
        ...(pos.sl !== null && pos.sl !== undefined && { sl: pos.sl }),
        ...(pos.tp !== null && pos.tp !== undefined && { tp: pos.tp }),
        ...(pos.trailingSl !== null && pos.trailingSl !== undefined && { trailingSl: pos.trailingSl }),
        ...(pos.strategyRunId !== null && pos.strategyRunId !== undefined && { strategyRunId: pos.strategyRunId }),
      };

      // Update trailing SL before checking for an exit
      if (config.exits.trailingEnabled) {
        const currentAtr = latestAtr(window, 14);
        const newTrailingSl = exitManager.computeTrailingSl(
          parseFloat(pos.avgEntry),
          parseFloat(currentPrice),
          currentAtr,
          config.exits.slAtrMult
        );
        if (newTrailingSl !== null) {
          const existingTrail = pos.trailingSl ? parseFloat(pos.trailingSl) : null;
          // Only ratchet trailing SL up (never down)
          if (existingTrail === null || newTrailingSl > existingTrail) {
            await db
              .update(positionsTable)
              .set({ trailingSl: String(newTrailingSl.toFixed(8)) })
              .where(eq(positionsTable.id, pos.id));
            mappedPos.trailingSl = String(newTrailingSl.toFixed(8));
          }
        }
      }

      const exitSignal = exitManager.checkPosition(mappedPos, currentPrice, config);
      if (!exitSignal) continue;

      const exitPriceNum = parseFloat(exitSignal.exitPrice);
      const qtyNum = parseFloat(pos.qty);
      const fee = (exitPriceNum * qtyNum * 0.001).toFixed(8);

      // Look up the decision score from the originating strategy run, if available
      let decisionScore: string | undefined;
      if (pos.strategyRunId) {
        const { strategyRuns } = await import("@trade/db");
        const runRows = await db
          .select({ score: strategyRuns.score })
          .from(strategyRuns)
          .where(eq(strategyRuns.id, pos.strategyRunId));
        decisionScore = runRows[0]?.score ?? undefined;
      }

      try {
        await positions.closePosition(exitSignal.positionId, exitSignal.exitPrice, exitSignal.reason, fee, decisionScore);
      } catch (err) {
        logger.error({ err, positionId: exitSignal.positionId }, "Failed to close position — skipping");
        continue;
      }

      // Update risk trackers
      const closePnl = (exitPriceNum - parseFloat(pos.avgEntry)) * qtyNum - parseFloat(fee);
      const closeNotional = exitPriceNum * qtyNum;
      approver.onPositionClosed(
        closePnl,
        closeNotional,
        config.risk.consecutiveLossPause,
        config.risk.cooldownDurationHours
      );

      // Paper mode only: restore balance from exit proceeds
      // Live mode: balance synced from exchange automatically
      if (this.mode === "paper") {
        const settingsRows = await db.select().from(botSettings).limit(1);
        const exitSettings = settingsRows[0];
        if (exitSettings) {
          const proceeds = exitPriceNum * qtyNum - parseFloat(fee);
          await db.update(botSettings).set({
            paperCurrentBalance: String((parseFloat(exitSettings.paperCurrentBalance) + proceeds).toFixed(8)),
          }).where(eq(botSettings.id, exitSettings.id));
        }
      }

      await notify.publish("trade_events", {
        type: "position_closed",
        symbol,
        exitReason: exitSignal.reason,
        exitPrice: exitSignal.exitPrice,
      });

      const alertCategory: import("@trade/shared").AlertCategory =
        exitSignal.reason === "sl"
          ? "sl_hit"
          : exitSignal.reason === "tp"
            ? "tp_hit"
            : "trade_closed";

      await alertDispatcher.dispatch(
        alertCategory,
        "info",
        `Trade Closed: ${symbol}`,
        `Exit: ${exitSignal.reason.toUpperCase()} @ ${exitSignal.exitPrice}`
      );

      logger.info({ symbol, reason: exitSignal.reason, price: exitSignal.exitPrice }, "Position closed");
    }
  }
}
