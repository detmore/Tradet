import type { Db } from "@trade/db";
import type { TelegramClient } from "./telegram.js";
import type { AlertCategory, AlertSeverity } from "@trade/shared";
import type { Logger } from "../observability/logger.js";
import { eq } from "drizzle-orm";

export class AlertDispatcher {
  constructor(
    private readonly db: Db,
    private readonly telegram: TelegramClient | null,
    private readonly logger: Logger
  ) {}

  async dispatch(
    category: AlertCategory,
    severity: AlertSeverity,
    title: string,
    body: string,
    payload?: Record<string, unknown>
  ): Promise<void> {
    const { alerts } = await import("@trade/db");

    const [inserted] = await this.db.insert(alerts).values({
      severity,
      category,
      title,
      body,
      payload: payload ?? null,
      channel: this.telegram ? "telegram" : "internal",
      deliveryStatus: "pending",
    }).returning({ id: alerts.id });

    if (!inserted) return;

    if (this.telegram) {
      try {
        await this.telegram.send(`*${title}*\n${body}`);
        await this.db.update(alerts).set({ deliveryStatus: "sent" }).where(eq(alerts.id, inserted.id));
        this.logger.info({ category, title }, "Alert sent via Telegram");
      } catch (err) {
        await this.db.update(alerts).set({ deliveryStatus: "failed" }).where(eq(alerts.id, inserted.id));
        this.logger.error({ err, category }, "Alert Telegram delivery failed");
      }
    } else {
      await this.db.update(alerts).set({ deliveryStatus: "sent" }).where(eq(alerts.id, inserted.id));
      this.logger.info({ category, title }, "Alert dispatched (internal)");
    }
  }
}
