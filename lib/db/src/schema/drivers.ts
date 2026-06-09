import { pgTable, serial, text, real, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const driversTable = pgTable("drivers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  vehicleType: text("vehicle_type").notNull().default("moto"),
  status: text("status").notNull().default("available"),
  rating: real("rating").notNull().default(5.0),
  totalDeliveries: integer("total_deliveries").notNull().default(0),
  totalRevenue: real("total_revenue").notNull().default(0),
  totalRefusals: integer("total_refusals").notNull().default(0),
  isBlocked: boolean("is_blocked").notNull().default(false),
  warnedAt: timestamp("warned_at"),
  lat: real("lat"),
  lng: real("lng"),
  avatarUrl: text("avatar_url"),
  services: text("services").notNull().default("nourriture"),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  passwordHash: text("password_hash"),
});

export const insertDriverSchema = createInsertSchema(driversTable).omit({ id: true, createdAt: true });
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof driversTable.$inferSelect;
