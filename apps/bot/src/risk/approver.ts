import type { Decision, ApprovedOrder, RiskRejection, StrategyConfig } from "@trade/shared";
import type { DailyLimitsTracker } from "./limits.js";
import type { ConsecutiveLossTracker } from "./cooldown.js";
import type { KillSwitchService } from "./kill-switch.js";
import type { Logger } from "../observability/logger.js";
import { computePositionSize } from "./sizing.js";

export class RiskApprover {
  constructor(
    private readonly limits: DailyLimitsTracker,
    private readonly cooldown: ConsecutiveLossTracker,
    private readonly killSwitch: KillSwitchService,
    private readonly logger: Logger
  ) {}

  approve(
    decision: Decision,
    symbol: string,
    balance: number,
    currentPrice: number,
    config: StrategyConfig,
    strategyRunId: string
  ): ApprovedOrder | RiskRejection {
    if (this.killSwitch.isActive()) {
      return { category: "kill_switch", reason: "Kill switch is active" };
    }

    if (this.cooldown.isInCooldown()) {
      return { category: "cooldown", reason: "In cooldown period after consecutive losses" };
    }

    if (this.limits.isDailyLossExceeded(balance, config.risk.maxDailyLoss)) {
      return { category: "daily_loss_limit", reason: "Daily loss limit reached" };
    }

    if (this.limits.isExposureLimitExceeded(balance, config.risk.maxOpenExposure)) {
      return { category: "exposure_limit", reason: "Max open exposure reached" };
    }

    // Extract ATR from the atr_range_filter trace layer (value field holds the raw ATR number)
    const atrLayer = decision.trace.find((l) => l.layer === "atr_range_filter");
    const rawAtrValue = atrLayer?.value;
    const atrValue = typeof rawAtrValue === "number" && rawAtrValue > 0 ? rawAtrValue : null;

    if (atrValue === null) {
      return { category: "min_qty", reason: "ATR unavailable — cannot compute SL/TP levels" };
    }

    const sl = currentPrice - atrValue * config.exits.slAtrMult;
    if (sl <= 0) {
      return { category: "min_qty", reason: "SL would be at or below zero — asset price too low relative to ATR" };
    }
    const tp = currentPrice + atrValue * config.exits.tpAtrMult;
    const qty = computePositionSize(balance, config.risk.riskPerTrade, currentPrice, sl, config.risk.maxOpenExposure);

    if (qty <= 0) {
      return { category: "min_qty", reason: "Computed position size is zero or negative" };
    }

    this.logger.info(
      { symbol, qty: qty.toFixed(6), sl: sl.toFixed(2), tp: tp.toFixed(2) },
      "Risk approved"
    );

    return {
      symbol,
      side: "buy",
      qty: qty.toFixed(6),
      sl: sl.toFixed(2),
      tp: tp.toFixed(2),
      strategyRunId,
      strategyConfigId: config.id,
    };
  }

  onPositionOpened(notionalValue: number): void {
    this.limits.recordOpenPosition(notionalValue);
  }

  onPositionClosed(
    pnl: number,
    notionalValue: number,
    consecutiveLossPause: number,
    cooldownDurationHours: number
  ): void {
    this.limits.releaseOpenPosition(notionalValue);
    if (pnl < 0) {
      this.limits.recordLoss(Math.abs(pnl));
      this.cooldown.recordLoss();
      if (this.cooldown.getConsecutiveLosses() >= consecutiveLossPause) {
        this.cooldown.activateCooldown(cooldownDurationHours);
        this.logger.warn(
          { consecutiveLossPause, cooldownDurationHours },
          "Consecutive loss threshold reached — cooldown activated"
        );
      }
    } else {
      this.cooldown.recordWin();
    }
  }
}
