import postgres from "postgres";
import type { Logger } from "../observability/logger.js";

export type NotifyChannel = "trade_events" | "equity_events" | "alert_events" | "settings_events";

export class PostgresNotifyPublisher {
  private readonly sql: ReturnType<typeof postgres>;
  private readonly logger: Logger;

  constructor(databaseUrl: string, logger: Logger) {
    this.sql = postgres(databaseUrl, { max: 2 });
    this.logger = logger;
  }

  async publish(channel: NotifyChannel, payload: Record<string, unknown>): Promise<void> {
    try {
      await this.sql.notify(channel, JSON.stringify(payload));
    } catch (err) {
      this.logger.error({ err, channel }, "Failed to publish PG NOTIFY");
    }
  }

  async close(): Promise<void> {
    await this.sql.end();
  }
}
