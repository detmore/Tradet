import { pgTable, uuid, text, numeric, timestamp, integer, index } from "drizzle-orm/pg-core";

export const equitySnapshots = pgTable("equity_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  takenAt: timestamp("taken_at", { withTimezone: true }).notNull().defaultNow(),
  mode: text("mode").notNull().default("paper"), // paper | live
  totalBalance: numeric("total_balance", { precision: 20, scale: 8 }).notNull(),
  availableBalance: numeric("available_balance", { precision: 20, scale: 8 }).notNull(),
  unrealizedPnl: numeric("unrealized_pnl", { precision: 20, scale: 8 }).notNull().default("0"),
  realizedPnlCum: numeric("realized_pnl_cum", { precision: 20, scale: 8 }).notNull().default("0"),
  openPositionsCount: integer("open_positions_count").notNull().default(0),
}, (t) => [
  index("idx_equity_snapshots_mode_taken_at").on(t.mode, t.takenAt),
]);

export type EquitySnapshotRow = typeof equitySnapshots.$inferSelect;
export type EquitySnapshotInsert = typeof equitySnapshots.$inferInsert;
