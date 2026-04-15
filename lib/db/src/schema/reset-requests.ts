import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { driversTable } from "./drivers";

export const resetRequestsTable = pgTable("reset_requests", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => driversTable.id),
  type: text("type").notNull().default("password"), // "password" | "pin"
  status: text("status").notNull().default("pending"), // "pending" | "sent" | "completed"
  resetCode: text("reset_code").notNull(),
  resetLink: text("reset_link"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  sentAt: timestamp("sent_at"),
});

export type ResetRequest = typeof resetRequestsTable.$inferSelect;
