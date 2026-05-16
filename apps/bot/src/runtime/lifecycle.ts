import type { Logger } from "../observability/logger.js";
import type { Db } from "@trade/db";
import { eq } from "drizzle-orm";

const BOT_SETTINGS_ID = 1;

export class LifecycleService {
  private running = false;
  private readonly db: Db;
  private readonly logger: Logger;
  private pollTimer?: NodeJS.Timeout;

  constructor(db: Db, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  async start(): Promise<void> {
    this.running = true;
    const { botSettings } = await import("@trade/db");
    await this.db
      .update(botSettings)
      .set({ isRunning: true, updatedAt: new Date() })
      .where(eq(botSettings.id, BOT_SETTINGS_ID));
    this.pollTimer = setInterval(() => void this.checkSettings(), 10_000);
    this.logger.info("Lifecycle started");
  }

  isRunning(): boolean {
    return this.running;
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.pollTimer) clearInterval(this.pollTimer);
    try {
      const { botSettings } = await import("@trade/db");
      await this.db
        .update(botSettings)
        .set({ isRunning: false, updatedAt: new Date() })
        .where(eq(botSettings.id, BOT_SETTINGS_ID));
    } catch { /* silent during shutdown */ }
    this.logger.info("Lifecycle stopped");
  }

  private async checkSettings(): Promise<void> {
    try {
      const { botSettings } = await import("@trade/db");
      const rows = await this.db.select().from(botSettings).limit(1);
      const settings = rows[0];
      if (!settings) return;

      if (settings.killSwitchActive && this.running) {
        this.logger.warn("Kill switch activated — stopping bot");
        await this.stop();
      }
    } catch (err) {
      this.logger.error({ err }, "Failed to check settings");
    }
  }
}
