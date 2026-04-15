import { Router } from "express";
import { db, ordersTable, driversTable } from "@workspace/db";
import { eq, and, isNull, sql } from "drizzle-orm";
import {
  ListOrdersQueryParams,
  CreateOrderBody,
  UpdateOrderParams,
  UpdateOrderBody,
  GetOrderParams,
} from "@workspace/api-zod";
import { logActivity } from "../lib/log-activity";

const router = Router();

router.get("/", async (req, res) => {
  const parsed = ListOrdersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { status, driverId } = parsed.data;

  const conditions = [];
  if (status) conditions.push(eq(ordersTable.status, status));
  if (driverId !== undefined) {
    if (driverId === null) {
      conditions.push(isNull(ordersTable.driverId));
    } else {
      conditions.push(eq(ordersTable.driverId, driverId));
    }
  }

  const rows = await db
    .select({
      id: ordersTable.id,
      orderNumber: ordersTable.orderNumber,
      customerName: ordersTable.customerName,
      customerPhone: ordersTable.customerPhone,
      deliveryAddress: ordersTable.deliveryAddress,
      items: ordersTable.items,
      totalAmount: ordersTable.totalAmount,
      status: ordersTable.status,
      driverId: ordersTable.driverId,
      sourceUrl: ordersTable.sourceUrl,
      notes: ordersTable.notes,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
      driverName: driversTable.name,
    })
    .from(ordersTable)
    .leftJoin(driversTable, eq(ordersTable.driverId, driversTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${ordersTable.createdAt} DESC`);

  res.json(rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  })));
});

router.post("/", async (req, res) => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [order] = await db
    .insert(ordersTable)
    .values({
      ...parsed.data,
      status: "pending",
    })
    .returning();

  res.status(201).json({
    ...order,
    driverName: null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  });
});

router.get("/:id", async (req, res) => {
  const parsed = GetOrderParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const rows = await db
    .select({
      id: ordersTable.id,
      orderNumber: ordersTable.orderNumber,
      customerName: ordersTable.customerName,
      customerPhone: ordersTable.customerPhone,
      deliveryAddress: ordersTable.deliveryAddress,
      items: ordersTable.items,
      totalAmount: ordersTable.totalAmount,
      status: ordersTable.status,
      driverId: ordersTable.driverId,
      sourceUrl: ordersTable.sourceUrl,
      notes: ordersTable.notes,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
      driverName: driversTable.name,
    })
    .from(ordersTable)
    .leftJoin(driversTable, eq(ordersTable.driverId, driversTable.id))
    .where(eq(ordersTable.id, parsed.data.id));

  if (!rows[0]) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json({
    ...rows[0],
    createdAt: rows[0].createdAt.toISOString(),
    updatedAt: rows[0].updatedAt.toISOString(),
  });
});

router.patch("/:id", async (req, res) => {
  const paramParsed = UpdateOrderParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const bodyParsed = UpdateOrderBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const orderId = paramParsed.data.id;
  const existingRows = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  const existing = existingRows[0];
  if (!existing) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (bodyParsed.data.status !== undefined) updates.status = bodyParsed.data.status;
  if (bodyParsed.data.driverId !== undefined) updates.driverId = bodyParsed.data.driverId;
  if (bodyParsed.data.notes !== undefined) updates.notes = bodyParsed.data.notes;

  const newDriverId = bodyParsed.data.driverId !== undefined ? bodyParsed.data.driverId : existing.driverId;

  // Auto-set status to assigned when a driver is assigned
  if (bodyParsed.data.driverId !== undefined && bodyParsed.data.driverId !== null && !bodyParsed.data.status) {
    updates.status = "assigned";
  }

  const [updated] = await db
    .update(ordersTable)
    .set(updates)
    .where(eq(ordersTable.id, orderId))
    .returning();

  let driverName: string | null = null;
  if (updated.driverId) {
    const drivers = await db.select().from(driversTable).where(eq(driversTable.id, updated.driverId));
    driverName = drivers[0]?.name ?? null;
  }

  const finalStatus = (updates.status ?? existing.status) as string;

  // Driver was just assigned
  if (bodyParsed.data.driverId && bodyParsed.data.driverId !== existing.driverId) {
    await db
      .update(driversTable)
      .set({ status: "busy" })
      .where(eq(driversTable.id, bodyParsed.data.driverId));

    await logActivity({
      driverId: bodyParsed.data.driverId,
      orderId: updated.id,
      action: "order_assigned",
      details: `Commande ${updated.orderNumber} assignée à ${driverName ?? "livreur"} (${updated.deliveryAddress})`,
    });
  }

  // Status changed to in_delivery
  if (bodyParsed.data.status === "in_delivery" && existing.status !== "in_delivery") {
    await logActivity({
      driverId: updated.driverId,
      orderId: updated.id,
      action: "order_picked_up",
      details: `Commande ${updated.orderNumber} ramassée — en route vers ${updated.deliveryAddress}`,
    });
  }

  // Status changed to delivered
  if (bodyParsed.data.status === "delivered" && existing.status !== "delivered") {
    if (updated.driverId) {
      const orderToCount = await db.select().from(ordersTable).where(eq(ordersTable.id, updated.id));
      const amount = orderToCount[0]?.totalAmount ?? 0;
      await db
        .update(driversTable)
        .set({
          totalDeliveries: sql`total_deliveries + 1`,
          totalRevenue: sql`total_revenue + ${amount}`,
          status: "available",
        })
        .where(eq(driversTable.id, updated.driverId));
    }

    await logActivity({
      driverId: updated.driverId,
      orderId: updated.id,
      action: "order_delivered",
      details: `Commande ${updated.orderNumber} livrée — ${updated.totalAmount} MAD encaissés`,
    });
  }

  // Status changed to cancelled
  if (bodyParsed.data.status === "cancelled" && existing.status !== "cancelled") {
    if (updated.driverId) {
      await db
        .update(driversTable)
        .set({ status: "available" })
        .where(eq(driversTable.id, updated.driverId));
    }

    await logActivity({
      driverId: updated.driverId,
      orderId: updated.id,
      action: "order_cancelled",
      details: `Commande ${updated.orderNumber} annulée`,
    });
  }

  res.json({
    ...updated,
    driverName,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

export default router;
