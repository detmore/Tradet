import type { Db } from "@trade/db";
import type { Decision, Timeframe } from "@trade/shared";
import type { Logger } from "../observability/logger.js";

export class DecisionTraceWriter {
  constructor(private readonly db: Db, private readonly logger: Logger) {}

  async write(
    decision: Decision,
    symbol: string,
    timeframe: Timeframe,
    strategyConfigId: string | undefined
  ): Promise<string> {
    const { strategyRuns } = await import("@trade/db");

    const [row] = await this.db
      .insert(strategyRuns)
      .values({
        strategyConfigId: strategyConfigId ?? null,
        symbol,
        timeframe,
        decision: decision.action,
        score: String(decision.score),
        trace: decision.trace,
        mandatoryPassed: decision.mandatoryPassed,
        setupPassed: decision.setupPassed,
        confirmationsPassed: decision.confirmationsPassed,
        structurePassed: decision.structurePassed,
      })
      .returning({ id: strategyRuns.id });

    if (!row) throw new Error("Failed to write strategy run");
    this.logger.debug(
      { id: row.id, symbol, decision: decision.action, score: decision.score },
      "Decision trace written"
    );
    return row.id;
  }
}
