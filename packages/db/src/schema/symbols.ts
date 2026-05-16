import { pgTable, text, integer, numeric } from "drizzle-orm/pg-core";

export const symbols = pgTable("symbols", {
  symbol: text("symbol").primaryKey(),
  exchange: text("exchange").notNull(),
  baseAsset: text("base_asset").notNull(),
  quoteAsset: text("quote_asset").notNull(),
  minQty: numeric("min_qty", { precision: 20, scale: 8 }).notNull().default("0"),
  pricePrecision: integer("price_precision").notNull().default(8),
  qtyPrecision: integer("qty_precision").notNull().default(8),
});

export type SymbolRow = typeof symbols.$inferSelect;
