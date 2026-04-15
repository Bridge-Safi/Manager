import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { driversTable } from "./drivers";
import { ordersTable } from "./orders";

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => driversTable.id),
  orderId: integer("order_id").references(() => ordersTable.id),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  sentiment: text("sentiment").notNull().default("neutral"), // positive | negative | neutral
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Review = typeof reviewsTable.$inferSelect;
