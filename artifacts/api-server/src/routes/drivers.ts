import { Router } from "express";
import { db, driversTable, activitiesTable, ordersTable } from "@workspace/db";
import { eq, desc, and, sql, gte } from "drizzle-orm";
import {
  CreateDriverBody,
  UpdateDriverParams,
  UpdateDriverBody,
  GetDriverParams,
  UpdateDriverLocationParams,
  UpdateDriverLocationBody,
} from "@workspace/api-zod";
import { logActivity } from "../lib/log-activity";

const router = Router();

const formatDriver = (d: typeof driversTable.$inferSelect) => ({
  ...d,
  createdAt: d.createdAt.toISOString(),
  lastActiveAt: d.lastActiveAt ? d.lastActiveAt.toISOString() : null,
});

router.get("/", async (_req, res) => {
  const rows = await db.select().from(driversTable).orderBy(driversTable.id);
  res.json(rows.map(formatDriver));
});

router.post("/", async (req, res) => {
  const parsed = CreateDriverBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [driver] = await db
    .insert(driversTable)
    .values({
      ...parsed.data,
      status: "available",
      rating: 5.0,
      totalDeliveries: 0,
      totalRevenue: 0,
    })
    .returning();

  await logActivity({
    driverId: driver.id,
    action: "status_online",
    details: `${driver.name} a rejoint la flotte`,
  });

  res.status(201).json(formatDriver(driver));
});

router.get("/:id", async (req, res) => {
  const parsed = GetDriverParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, parsed.data.id));
  if (!driver) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }

  res.json(formatDriver(driver));
});

router.patch("/:id", async (req, res) => {
  const paramParsed = UpdateDriverParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const bodyParsed = UpdateDriverBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const existingRows = await db.select().from(driversTable).where(eq(driversTable.id, paramParsed.data.id));
  const existing = existingRows[0];
  if (!existing) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }

  const [updated] = await db
    .update(driversTable)
    .set(bodyParsed.data)
    .where(eq(driversTable.id, paramParsed.data.id))
    .returning();

  // Log status changes
  if (bodyParsed.data.status && bodyParsed.data.status !== existing.status) {
    const actionMap: Record<string, string> = {
      available: "status_available",
      offline: "status_offline",
      busy: "status_online",
    };
    const labelMap: Record<string, string> = {
      available: "est disponible",
      offline: "s'est déconnecté",
      busy: "est en course",
    };
    await logActivity({
      driverId: updated.id,
      action: actionMap[bodyParsed.data.status] ?? "status_available",
      details: `${updated.name} ${labelMap[bodyParsed.data.status] ?? "a changé de statut"}`,
    });
  }

  res.json(formatDriver(updated));
});

router.patch("/:id/location", async (req, res) => {
  const paramParsed = UpdateDriverLocationParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const bodyParsed = UpdateDriverLocationBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const [updated] = await db
    .update(driversTable)
    .set({
      lat: bodyParsed.data.lat,
      lng: bodyParsed.data.lng,
      lastActiveAt: new Date(),
    })
    .where(eq(driversTable.id, paramParsed.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }

  res.json(formatDriver(updated));
});

// GET /drivers/:id/activities
router.get("/:id/activities", async (req, res) => {
  const id = Number(req.params.id);
  const limit = parseInt(req.query.limit as string) || 50;

  const rows = await db
    .select({
      id: activitiesTable.id,
      driverId: activitiesTable.driverId,
      driverName: driversTable.name,
      orderId: activitiesTable.orderId,
      orderNumber: ordersTable.orderNumber,
      action: activitiesTable.action,
      details: activitiesTable.details,
      createdAt: activitiesTable.createdAt,
    })
    .from(activitiesTable)
    .leftJoin(driversTable, eq(activitiesTable.driverId, driversTable.id))
    .leftJoin(ordersTable, eq(activitiesTable.orderId, ordersTable.id))
    .where(eq(activitiesTable.driverId, id))
    .orderBy(desc(activitiesTable.createdAt))
    .limit(limit);

  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

// GET /drivers/:id/today
router.get("/:id/today", async (req, res) => {
  const driverId = Number(req.params.id);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deliveredToday = await db
    .select({
      count: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${ordersTable.totalAmount}), 0)::float`,
    })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.driverId, driverId),
        eq(ordersTable.status, "delivered"),
        gte(ordersTable.updatedAt, today)
      )
    );

  const activeOrder = await db
    .select({ id: ordersTable.id, orderNumber: ordersTable.orderNumber })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.driverId, driverId),
        sql`${ordersTable.status} IN ('assigned', 'in_delivery')`
      )
    )
    .limit(1);

  const lastActivity = await db
    .select({ createdAt: activitiesTable.createdAt })
    .from(activitiesTable)
    .where(eq(activitiesTable.driverId, driverId))
    .orderBy(desc(activitiesTable.createdAt))
    .limit(1);

  res.json({
    driverId,
    todayDeliveries: deliveredToday[0]?.count ?? 0,
    todayRevenue: deliveredToday[0]?.revenue ?? 0,
    todayOnlineMinutes: 0,
    activeOrderId: activeOrder[0]?.id ?? null,
    activeOrderNumber: activeOrder[0]?.orderNumber ?? null,
    lastActivityAt: lastActivity[0]?.createdAt?.toISOString() ?? null,
  });
});

export default router;
