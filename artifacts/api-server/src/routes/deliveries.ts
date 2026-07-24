import { Router } from "express";
import { db, driversTable, ordersTable } from "@workspace/db";
import { eq, and, desc, sql, gte, notInArray } from "drizzle-orm";
import { emitEvent } from "../lib/event-bus";
import { getRealDriverStats } from "../lib/driver-stats";

// Ces types de service sont des livraisons à pied/moto — les livreurs les reçoivent
const DELIVERY_SERVICE_TYPES = ["nourriture", "tabac", "fleur", "fleurs", "pharmacie", "souk", "boulangerie", "supermarche"] as const;
// Ces types sont réservés aux chauffeurs (taxi/VTC) — jamais envoyés aux livreurs
const TAXI_SERVICE_TYPES = ["taxi", "confort"];

const router = Router();

type OrderRow = typeof ordersTable.$inferSelect;

const formatDelivery = (o: OrderRow) => ({
  id: o.id,
  trackingNumber: o.orderNumber,
  delivererId: o.driverId,
  delivererName: null as string | null,
  customerName: o.customerName,
  customerPhone: o.customerPhone,
  pickupAddress: "Bridge Restaurant, Safi",
  deliveryAddress: o.deliveryAddress,
  items: o.items,
  totalAmount: o.totalAmount,
  status: mapStatus(o.status),
  confirmCode: null as string | null,
  notes: o.notes,
  estimatedDeliveryTime: null as string | null,
  createdAt: o.createdAt.toISOString(),
  updatedAt: o.updatedAt.toISOString(),
});

function mapStatus(s: string) {
  if (s === "in_delivery") return "in_progress";
  if (s === "assigned") return "pending";
  return s;
}

function reverseMapStatus(s: string) {
  if (s === "in_progress") return "in_delivery";
  if (s === "pending") return "assigned";
  return s;
}

router.get("/stats", async (req, res) => {
  const delivererId = Number(req.query.delivererId);
  if (!delivererId) {
    res.status(400).json({ error: "delivererId required" });
    return;
  }

  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, delivererId));
  if (!driver) {
    res.status(404).json({ error: "Livreur introuvable" });
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayStats] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.driverId, delivererId),
        eq(ordersTable.status, "delivered"),
        gte(ordersTable.updatedAt, today)
      )
    );

  const [inProgress] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.driverId, delivererId),
        sql`${ordersTable.status} IN ('assigned', 'in_delivery')`
      )
    );

  const realStats = await getRealDriverStats(driver.id, driver.services);
  res.json({
    delivererId,
    completedToday: todayStats?.count ?? 0,
    inProgressCount: inProgress?.count ?? 0,
    totalDeliveries: realStats.totalDeliveries,
    totalRevenue: realStats.totalRevenue,
    averageRating: realStats.rating,
    currentStreak: 0,
  });
});

router.get("/pending-dispatch", async (req, res) => {
  const delivererId = Number(req.query.delivererId);
  if (!delivererId) {
    res.json({ hasPending: false, delivery: null, secondsLeft: 0, phase: "primary" });
    return;
  }

  const [pending] = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.driverId, delivererId),
        eq(ordersTable.status, "pending"),
        // Seules les commandes de livraison sont envoyées aux livreurs
        // Les commandes taxi/confort vont aux chauffeurs — jamais aux livreurs
        notInArray(ordersTable.serviceType, TAXI_SERVICE_TYPES)
      )
    )
    .orderBy(desc(ordersTable.createdAt))
    .limit(1);

  if (!pending) {
    res.json({ hasPending: false, delivery: null, secondsLeft: 0, phase: "primary" });
    return;
  }

  const ageMs = Date.now() - pending.createdAt.getTime();
  const secondsLeft = Math.max(0, 300 - Math.floor(ageMs / 1000));

  res.json({
    hasPending: true,
    delivery: formatDelivery(pending),
    secondsLeft,
    phase: "primary",
  });
});

