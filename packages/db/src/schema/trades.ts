import { pgTable, uuid, text, numeric, timestamp, bigint, index } from "drizzle-orm/pg-core";

export const trades = pgTable("trades", {
  id: uuid("id").primaryKey().defaultRandom(),
  positionId: uuid("position_id").notNull(),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // buy | sell
  entryPrice: numeric("entry_price", { precision: 20, scale: 8 }).notNull(),
  exitPrice: numeric("exit_price", { precision: 20, scale: 8 }).notNull(),
  qty: numeric("qty", { precision: 20, scale: 8 }).notNull(),
  realizedPnl: numeric("realized_pnl", { precision: 20, scale: 8 }).notNull(),
  fees: numeric("fees", { precision: 20, scale: 8 }).notNull().default("0"),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }).notNull(),
  durationMs: bigint("duration_ms", { mode: "number" }).notNull().default(0),
  decisionScore: numeric("decision_score", { precision: 5, scale: 2 }),
  mode: text("mode").notNull().default("paper"), // paper | live
  exitReason: text("exit_reason").notNull(), // sl|tp|trailing|invalidation|manual
}, (t) => [
  index("idx_trades_mode_closed_at").on(t.mode, t.closedAt),
  index("idx_trades_symbol_mode").on(t.symbol, t.mode),
]);

export type TradeRow = typeof trades.$inferSelect;
export type TradeInsert = typeof trades.$inferInsert;
