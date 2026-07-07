import { Router } from "express";
import { db, driversTable, activitiesTable, ordersTable, reviewsTable, resetRequestsTable } from "@workspace/db";
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
import bcrypt from "bcryptjs";
import { syncDriverToLivreurs } from "../lib/sync-livreurs";

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

router.post("/auth", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: "Email et mot de passe requis" });
    return;
  }
  const [driver] = await db
    .select()
    .from(driversTable)
    .where(eq(driversTable.email, email as string))
    .limit(1);

  if (!driver || !driver.password) {
    res.status(401).json({ error: "Identifiants invalides" });
    return;
  }
  const valid = await bcrypt.compare(password as string, driver.password);
  if (!valid) {
    res.status(401).json({ error: "Identifiants invalides" });
    return;
  }
  if (driver.isBlocked) {
    res.status(403).json({ error: "Compte bloqué — contactez le manager" });
    return;
  }
  res.json(formatDriver(driver));
});

router.post("/", async (req, res) => {
  const parsed = CreateDriverBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { password, ...driverData } = parsed.data as typeof parsed.data & { password?: string };

  let plainPassword: string;
  if (password && password.trim().length > 0) {
    plainPassword = password.trim();
  } else {
    plainPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
  }
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const [driver] = await db
    .insert(driversTable)
    .values({
      ...driverData,
      password: hashedPassword,
      vehicleModel: "",
      vehiclePlate: "",
      licenseNumber: "",
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

            await syncDriverToLivreurs({
              id: driver.id,
              name: driver.name,
              phone: driver.phone,
              email: driver.email,
              vehicleType: driver.vehicleType,
              services: driver.services,
              hashedPassword,
              rating: driver.rating,
              avatarUrl: driver.avatarUrl,
              isBlocked: driver.isBlocked,
            });

  res.status(201).json({ ...formatDriver(driver), plainPassword });
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

router.delete("/:id", async (req, res) => {
  const parsed = GetDriverParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const { id } = parsed.data;

  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, id));
  if (!driver) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }

  // Clean up dependent rows first (FK constraints), preserving order history
  await db.delete(resetRequestsTable).where(eq(resetRequestsTable.driverId, id));
  await db.delete(reviewsTable).where(eq(reviewsTable.driverId, id));
  await db.update(ordersTable).set({ driverId: null }).where(eq(ordersTable.driverId, id));
  await db.delete(activitiesTable).where(eq(activitiesTable.driverId, id));
  await db.delete(driversTable).where(eq(driversTable.id, id));

  res.status(204).end();
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

  await syncDriverToLivreurs({
    id: updated.id,
    name: updated.name,
    phone: updated.phone,
    email: updated.email,
    vehicleType: updated.vehicleType,
    services: updated.services,
    hashedPassword: updated.password,
    rating: updated.rating,
    avatarUrl: updated.avatarUrl,
    isBlocked: updated.isBlocked,
  });

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
    .set({ lat: bodyParsed.data.lat, lng: bodyParsed.data.lng, lastActiveAt: new Date() })
    .where(eq(driversTable.id, paramParsed.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }
  res.json(formatDriver(updated));
});

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
    .where(and(eq(ordersTable.driverId, driverId), eq(ordersTable.status, "delivered"), gte(ordersTable.updatedAt, today)));

  const activeOrder = await db
    .select({ id: ordersTable.id, orderNumber: ordersTable.orderNumber })
    .from(ordersTable)
    .where(and(eq(ordersTable.driverId, driverId), sql`${ordersTable.status} IN ('assigned', 'in_delivery')`))
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
