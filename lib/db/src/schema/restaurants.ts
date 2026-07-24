import { pgTable, serial, text, real, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const restaurantsTable = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  status: text("status").notNull().default("open"),
  avgPrepTime: integer("avg_prep_time").notNull().default(20),
  cuisine: text("cuisine"),
  notes: text("notes"),
  /** Platform this vendor belongs to: eats | tabac | pharmacie | boulangerie | souk | supermarche | fleurs */
  platform: text("platform").notNull().default("eats"),
  isActive: boolean("is_active").notNull().default(true),
  lastOrderAt: timestamp("last_order_at"),
  email: text("email"),
  passwordHash: text("password_hash"),
  lat: real("lat"),
  lng: real("lng"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Restaurant = typeof restaurantsTable.$inferSelect;
