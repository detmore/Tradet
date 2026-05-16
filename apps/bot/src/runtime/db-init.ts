import type { Db } from "@trade/db";
import type { Logger } from "../observability/logger.js";
import { RISK_DEFAULTS, EXIT_DEFAULTS, THRESHOLD_DEFAULTS, FLAG_DEFAULTS } from "@trade/config";

export class DbInitService {
  constructor(private readonly db: Db, private readonly logger: Logger) {}

  async ensureBotSettings(): Promise<void> {
    const { botSettings } = await import("@trade/db");
    const rows = await this.db.select().from(botSettings).limit(1);
    if (rows.length === 0) {
      await this.db.insert(botSettings).values({
        id: 1,
        mode: "paper",
        paperStartingBalance: "10000",
        paperCurrentBalance: "10000",
        accountCurrency: "USDT",
        isRunning: false,
        killSwitchActive: false,
      });
      this.logger.info("Seeded default bot_settings");
    }
  }

  async ensureDefaultStrategyConfig(): Promise<string> {
    const { strategyConfigs } = await import("@trade/db");
    const rows = await this.db.select().from(strategyConfigs).limit(1);
    if (rows.length > 0) return rows[0]!.id;

    const [row] = await this.db
      .insert(strategyConfigs)
      .values({
        name: "default",
        version: 1,
        timeframe: "15m",
        symbols: ["BTC/USDT"],
        enabled: true,
        thresholds: THRESHOLD_DEFAULTS,
        flags: FLAG_DEFAULTS,
        risk: RISK_DEFAULTS,
        exits: EXIT_DEFAULTS,
      })
      .returning({ id: strategyConfigs.id });

    this.logger.info("Seeded default strategy_config");
    return row!.id;
  }
}