router.get("/", async (req, res) => {
  const delivererId = req.query.delivererId ? Number(req.query.delivererId) : null;
  const statusParam = req.query.status as string | undefined;

  // Toujours exclure les commandes taxi/confort de la vue livreur
  const conditions: ReturnType<typeof eq>[] = [
    notInArray(ordersTable.serviceType, TAXI_SERVICE_TYPES) as ReturnType<typeof eq>,
  ];
  if (delivererId) conditions.push(eq(ordersTable.driverId, delivererId));
  if (statusParam) {
    const dbStatus = reverseMapStatus(statusParam);
    conditions.push(sql`${ordersTable.status} = ${dbStatus}` as ReturnType<typeof eq>);
  }

  const rows = await db
    .select()
    .from(ordersTable)
    .where(and(...conditions))
    .orderBy(desc(ordersTable.createdAt));

  res.json(rows.map(formatDelivery));
});

router.post("/", async (req, res) => {
  const { trackingNumber, customerName, customerPhone, deliveryAddress, items, totalAmount, notes } = req.body;

  const num = trackingNumber || "BRG-" + Date.now().toString(36).toUpperCase();

  const [created] = await db
    .insert(ordersTable)
    .values({
      orderNumber: num,
      customerName,
      customerPhone,
      deliveryAddress,
      items: items ?? "",
      totalAmount: totalAmount ?? 0,
      status: "pending",
      serviceType: "nourriture",
      notes: notes ?? null,
    })
    .returning();

  emitEvent("delivery:created", {
    id: created.id,
    trackingNumber: created.orderNumber,
    customerName: created.customerName,
    deliveryAddress: created.deliveryAddress,
    totalAmount: created.totalAmount,
    status: "pending",
  });

  res.status(201).json(formatDelivery(created));
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatDelivery(row));
});

router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { status, delivererId, notes } = req.body;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (status) updates["status"] = reverseMapStatus(status);
  if (delivererId !== undefined) updates["driverId"] = delivererId;
  if (notes !== undefined) updates["notes"] = notes;

  const [updated] = await db
    .update(ordersTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set(updates as any)
    .where(eq(ordersTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  emitEvent("delivery:updated", {
    id: updated.id,
    status: mapStatus(updated.status),
    driverId: updated.driverId,
  });

  res.json(formatDelivery(updated));
});

router.post("/:id/accept", async (req, res) => {
  const id = Number(req.params.id);
  const { delivererId } = req.body;

  const [updated] = await db
    .update(ordersTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set({ status: "in_delivery", driverId: delivererId, updatedAt: new Date() } as any)
    .where(and(eq(ordersTable.id, id), eq(ordersTable.status, "pending")))
    .returning();

  if (!updated) {
    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    res.json(formatDelivery(existing));
    return;
  }

  await db
    .update(driversTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set({ status: "busy", lastActiveAt: new Date() } as any)
    .where(eq(driversTable.id, delivererId));

  emitEvent("delivery:updated", {
    id: updated.id,
    status: "in_progress",
    driverId: delivererId,
  });

  emitEvent("driver:updated", { driverId: delivererId, status: "busy" });

  res.json(formatDelivery(updated));
});

router.post("/:id/refuse", async (req, res) => {
  const id = Number(req.params.id);
  const { delivererId } = req.body;

  if (delivererId) {
    await db
      .update(driversTable)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set({ totalRefusals: sql`${driversTable.totalRefusals} + 1` } as any)
      .where(eq(driversTable.id, delivererId));
  }

  const [row] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatDelivery(row));
});

router.post("/:id/confirm-delivered", async (req, res) => {
  const id = Number(req.params.id);
  const { delivererId } = req.body;

  const [updated] = await db
    .update(ordersTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set({ status: "delivered", updatedAt: new Date() } as any)
    .where(eq(ordersTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  if (delivererId) {
    await db
      .update(driversTable)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set({
        totalDeliveries: sql`${driversTable.totalDeliveries} + 1`,
        totalRevenue: sql`${driversTable.totalRevenue} + ${updated.totalAmount}`,
        status: "available",
        lastActiveAt: new Date(),
      } as any)
      .where(eq(driversTable.id, delivererId));

    emitEvent("driver:updated", { driverId: delivererId, status: "available" });
  }

  emitEvent("delivery:updated", {
    id: updated.id,
    status: "delivered",
    driverId: delivererId,
  });

  res.json(formatDelivery(updated));
});

export default router;
