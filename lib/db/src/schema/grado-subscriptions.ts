import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const gradoSubscriptionsTable = pgTable("grado_subscriptions", {
  id: serial("id").primaryKey(),
  supabaseUserId: text("supabase_user_id"),
  username: text("username").notNull(),
  plan: text("plan").notNull().default("elite"),
  amountMad: integer("amount_mad").notNull().default(359),
  periodMonths: integer("period_months").notNull().default(1),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method").notNull().default("virement"),
  notes: text("notes"),
  validatedBy: text("validated_by"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  validatedAt: timestamp("validated_at"),
  expiresAt: timestamp("expires_at"),
});

export type GradoSubscription = typeof gradoSubscriptionsTable.$inferSelect;
export type NewGradoSubscription = typeof gradoSubscriptionsTable.$inferInsert;
