import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const riskEvents = pgTable("risk_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: text("category").notNull(), // daily_loss_limit|exposure_limit|cooldown|kill_switch|min_qty
  reason: text("reason").notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RiskEventRow = typeof riskEvents.$inferSelect;
export type RiskEventInsert = typeof riskEvents.$inferInsert;
