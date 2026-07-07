import { Router } from "express";
import { db, ordersTable, driversTable } from "@workspace/db";
import { eq, and, isNull, sql, desc, inArray } from "drizzle-orm";
import { addSSEClient, removeSSEClient } from "../lib/event-bus";
import { requireRestaurantAuth } from "../lib/jwt-auth";
import {
  ListOrdersQueryParams,
  CreateOrderBody,
  UpdateOrderParams,
  UpdateOrderBody,
  GetOrderParams,
} from "@workspace/api-zod";
import { logActivity } from "../lib/log-activity";
import { emitEvent } from "../lib/event-bus";

function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `GE-${year}-${rand}`;
}

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
      serviceType: ordersTable.serviceType,
      platform: ordersTable.platform,
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
      serviceType: parsed.data.serviceType ?? "nourriture",
    })
    .returning();

  emitEvent("order:created", {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    deliveryAddress: order.deliveryAddress,
    totalAmount: order.totalAmount,
    status: order.status,
  });

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
      serviceType: ordersTable.serviceType,
      platform: ordersTable.platform,
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
  if (bodyParsed.data.serviceType !== undefined) updates.serviceType = bodyParsed.data.serviceType;
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

  emitEvent("order:updated", {
    id: updated.id,
    orderNumber: updated.orderNumber,
    status: updated.status,
    driverId: updated.driverId,
    driverName,
  });

  res.json({
    ...updated,
    driverName,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

// GET /orders/recent — dernières commandes
router.get("/recent", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const orders = await db
    .select()
    .from(ordersTable)
    .orderBy(desc(ordersTable.createdAt))
    .limit(limit);

  const driverIds = [...new Set(orders.map(o => o.driverId).filter(Boolean))] as number[];
  const drivers = driverIds.length
    ? await db.select().from(driversTable).where(inArray(driversTable.id, driverIds))
    : [];
  const driverMap = Object.fromEntries(drivers.map(d => [d.id, d.name]));

  res.json(orders.map(o => ({
    ...o,
    driverName: o.driverId ? (driverMap[o.driverId] ?? null) : null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  })));
});

// GET /orders/stats — compteurs par statut
router.get("/stats", async (_req, res) => {
  const orders = await db.select({ status: ordersTable.status }).from(ordersTable);
  const stats: Record<string, number> = { pending: 0, assigned: 0, in_delivery: 0, delivered: 0, cancelled: 0, total: 0 };
  for (const o of orders) {
    stats.total++;
    if (o.status in stats) stats[o.status]++;
  }
  res.json(stats);
});

// POST /orders/:id/accept — le restaurant accepte une commande (JWT requis)
router.post("/:id/accept", requireRestaurantAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [order] = await db
    .update(ordersTable)
    .set({ status: "assigned", updatedAt: new Date() })
    .where(eq(ordersTable.id, id))
    .returning();
  if (!order) { res.status(404).json({ error: "Commande introuvable" }); return; }

  emitEvent("order:updated", { id: order.id, orderNumber: order.orderNumber, status: order.status });
  emitEvent("new_order", { id: order.id, status: "accepted" });

  res.json({
    ...order,
    driverName: null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  });
});

// POST /orders/:id/reject — le restaurant refuse une commande (JWT requis)
router.post("/:id/reject", requireRestaurantAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { reason } = req.body as { reason?: string };

  const existing = await db.select({ notes: ordersTable.notes }).from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  if (!existing.length) { res.status(404).json({ error: "Commande introuvable" }); return; }

  const [order] = await db
    .update(ordersTable)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
      notes: reason ? `Refusé par le restaurant: ${reason}` : "Refusé par le restaurant",
    })
    .where(eq(ordersTable.id, id))
    .returning();

  emitEvent("order:updated", { id: order.id, orderNumber: order.orderNumber, status: order.status });

  res.json({
    ...order,
    driverName: null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  });
});

// GET /orders/events — flux SSE temps réel (pour le tableau de bord restaurant)
// Note: EventSource API ne supporte pas les headers Authorization. Endpoint read-only.
router.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const clientId = `orders-sse-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try { res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`); } catch {}

  addSSEClient(clientId, res, "orders");

  const heartbeat = setInterval(() => {
    try { res.write(`event: ping\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`); } catch {}
  }, 20000);

  req.on("close", () => {
    clearInterval(heartbeat);
    removeSSEClient(clientId);
  });
});

// POST /orders/webhook — reçoit les commandes depuis le site client
router.post("/webhook", async (req, res) => {
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) {
    const authHeader = req.headers["x-webhook-secret"] ?? req.headers["authorization"];
    const provided = typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/i, "") : "";
    if (provided !== secret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  const body = req.body as Record<string, unknown>;

  const customerName = (body.customerName ?? body.customer_name ?? body.name) as string | undefined;
  const customerPhone = (body.customerPhone ?? body.customer_phone ?? body.phone) as string | undefined;
  const deliveryAddress = (body.deliveryAddress ?? body.delivery_address ?? body.address) as string | undefined;
  const totalAmount = Number(body.totalAmount ?? body.total_amount ?? body.total ?? 0);
  const rawItems = body.items;
  const items = typeof rawItems === "string" ? rawItems : JSON.stringify(rawItems ?? []);
  const notes = (body.notes ?? body.comment ?? body.message) as string | undefined;
  const sourceUrl = (body.sourceUrl ?? body.source_url ?? req.headers["origin"] ?? req.headers["referer"]) as string | undefined;
  const platform = (body.platform ?? body.platformName ?? body.platform_name) as string | undefined;
  const serviceType = (body.serviceType ?? body.service_type) as string | undefined;
  const orderNumber = (body.orderNumber ?? body.order_number ?? body.id) as string | undefined;

  if (!customerName || !customerPhone || !deliveryAddress || !totalAmount) {
    res.status(400).json({
      error: "Champs requis manquants",
      required: ["customerName", "customerPhone", "deliveryAddress", "totalAmount"],
      received: { customerName, customerPhone, deliveryAddress, totalAmount },
    });
    return;
  }

  const finalOrderNumber = orderNumber ?? generateOrderNumber();

  const validServiceTypes = ["nourriture", "taxi", "confort", "tabac", "fleur", "pharmacie"];
  const resolvedServiceType = serviceType && validServiceTypes.includes(serviceType) ? serviceType : "nourriture";

  const [order] = await db
    .insert(ordersTable)
    .values({
      orderNumber: finalOrderNumber,
      customerName,
      customerPhone,
      deliveryAddress,
      items,
      totalAmount,
      status: "pending",
      serviceType: resolvedServiceType,
      platform: platform ?? null,
      notes: notes ?? null,
      sourceUrl: sourceUrl ?? null,
    })
    .returning();

  await logActivity({
    action: "order_assigned",
    orderId: order.id,
    details: `Nouvelle commande ${order.orderNumber} reçue depuis le site — ${customerName} (${deliveryAddress})`,
  });

  emitEvent("order:created", {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    deliveryAddress: order.deliveryAddress,
    totalAmount: order.totalAmount,
    status: order.status,
    source: "webhook",
  });
  // Also emit new_order so the restaurant-dashboard SSE hook picks it up
  emitEvent("new_order", {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    totalAmount: order.totalAmount,
    status: order.status,
  });

  res.status(201).json({
    ...order,
    driverName: null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  });
});

export default router;
