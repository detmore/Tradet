import type { Db } from "@trade/db";
import type { Fill, Order, ExitReason } from "@trade/shared";
import type { Logger } from "../observability/logger.js";
import { computeRealizedPnl } from "./pnl.js";
import { eq } from "drizzle-orm";

export class PositionService {
  constructor(private readonly db: Db, private readonly logger: Logger) {}

  async openPosition(order: Order, fill: Fill, sl: string, tp: string): Promise<void> {
    const { positions } = await import("@trade/db");
    await this.db.insert(positions).values({
      symbol: order.symbol,
      side: order.side,
      qty: fill.qty,
      avgEntry: fill.price,
      status: "open",
      mode: order.mode,
      sl,
      tp,
      strategyRunId: order.strategyRunId ?? null,
    });
    this.logger.info({ symbol: order.symbol, entry: fill.price, sl, tp }, "Position opened");
  }

  async closePosition(
    positionId: string,
    exitPrice: string,
    exitReason: ExitReason,
    fees: string,
    decisionScore?: string
  ): Promise<void> {
    const { positions, trades } = await import("@trade/db");
    const rows = await this.db.select().from(positions).where(eq(positions.id, positionId));
    const pos = rows[0];
    if (!pos) throw new Error(`Position ${positionId} not found`);

    const pnl = computeRealizedPnl(
      parseFloat(pos.avgEntry),
      parseFloat(exitPrice),
      parseFloat(pos.qty),
      parseFloat(fees)
    );

    const closedAt = new Date();

    await this.db
      .update(positions)
      .set({ status: "closed", closedAt })
      .where(eq(positions.id, positionId));

    await this.db.insert(trades).values({
      positionId,
      symbol: pos.symbol,
      side: pos.side,
      entryPrice: pos.avgEntry,
      exitPrice,
      qty: pos.qty,
      realizedPnl: pnl.toFixed(8),
      fees,
      openedAt: pos.openedAt,
      closedAt,
      durationMs: closedAt.getTime() - pos.openedAt.getTime(),
      mode: pos.mode,
      exitReason,
      ...(decisionScore !== undefined && { decisionScore }),
    });

    this.logger.info(
      { positionId, symbol: pos.symbol, pnl: pnl.toFixed(4), exitReason },
      "Position closed"
    );
  }
}
