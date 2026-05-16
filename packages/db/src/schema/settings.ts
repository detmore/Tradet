import { pgTable, serial, text, boolean, timestamp, numeric } from "drizzle-orm/pg-core";

export const botSettings = pgTable("bot_settings", {
  id: serial("id").primaryKey(),
  mode: text("mode").notNull().default("paper"),
  paperStartingBalance: numeric("paper_starting_balance", { precision: 20, scale: 8 }).notNull().default("10000"),
  paperCurrentBalance: numeric("paper_current_balance", { precision: 20, scale: 8 }).notNull().default("10000"),
  liveCurrentBalance: numeric("live_current_balance", { precision: 20, scale: 8 }),
  accountCurrency: text("account_currency").notNull().default("USDT"),
  isRunning: boolean("is_running").notNull().default(false),
  killSwitchActive: boolean("kill_switch_active").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BotSettingsRow = typeof botSettings.$inferSelect;
export type BotSettingsInsert = typeof botSettings.$inferInsert;
