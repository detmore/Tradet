import type { Db } from "@trade/db";
import type { StrategyConfig } from "@trade/shared";
import type { Logger } from "../observability/logger.js";
import { RISK_DEFAULTS, EXIT_DEFAULTS, THRESHOLD_DEFAULTS, FLAG_DEFAULTS } from "@trade/config";
import type { StrategyThresholds } from "@trade/shared";

// JSON stores Infinity as null — restore it after DB read
function fixThresholds(t: StrategyThresholds): StrategyThresholds {
  return { ...t, atrMax: t.atrMax == null ? Infinity : t.atrMax };
}
import { eq } from "drizzle-orm";

export class StrategyConfigLoader {
  private cached: StrategyConfig | null = null;

  constructor(private readonly db: Db, private readonly logger: Logger) {}

  async load(): Promise<StrategyConfig> {
    const { strategyConfigs } = await import("@trade/db");
    const rows = await this.db
      .select()
      .from(strategyConfigs)
      .where(eq(strategyConfigs.enabled, true))
      .limit(1);

    const row = rows[0];
    if (!row) throw new Error("No enabled strategy config found in DB");

    const config: StrategyConfig = {
      id: row.id,
      name: row.name,
      version: row.version,
      timeframe: row.timeframe,
      symbols: row.symbols as string[],
      enabled: row.enabled,
      thresholds: fixThresholds({ ...THRESHOLD_DEFAULTS, ...(row.thresholds as object) }),
      flags: { ...FLAG_DEFAULTS, ...(row.flags as object) },
      risk: { ...RISK_DEFAULTS, ...(row.risk as object) },
      exits: { ...EXIT_DEFAULTS, ...(row.exits as object) },
    };

    this.cached = config;
    this.logger.info(
      { configId: config.id, timeframe: config.timeframe, symbols: config.symbols },
      "Strategy config loaded"
    );
    return config;
  }

  getCached(): StrategyConfig | null {
    return this.cached;
  }
}
