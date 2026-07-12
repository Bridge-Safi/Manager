import { Router } from "express";
import { db, ordersTable, driversTable } from "@workspace/db";
import { eq, sql, gte, and, inArray } from "drizzle-orm";

const router = Router();

// Part versée au livreur par livraison effectuée (MAD). Doit suivre BASE_PAY
// côté app Livreurs (6 MAD). Surchargeable via la variable d'env LIVREUR_PAY_MAD.
const LIVREUR_PAY_MAD = Number(process.env.LIVREUR_PAY_MAD ?? 6);
// Ce que Bridge encaisse par commande livrée (frais de livraison côté client,
// 12 MAD par défaut — DELIVERY_FEE de Bridge Eats). Le reste du montant
// encaissé revient au commerçant. Surchargeable via BRIDGE_FEE_MAD.
const BRIDGE_FEE_MAD = Number(process.env.BRIDGE_FEE_MAD ?? 12);

router.get("/summary", async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [orderStats] = await db
    .select({
      totalOrders: sql<number>`count(*)::int`,
      pendingOrders: sql<number>`count(*) filter (where status = 'pending')::int`,
      inDeliveryOrders: sql<number>`count(*) filter (where status = 'in_delivery')::int`,
      deliveredOrders: sql<number>`count(*) filter (where status = 'delivered')::int`,
      cancelledOrders: sql<number>`count(*) filter (where status = 'cancelled')::int`,
      totalRevenue: sql<number>`coalesce(sum(case when status = 'delivered' then total_amount else 0 end), 0)::float`,
      todayRevenue: sql<number>`coalesce(sum(case when status = 'delivered' and created_at >= ${today} then total_amount else 0 end), 0)::float`,
      todayOrders: sql<number>`count(*) filter (where created_at >= ${today})::int`,
      todayDelivered: sql<number>`count(*) filter (where status = 'delivered' and created_at >= ${today})::int`,
    })
    .from(ordersTable);

  const [driverStats] = await db
    .select({
      activeDrivers: sql<number>`count(*) filter (where status != 'offline')::int`,
      averageRating: sql<number>`coalesce(avg(rating), 0)::float`,
    })
    .from(driversTable);

  // Calculate alert count inline
  let alertCount = 0;

  // pending orders > 10 min
  const pendingOrders = await db.select().from(ordersTable).where(eq(ordersTable.status, "pending"));
  const now = new Date();
  for (const order of pendingOrders) {
    const mins = Math.floor((now.getTime() - new Date(order.createdAt).getTime()) / 60000);
    if (mins >= 10) alertCount++;
  }

  // offline drivers with active orders
  const offlineDrivers = await db.select({ id: driversTable.id }).from(driversTable).where(eq(driversTable.status, "offline"));
  for (const driver of offlineDrivers) {
    const activeOrders = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.driverId, driver.id), inArray(ordersTable.status, ["assigned", "in_delivery"])));
    alertCount += activeOrders.length;
  }

  const deliveredTotal = orderStats?.deliveredOrders ?? 0;
  const todayDelivered = orderStats?.todayDelivered ?? 0;
  const totalRevenue = orderStats?.totalRevenue ?? 0;
  const todayRevenue = orderStats?.todayRevenue ?? 0;
  const driverPayTotal = deliveredTotal * LIVREUR_PAY_MAD;
  const driverPayToday = todayDelivered * LIVREUR_PAY_MAD;
  // Répartition : Bridge encaisse BRIDGE_FEE_MAD par commande livrée, en
  // reverse LIVREUR_PAY_MAD au livreur ; le reste du CA va aux commerçants.
  const bridgeFeesTotal = deliveredTotal * BRIDGE_FEE_MAD;
  const bridgeFeesToday = todayDelivered * BRIDGE_FEE_MAD;
  const restaurantPayTotal = Math.max(0, totalRevenue - bridgeFeesTotal);
  const restaurantPayToday = Math.max(0, todayRevenue - bridgeFeesToday);

  res.json({
    totalOrders: orderStats?.totalOrders ?? 0,
    pendingOrders: orderStats?.pendingOrders ?? 0,
    inDeliveryOrders: orderStats?.inDeliveryOrders ?? 0,
    deliveredOrders: orderStats?.deliveredOrders ?? 0,
    cancelledOrders: orderStats?.cancelledOrders ?? 0,
    totalRevenue,
    todayRevenue,
    todayOrders: orderStats?.todayOrders ?? 0,
    todayDelivered,
    driverPayToday,
    driverPayTotal,
    netToday: bridgeFeesToday - driverPayToday,
    netTotal: bridgeFeesTotal - driverPayTotal,
    restaurantPayToday,
    restaurantPayTotal,
    driverPayPerDelivery: LIVREUR_PAY_MAD,
    bridgeFeePerDelivery: BRIDGE_FEE_MAD,
    activeDrivers: driverStats?.activeDrivers ?? 0,
    averageRating: Math.round((driverStats?.averageRating ?? 0) * 10) / 10,
    alertCount,
  });
});

