import { pgTable, uuid, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const positions = pgTable("positions", {
  id: uuid("id").primaryKey().defaultRandom(),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // buy | sell
  qty: numeric("qty", { precision: 20, scale: 8 }).notNull(),
  avgEntry: numeric("avg_entry", { precision: 20, scale: 8 }).notNull(),
  status: text("status").notNull().default("open"), // open | closed
  mode: text("mode").notNull().default("paper"), // paper | live
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  sl: numeric("sl", { precision: 20, scale: 8 }),
  tp: numeric("tp", { precision: 20, scale: 8 }),
  trailingSl: numeric("trailing_sl", { precision: 20, scale: 8 }),
  strategyRunId: uuid("strategy_run_id"),
});

export type PositionRow = typeof positions.$inferSelect;
export type PositionInsert = typeof positions.$inferInsert;
