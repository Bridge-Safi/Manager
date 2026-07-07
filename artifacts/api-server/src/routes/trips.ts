import { Router } from "express";
import { db, driversTable, ordersTable } from "@workspace/db";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { emitEvent } from "../lib/event-bus";
import { requireRestaurantAuth } from "../lib/jwt-auth";

const router = Router();

type OrderRow = typeof ordersTable.$inferSelect;

function makeTripFromOrder(o: OrderRow, driverName?: string | null) {
  return {
    id: o.id,
    driverId: o.driverId,
    driverName: driverName ?? null,
    passengerName: o.customerName,
    passengerPhone: o.customerPhone,
    pickupAddress: "Bridge, Safi",
    dropoffAddress: o.deliveryAddress,
    fare: o.totalAmount,
    offeredFare: null as number | null,
    status: mapTripStatus(o.status),
    distance: null as number | null,
    scheduledAt: o.createdAt.toISOString(),
    completedAt: o.status === "delivered" ? o.updatedAt.toISOString() : null,
    notes: o.notes,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

function mapTripStatus(s: string) {
  if (s === "pending" || s === "assigned") return "scheduled";
  if (s === "in_delivery") return "in_progress";
  if (s === "delivered") return "completed";
  return s;
}

function reverseMapTripStatus(s: string) {
  if (s === "scheduled") return "pending";
  if (s === "in_progress") return "in_delivery";
  if (s === "completed") return "delivered";
  if (s === "cancelled") return "cancelled";
  return s;
}

router.get("/stats", async (req, res) => {
  const driverId = Number(req.query.driverId);
  if (!driverId) { res.status(400).json({ error: "driverId required" }); return; }

  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, driverId));
  if (!driver) { res.status(404).json({ error: "Chauffeur introuvable" }); return; }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${ordersTable.totalAmount}), 0)::float`,
    })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.driverId, driverId),
        sql`${ordersTable.status} = 'delivered'`,
        sql`${ordersTable.serviceType} IN ('taxi', 'confort')`,
        gte(ordersTable.updatedAt, today)
      )
    );

  res.json({
    driverId,
    completedToday: todayStats?.count ?? 0,
    earningsToday: todayStats?.revenue ?? 0,
    totalKmToday: 0,
    averageFare: driver.totalDeliveries > 0 ? driver.totalRevenue / driver.totalDeliveries : 0,
    totalTrips: driver.totalDeliveries,
    totalRevenue: driver.totalRevenue,
  });
});

router.get("/pending-ride", async (req, res) => {
  const driverId = Number(req.query.driverId);
  if (!driverId) {
    res.json({ hasPending: false, trip: null, secondsLeft: 0, phase: "cascade" });
    return;
  }

  const [pending] = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.driverId, driverId),
        eq(ordersTable.status, "pending"),
        sql`${ordersTable.serviceType} IN ('taxi', 'confort')`
      )
    )
    .orderBy(desc(ordersTable.createdAt))
    .limit(1);

  if (!pending) {
    res.json({ hasPending: false, trip: null, secondsLeft: 0, phase: "cascade" });
    return;
  }

  const ageMs = Date.now() - pending.createdAt.getTime();
  const secondsLeft = Math.max(0, 300 - Math.floor(ageMs / 1000));

  res.json({ hasPending: true, trip: makeTripFromOrder(pending), secondsLeft, phase: "cascade" });
});

router.get("/", async (req, res) => {
  const driverId = req.query.driverId ? Number(req.query.driverId) : null;
  const statusParam = req.query.status as string | undefined;

  const conditions: ReturnType<typeof eq>[] = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sql`${ordersTable.serviceType} IN ('taxi', 'confort')` as any,
  ];
  if (driverId) conditions.push(eq(ordersTable.driverId, driverId) as any);
  if (statusParam) {
    const dbStatus = reverseMapTripStatus(statusParam);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conditions.push(sql`${ordersTable.status} = ${dbStatus}` as any);
  }

  const rows = await db
    .select()
    .from(ordersTable)
    .where(and(...conditions))
    .orderBy(desc(ordersTable.createdAt));

  res.json(rows.map((r) => makeTripFromOrder(r)));
});

router.post("/", async (req, res) => {
  const { passengerName, passengerPhone, dropoffAddress, fare, notes } = req.body;

  const num = "TAXI-" + Date.now().toString(36).toUpperCase();

  const [created] = await db
    .insert(ordersTable)
    .values({
      orderNumber: num,
      customerName: passengerName,
      customerPhone: passengerPhone,
      deliveryAddress: dropoffAddress,
      items: "",
      totalAmount: fare ?? 0,
      status: "pending",
      serviceType: "taxi",
      notes: notes ?? null,
    })
    .returning();

  res.status(201).json(makeTripFromOrder(created));
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(makeTripFromOrder(row));
});

router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { status, driverId, notes } = req.body;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (status) updates["status"] = reverseMapTripStatus(status);
  if (driverId !== undefined) updates["driverId"] = driverId;
  if (notes !== undefined) updates["notes"] = notes;

  const [updated] = await db
    .update(ordersTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set(updates as any)
    .where(eq(ordersTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  if (status === "completed" && driverId) {
    await db
      .update(driversTable)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set({
        totalDeliveries: sql`${driversTable.totalDeliveries} + 1`,
        totalRevenue: sql`${driversTable.totalRevenue} + ${updated.totalAmount}`,
        status: "available",
        lastActiveAt: new Date(),
      } as any)
      .where(eq(driversTable.id, driverId));
    emitEvent("driver:updated", { driverId, status: "available" });
  }

  emitEvent("order:updated", {
    id: updated.id,
    orderNumber: updated.orderNumber,
    status: updated.status,
    driverId: updated.driverId,
  });

  res.json(makeTripFromOrder(updated));
});

router.post("/:id/pickup", async (req, res) => {
  const id = Number(req.params.id);
  const { driverId } = req.body;

  const [updated] = await db
    .update(ordersTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set({ status: "in_delivery", driverId, updatedAt: new Date() } as any)
    .where(eq(ordersTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(makeTripFromOrder(updated));
});

router.post("/:id/accept", async (req, res) => {
  const id = Number(req.params.id);
  const { driverId } = req.body;

  const [updated] = await db
    .update(ordersTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set({ status: "assigned", driverId, updatedAt: new Date() } as any)
    .where(and(eq(ordersTable.id, id), eq(ordersTable.status, "pending")))
    .returning();

  if (!updated) {
    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    res.json(makeTripFromOrder(existing));
    return;
  }

  await db
    .update(driversTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set({ status: "busy", lastActiveAt: new Date() } as any)
    .where(eq(driversTable.id, driverId));

  emitEvent("order:updated", {
    id: updated.id,
    orderNumber: updated.orderNumber,
    status: "assigned",
    driverId,
  });
  emitEvent("driver:updated", { driverId, status: "busy" });

  res.json(makeTripFromOrder(updated));
});

router.post("/:id/refuse", async (req, res) => {
  const id = Number(req.params.id);
  const { driverId } = req.body;

  if (driverId) {
    await db
      .update(driversTable)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set({ totalRefusals: sql`${driversTable.totalRefusals} + 1` } as any)
      .where(eq(driversTable.id, driverId));
  }

  const [row] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(makeTripFromOrder(row));
});

router.post("/:id/counter-offer", async (req, res) => {
  const id = Number(req.params.id);
  const { offeredFare } = req.body;

  const [row] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  const trip = makeTripFromOrder(row);
  trip.offeredFare = offeredFare as number;
  res.json(trip);
});

// POST /trips/:id/cancel — annulation par le client (JWT requis)
router.post("/:id/cancel", requireRestaurantAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { reason } = req.body as { reason?: string };

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) { res.status(404).json({ error: "Trip not found" }); return; }

  const [updated] = await db
    .update(ordersTable)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
      notes: reason ? `Annulé par le client: ${reason}` : "Annulé par le client",
    })
    .where(eq(ordersTable.id, id))
    .returning();

  emitEvent("order:updated", { id: updated.id, orderNumber: updated.orderNumber, status: "cancelled" });

  res.json(makeTripFromOrder(updated));
});

export default router;