router.get("/revenue", async (_req, res) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      date: sql<string>`date_trunc('day', created_at)::date::text`,
      revenue: sql<number>`coalesce(sum(case when status = 'delivered' then total_amount else 0 end), 0)::float`,
      orders: sql<number>`count(*)::int`,
    })
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, sevenDaysAgo))
    .groupBy(sql`date_trunc('day', created_at)`)
    .orderBy(sql`date_trunc('day', created_at)`);

  res.json(rows);
});

router.get("/driver-stats", async (_req, res) => {
  const rows = await db
    .select({
      driverId: driversTable.id,
      driverName: driversTable.name,
      deliveries: driversTable.totalDeliveries,
      revenue: driversTable.totalRevenue,
      rating: driversTable.rating,
      status: driversTable.status,
    })
    .from(driversTable)
    .orderBy(driversTable.totalDeliveries);

  res.json(rows.map((r) => ({
    ...r,
    revenue: r.revenue ?? 0,
    rating: r.rating ?? 5.0,
  })));
});

router.get("/customer-stats", async (_req, res) => {
  const rows = await db
    .select({
      customerName: ordersTable.customerName,
      customerPhone: ordersTable.customerPhone,
      orderCount: sql<number>`count(*)::int`,
      totalSpent: sql<number>`coalesce(sum(total_amount), 0)::float`,
    })
    .from(ordersTable)
    .groupBy(ordersTable.customerPhone, ordersTable.customerName)
    .orderBy(sql`count(*) desc`)
    .limit(5);

  const [countRow] = await db
    .select({ uniqueCustomers: sql<number>`count(distinct customer_phone)::int` })
    .from(ordersTable);

  res.json({
    uniqueCustomers: countRow?.uniqueCustomers ?? 0,
    topCustomers: rows,
  });
});

router.get("/platform-history", async (_req, res) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      date: sql<string>`date_trunc('day', created_at)::date::text`,
      platform: ordersTable.platform,
      orderCount: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(case when status = 'delivered' then total_amount else 0 end), 0)::float`,
    })
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, sevenDaysAgo))
    .groupBy(sql`date_trunc('day', created_at)`, ordersTable.platform)
    .orderBy(sql`date_trunc('day', created_at)`, ordersTable.platform);

  res.json(rows.map(r => ({
    date: r.date,
    platform: r.platform ?? "Manuel",
    orderCount: r.orderCount,
    revenue: r.revenue,
  })));
});

router.get("/platform-stats", async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      platform: ordersTable.platform,
      orderCount: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(case when status = 'delivered' then total_amount else 0 end), 0)::float`,
    })
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, today))
    .groupBy(ordersTable.platform)
    .orderBy(sql`count(*) desc`);

  res.json(rows.map(r => ({
    platform: r.platform ?? "Manuel",
    orderCount: r.orderCount,
    revenue: r.revenue,
  })));
});

export default router;
