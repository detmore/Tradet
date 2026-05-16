import { pgTable, uuid, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientOrderId: text("client_order_id").notNull().unique(),
  exchangeOrderId: text("exchange_order_id"),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // buy | sell
  type: text("type").notNull().default("market"), // market | limit
  qty: numeric("qty", { precision: 20, scale: 8 }).notNull(),
  price: numeric("price", { precision: 20, scale: 8 }),
  status: text("status").notNull().default("pending"), // pending|open|filled|cancelled|rejected
  mode: text("mode").notNull().default("paper"), // paper | live
  strategyRunId: uuid("strategy_run_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OrderRow = typeof orders.$inferSelect;
export type OrderInsert = typeof orders.$inferInsert;
