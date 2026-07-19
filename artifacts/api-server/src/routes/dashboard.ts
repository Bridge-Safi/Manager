import { Router } from "express";
import { db, ordersTable, driversTable } from "@workspace/db";
import { eq, sql, gte, and, inArray } from "drizzle-orm";

const router = Router();

// Part versée au livreur par livraison effectuée (MAD). Doit suivre BASE_PAY
// côté app Livreurs (6 MAD). Surchargeable via la variable d'env LIVREUR_PAY_MAD.
const LIVREUR_PAY_MAD = Number(process.env.LIVREUR_PAY_MAD ?? 6);
// Modèle complet (zabi 2026-07-18) : articles -> restaurateurs ; frais de
// service 6,5 DH -> Bridge ; livraison 12 DH = 6 livreur (fixe) + 6 Bridge.
// Net Bridge = 12,5 DH / commande livrée. Restaurateurs = CA - 18,5 × N.
const BRIDGE_SERVICE_FEE_MAD = Number(process.env.BRIDGE_SERVICE_FEE_MAD ?? 6.5);
const BRIDGE_DELIVERY_SHARE_MAD = Number(process.env.BRIDGE_DELIVERY_SHARE_MAD ?? 6);
const BRIDGE_NET_PER_ORDER = BRIDGE_SERVICE_FEE_MAD + BRIDGE_DELIVERY_SHARE_MAD;
// Commission Bridge sur les articles : 6% Bridge / 94% restaurateurs (zabi 2026-07-19)
const BRIDGE_COMMISSION = Number(process.env.BRIDGE_COMMISSION_PCT ?? 6) / 100;


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
  const articlesTotal = Math.max(0, totalRevenue - driverPayTotal - deliveredTotal * BRIDGE_NET_PER_ORDER);
  const articlesToday = Math.max(0, todayRevenue - driverPayToday - todayDelivered * BRIDGE_NET_PER_ORDER);
  const bridgeNetTotal = deliveredTotal * BRIDGE_NET_PER_ORDER + articlesTotal * BRIDGE_COMMISSION;
  const bridgeNetToday = todayDelivered * BRIDGE_NET_PER_ORDER + articlesToday * BRIDGE_COMMISSION;
  const restaurantPayTotal = articlesTotal * (1 - BRIDGE_COMMISSION);
  const restaurantPayToday = articlesToday * (1 - BRIDGE_COMMISSION);


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
    netToday: bridgeNetToday,
    netTotal: bridgeNetTotal,
    restaurantPayToday,
    restaurantPayTotal,
    driverPayPerDelivery: LIVREUR_PAY_MAD,
    bridgeNetPerOrder: BRIDGE_NET_PER_ORDER,
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

// GET /dashboard/payroll — paie réelle des livreurs pour BT Finance :
// courses livrées ce mois-ci × 6 DH (LIVREUR_PAY_MAD), fixe toutes distances.
router.get("/payroll", async (_req, res) => {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      driverId: driversTable.id,
      name: driversTable.name,
      phone: driversTable.phone,
      status: driversTable.status,
      totalDeliveries: driversTable.totalDeliveries,
      // count(DISTINCT order_number) : des doublons de la meme commande (double
      // insertion mirror/webhook) faisaient payer 12 DH au lieu de 6 par course.
      monthDeliveries: sql<number>`count(distinct ${ordersTable.orderNumber}) filter (where ${ordersTable.status} = 'delivered' and ${ordersTable.updatedAt} >= ${monthStart})::int`,
    })
    .from(driversTable)
    .leftJoin(ordersTable, eq(ordersTable.driverId, driversTable.id))
    .groupBy(driversTable.id);

  res.json(rows.map((r) => ({
    ...r,
    monthDeliveries: r.monthDeliveries ?? 0,
    payMonth: (r.monthDeliveries ?? 0) * LIVREUR_PAY_MAD,
    payPerCourse: LIVREUR_PAY_MAD,
  })));
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
