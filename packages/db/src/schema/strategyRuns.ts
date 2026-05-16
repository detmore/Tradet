import { pgTable, uuid, text, numeric, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const strategyRuns = pgTable("strategy_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  strategyConfigId: uuid("strategy_config_id"),
  symbol: text("symbol").notNull(),
  timeframe: text("timeframe").notNull(),
  evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).notNull().defaultNow(),
  decision: text("decision").notNull(), // no_trade | buy | sell | close
  score: numeric("score", { precision: 5, scale: 2 }).notNull().default("0"),
  trace: jsonb("trace").notNull().default([]), // LayerResult[]
  mandatoryPassed: boolean("mandatory_passed").notNull().default(false),
  setupPassed: boolean("setup_passed").notNull().default(false),
  confirmationsPassed: boolean("confirmations_passed").notNull().default(false),
  structurePassed: boolean("structure_passed").notNull().default(false),
  riskApproved: boolean("risk_approved"),
  riskRejectionReason: text("risk_rejection_reason"),
}, (t) => [
  index("idx_strategy_runs_symbol_evaluated_at").on(t.symbol, t.evaluatedAt),
]);

export type StrategyRunRow = typeof strategyRuns.$inferSelect;
export type StrategyRunInsert = typeof strategyRuns.$inferInsert;
