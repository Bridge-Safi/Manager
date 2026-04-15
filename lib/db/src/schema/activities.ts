import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { driversTable } from "./drivers";
import { ordersTable } from "./orders";

export const activitiesTable = pgTable("activities", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").references(() => driversTable.id),
  orderId: integer("order_id").references(() => ordersTable.id),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Activity = typeof activitiesTable.$inferSelect;
