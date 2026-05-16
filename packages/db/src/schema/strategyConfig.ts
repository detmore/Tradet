import { pgTable, uuid, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export const strategyConfigs = pgTable("strategy_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  version: integer("version").notNull().default(1),
  timeframe: text("timeframe").notNull().default("15m"),
  symbols: jsonb("symbols").notNull().default("[]"),
  enabled: boolean("enabled").notNull().default(true),
  thresholds: jsonb("thresholds").notNull().default({}),
  flags: jsonb("flags").notNull().default({}),
  risk: jsonb("risk").notNull().default({}),
  exits: jsonb("exits").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
});

export type StrategyConfigRow = typeof strategyConfigs.$inferSelect;
export type StrategyConfigInsert = typeof strategyConfigs.$inferInsert;
