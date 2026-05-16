import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  severity: text("severity").notNull().default("info"), // info|warning|error|critical
  category: text("category").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  payload: jsonb("payload"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  channel: text("channel").notNull().default("internal"), // telegram|internal
  deliveryStatus: text("delivery_status").notNull().default("pending"), // pending|sent|failed
});

export type AlertRow = typeof alerts.$inferSelect;
export type AlertInsert = typeof alerts.$inferInsert;
