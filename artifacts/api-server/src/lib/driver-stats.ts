import { db, ordersTable, reviewsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const LIVREUR_PAY_MAD = Number(process.env.LIVREUR_PAY_MAD ?? 6);

export async function getRealDriverStats(driverId: number, services: string) {
  const [deliveryStats] = await db
    .select({
      deliveries: sql<number>`count(distinct ${ordersTable.orderNumber}) filter (where ${ordersTable.status} = 'delivered')::int`,
      orderRevenue: sql<number>`coalesce(sum(${ordersTable.totalAmount}) filter (where ${ordersTable.status} = 'delivered'), 0)::float`,
    })
    .from(ordersTable)
    .where(eq(ordersTable.driverId, driverId));

  const [reviewStats] = await db
    .select({
      rating: sql<number>`round(avg(${reviewsTable.rating})::numeric, 1)::float`,
    })
    .from(reviewsTable)
    .where(eq(reviewsTable.driverId, driverId));

  const deliveries = deliveryStats?.deliveries ?? 0;
  const revenue = services === "nourriture"
    ? deliveries * LIVREUR_PAY_MAD
    : deliveryStats?.orderRevenue ?? 0;

  return {
    totalDeliveries: deliveries,
    totalRevenue: revenue,
    rating: reviewStats?.rating ?? 0,
  };
}