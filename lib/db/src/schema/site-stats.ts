import { pgTable, serial, integer, timestamp, text } from "drizzle-orm/pg-core";

export const siteStatsTable = pgTable("site_stats", {
  id: serial("id").primaryKey(),
  visits: integer("visits").notNull().default(0),
  registrations: integer("registrations").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const visitLogsTable = pgTable("visit_logs", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SiteStats = typeof siteStatsTable.$inferSelect;
