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

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (bodyParsed.data.status !== undefined) updates.status = bodyParsed.data.status;
  if (bodyParsed.data.driverId !== undefined) updates.driverId = bodyParsed.data.driverId;
  if (bodyParsed.data.notes !== undefined) updates.notes = bodyParsed.data.notes;

  if (bodyParsed.data.driverId !== undefined && bodyParsed.data.driverId !== null && !bodyParsed.data.status) {
    updates.status = "assigned";
  }

  const [updated] = await db
    .update(ordersTable)
    .set(updates)
    .where(eq(ordersTable.id, paramParsed.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  let driverName: string | null = null;
  if (updated.driverId) {
    const driver = await db.select().from(driversTable).where(eq(driversTable.id, updated.driverId));
    driverName = driver[0]?.name ?? null;

    await db
      .update(driversTable)
      .set({ status: "busy" })
      .where(eq(driversTable.id, updated.driverId));
  }

  if (bodyParsed.data.status === "delivered" && updated.driverId) {
    const order = await db.select().from(ordersTable).where(eq(ordersTable.id, updated.id));
    await db
      .update(driversTable)
      .set({
        totalDeliveries: sql`total_deliveries + 1`,
        totalRevenue: sql`total_revenue + ${order[0]?.totalAmount ?? 0}`,
        status: "available",
      })
      .where(eq(driversTable.id, updated.driverId));
  }

  res.json({
    ...updated,
    driverName,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

export default router;
