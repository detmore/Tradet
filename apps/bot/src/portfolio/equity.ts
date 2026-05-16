import type { Db } from "@trade/db";
import type { Logger } from "../observability/logger.js";
import type { BotMode } from "@trade/shared";
import { sql, and } from "drizzle-orm";

export class EquityService {
  private snapshotTimer?: NodeJS.Timeout;

  constructor(
    private readonly db: Db,
    private readonly logger: Logger,
    private readonly mode: BotMode
  ) {}

  start(intervalMs = 5 * 60_000): void {
    this.snapshotTimer = setInterval(() => void this.takeSnapshot(), intervalMs);
  }

  stop(): void {
    if (this.snapshotTimer) clearInterval(this.snapshotTimer);
  }

  async takeSnapshot(): Promise<void> {
    const { botSettings, positions, equitySnapshots, trades } = await import("@trade/db");
    const { eq } = await import("drizzle-orm");

    const settingsRows = await this.db.select().from(botSettings).limit(1);
    const settings = settingsRows[0];
    if (!settings) return;

    const openPositions = await this.db
      .select()
      .from(positions)
      .where(and(eq(positions.status, "open"), eq(positions.mode, this.mode)));

    // Compute cumulative realized PnL from the trades table (same mode only)
    const pnlRows = await this.db
      .select({ total: sql<string>`COALESCE(SUM(${trades.realizedPnl}), 0)` })
      .from(trades)
      .where(eq(trades.mode, this.mode));
    const realizedPnlCum = pnlRows[0]?.total ?? "0";

    // Unrealized PnL requires current market price; EquityService has no price feed.
    // Set to 0 here — the dashboard reads live price via Binance and can compute it client-side.
    const unrealizedPnl = 0;

    const currentBalance = this.mode === "live"
      ? (settings.liveCurrentBalance ?? settings.paperCurrentBalance)
      : settings.paperCurrentBalance;

    await this.db.insert(equitySnapshots).values({
      mode: this.mode,
      totalBalance: currentBalance,
      availableBalance: currentBalance,
      unrealizedPnl: unrealizedPnl.toFixed(8),
      realizedPnlCum,
      openPositionsCount: openPositions.length,
    });

    this.logger.debug(
      { balance: settings.paperCurrentBalance, openPositions: openPositions.length, realizedPnlCum },
      "Equity snapshot taken"
    );
  }
}
