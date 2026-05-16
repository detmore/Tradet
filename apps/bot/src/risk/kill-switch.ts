import type { Db } from "@trade/db";
import type { Logger } from "../observability/logger.js";

export class KillSwitchService {
  private active = false;
  private readonly db: Db;
  private readonly logger: Logger;

  constructor(db: Db, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  async load(): Promise<void> {
    const { botSettings } = await import("@trade/db");
    const rows = await this.db
      .select({ ks: botSettings.killSwitchActive })
      .from(botSettings)
      .limit(1);
    this.active = rows[0]?.ks ?? false;
  }

  isActive(): boolean {
    return this.active;
  }

  async activate(): Promise<void> {
    const { botSettings } = await import("@trade/db");
    await this.db.update(botSettings).set({ killSwitchActive: true });
    this.active = true;
    this.logger.error("KILL SWITCH ACTIVATED");
  }

  async deactivate(): Promise<void> {
    const { botSettings } = await import("@trade/db");
    await this.db.update(botSettings).set({ killSwitchActive: false });
    this.active = false;
    this.logger.warn("Kill switch deactivated");
  }
}
