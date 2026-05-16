import { pgTable, uuid, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const fills = pgTable("fills", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull(),
  qty: numeric("qty", { precision: 20, scale: 8 }).notNull(),
  price: numeric("price", { precision: 20, scale: 8 }).notNull(),
  fee: numeric("fee", { precision: 20, scale: 8 }).notNull().default("0"),
  feeAsset: text("fee_asset").notNull().default("USDT"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export type FillRow = typeof fills.$inferSelect;
export type FillInsert = typeof fills.$inferInsert;
