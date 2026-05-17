import type { Position, StrategyConfig } from "@trade/shared";
import type { Logger } from "../observability/logger.js";

export type ExitSignal = {
  positionId: string;
  reason: "sl" | "tp" | "trailing" | "invalidation" | "time_exit";
  exitPrice: string;
};

export class ExitManager {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  checkPosition(
    position: Position,
    currentPrice: string,
    config: StrategyConfig,
    currentBarIndex?: number
  ): ExitSignal | null {
    const price = parseFloat(currentPrice);
    const sl = position.sl ? parseFloat(position.sl) : null;
    const tp = position.tp ? parseFloat(position.tp) : null;
    const trailingSl = position.trailingSl ? parseFloat(position.trailingSl) : null;

    if (sl !== null && price <= sl) {
      this.logger.info({ positionId: position.id, price, sl }, "SL triggered");
      return { positionId: position.id, reason: "sl", exitPrice: currentPrice };
    }

    if (tp !== null && price >= tp) {
      this.logger.info({ positionId: position.id, price, tp }, "TP triggered");
      return { positionId: position.id, reason: "tp", exitPrice: currentPrice };
    }

    if (trailingSl !== null && config.exits.trailingEnabled && price <= trailingSl) {
      this.logger.info({ positionId: position.id, price, trailingSl }, "Trailing SL triggered");
      return { positionId: position.id, reason: "trailing", exitPrice: currentPrice };
    }

    // Time-based exit: close if position held too long without hitting SL/TP
    const maxBars = config.exits.maxBarsInPosition ?? 0;
    if (maxBars > 0 && currentBarIndex !== undefined) {
      const openedAt = new Date(position.openedAt).getTime();
      const currentTime = currentBarIndex; // passed as bar count from caller
      if (currentTime >= maxBars) {
        this.logger.info({ positionId: position.id, barsHeld: currentTime, maxBars }, "Time exit triggered");
        return { positionId: position.id, reason: "time_exit", exitPrice: currentPrice };
      }
    }

    return null;
  }

  computeTrailingSl(
    entryPrice: number,
    currentPrice: number,
    atr: number,
    slAtrMult: number
  ): number | null {
    const entryPlusSl = entryPrice + atr * slAtrMult;
    if (currentPrice < entryPlusSl) return null;
    return currentPrice - atr * slAtrMult;
  }
}
