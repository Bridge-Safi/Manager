import { Router } from "express";
import { db, ordersTable, driversTable, activitiesTable } from "@workspace/db";
import { eq, and, or, sql, desc } from "drizzle-orm";
import { livreurAuth } from "../lib/livreur-auth";
import { logActivity } from "../lib/log-activity";
import { emitEvent } from "../lib/event-bus";

const router = Router();

router.use(livreurAuth);

function formatOrder(o: Record<string, unknown>) {
  return {
    ...o,
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
    updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : o.updatedAt,
  };
}

function formatDriver(d: Record<string, unknown>) {
  return {
    ...d,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
    lastActiveAt: d.lastActiveAt instanceof Date ? d.lastActiveAt.toISOString() : (d.lastActiveAt ?? null),
    warnedAt: d.warnedAt instanceof Date ? d.warnedAt.toISOString() : (d.warnedAt ?? null),
  };
}

// GET /livreur/me/:driverId — profil + commandes actives du livreur
router.get("/me/:driverId", async (req, res) => {
  const driverId = Number(req.params.driverId);
  if (isNaN(driverId)) {
    res.status(400).json({ error: "driverId invalide" });
    return;
  }

  const driver = await db.query.drivers.findFirst({
    where: eq(driversTable.id, driverId),
  });

  if (!driver) {
    res.status(404).json({ error: "Livreur introuvable" });
    return;
  }

  const activeOrders = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.driverId, driverId),
        or(
          eq(ordersTable.status, "assigned"),
          eq(ordersTable.status, "picked_up"),
          eq(ordersTable.status, "delivering"),
        )
      )
    )
    .orderBy(desc(ordersTable.createdAt));

  res.json({
    driver: formatDriver(driver as Record<string, unknown>),
    activeOrders: activeOrders.map(o => formatOrder(o as Record<string, unknown>)),
  });
});

// GET /livreur/orders/:driverId — toutes les commandes du livreur (avec filtre statut)
router.get("/orders/:driverId", async (req, res) => {
  const driverId = Number(req.params.driverId);
  if (isNaN(driverId)) {
    res.status(400).json({ error: "driverId invalide" });
    return;
  }

  const statusFilter = req.query.status as string | undefined;
  const limit = parseInt(req.query.limit as string) || 20;

  const conditions = [eq(ordersTable.driverId, driverId)];
  if (statusFilter) conditions.push(eq(ordersTable.status, statusFilter));

  const orders = await db
    .select()
    .from(ordersTable)
    .where(and(...conditions))
    .orderBy(desc(ordersTable.createdAt))
    .limit(limit);

  res.json(orders.map(o => formatOrder(o as Record<string, unknown>)));
});

// GET /livreur/pending — commandes en attente non assignées
router.get("/pending", async (req, res) => {
  const orders = await db
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
      notes: ordersTable.notes,
      sourceUrl: ordersTable.sourceUrl,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
    })
    .from(ordersTable)
    .where(eq(ordersTable.status, "pending"))
    .orderBy(sql`${ordersTable.createdAt} ASC`)
    .limit(30);

  res.json(orders.map(o => formatOrder(o as Record<string, unknown>)));
});

// PATCH /livreur/location — mettre à jour la position GPS
router.patch("/location", async (req, res) => {
  const { driverId, lat, lng } = req.body as { driverId?: number; lat?: number; lng?: number };

  if (!driverId || lat === undefined || lng === undefined) {
    res.status(400).json({ error: "Champs requis: driverId, lat, lng" });
    return;
  }

  const [updated] = await db
    .update(driversTable)
    .set({ lat, lng, lastActiveAt: new Date() })
    .where(eq(driversTable.id, driverId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Livreur introuvable" });
    return;
  }

  emitEvent("driver:location", { driverId, lat, lng });
  res.json({ ok: true, lat, lng });
});

// PATCH /livreur/status — mettre à jour le statut du livreur
router.patch("/status", async (req, res) => {
  const { driverId, status } = req.body as { driverId?: number; status?: string };

  const validStatuses = ["available", "busy", "delivering", "offline"];
  if (!driverId || !status || !validStatuses.includes(status)) {
    res.status(400).json({ error: `Champs requis: driverId, status (${validStatuses.join("|")})` });
    return;
  }

  const [updated] = await db
    .update(driversTable)
    .set({ status, lastActiveAt: new Date() })
    .where(eq(driversTable.id, driverId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Livreur introuvable" });
    return;
  }

  await logActivity({
    driverId,
    action: `status_${status}`,
    details: `Statut changé → ${status}`,
  });

  emitEvent("driver:status", { driverId, status });
  res.json({ ok: true, status });
});

// PATCH /livreur/order/:orderId/status — mettre à jour le statut d'une commande
router.patch("/order/:orderId/status", async (req, res) => {
  const orderId = Number(req.params.orderId);
  const { driverId, status } = req.body as { driverId?: number; status?: string };

  const validStatuses = ["assigned", "picked_up", "delivering", "delivered", "cancelled"];
  if (isNaN(orderId) || !driverId || !status || !validStatuses.includes(status)) {
    res.status(400).json({ error: `Champs requis: driverId, status (${validStatuses.join("|")})` });
    return;
  }

  const [order] = await db
    .update(ordersTable)
    .set({ status, driverId, updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Commande introuvable" });
    return;
  }

  const actionMap: Record<string, string> = {
    picked_up: "order_picked_up",
    delivering: "order_picked_up",
    delivered: "order_delivered",
    cancelled: "order_cancelled",
    assigned: "order_assigned",
  };

  const detailMap: Record<string, string> = {
    picked_up: `Commande #${order.orderNumber} récupérée au resto`,
    delivering: `En route pour livrer #${order.orderNumber}`,
    delivered: `Commande #${order.orderNumber} livrée ✓`,
    cancelled: `Commande #${order.orderNumber} annulée`,
    assigned: `Commande #${order.orderNumber} assignée`,
  };

  await logActivity({
    driverId,
    orderId,
    action: actionMap[status] ?? "order_updated",
    details: detailMap[status] ?? `Statut → ${status}`,
  });

  if (status === "delivering" || status === "picked_up") {
    await db
      .update(driversTable)
      .set({ status: "delivering", lastActiveAt: new Date() })
      .where(eq(driversTable.id, driverId));
  } else if (status === "delivered") {
    await db
      .update(driversTable)
      .set({ status: "available", lastActiveAt: new Date() })
      .where(eq(driversTable.id, driverId));
  }

  emitEvent("order:updated", {
    id: order.id,
    orderNumber: order.orderNumber,
    status,
    driverId,
  });

  res.json(formatOrder(order as Record<string, unknown>));
});

// POST /livreur/order — créer une nouvelle commande depuis l'app livreur
router.post("/order", async (req, res) => {
  const {
    customerName,
    customerPhone,
    deliveryAddress,
    items,
    totalAmount,
    driverId,
    notes,
    sourceUrl,
    serviceType,
  } = req.body as Record<string, unknown>;

  if (!customerName || !customerPhone || !deliveryAddress || !totalAmount) {
    res.status(400).json({
      error: "Champs requis: customerName, customerPhone, deliveryAddress, totalAmount",
    });
    return;
  }

  const now = new Date();
  const year = now.getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `GE-${year}-${rand}`;

  const [order] = await db
    .insert(ordersTable)
    .values({
      orderNumber,
      customerName: String(customerName),
      customerPhone: String(customerPhone),
      deliveryAddress: String(deliveryAddress),
      items: typeof items === "string" ? items : JSON.stringify(items ?? []),
      totalAmount: Number(totalAmount),
      driverId: driverId ? Number(driverId) : null,
      status: driverId ? "assigned" : "pending",
      serviceType: String(serviceType ?? "nourriture"),
      notes: notes ? String(notes) : null,
      sourceUrl: sourceUrl ? String(sourceUrl) : null,
    })
    .returning();

  if (driverId) {
    await logActivity({
      driverId: Number(driverId),
      orderId: order.id,
      action: "order_assigned",
      details: `Commande #${orderNumber} créée et assignée`,
    });
    await db
      .update(driversTable)
      .set({ status: "busy", lastActiveAt: new Date() })
      .where(eq(driversTable.id, Number(driverId)));
  }

  emitEvent("order:created", {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    deliveryAddress: order.deliveryAddress,
    totalAmount: order.totalAmount,
    status: order.status,
  });

  res.status(201).json(formatOrder(order as Record<string, unknown>));
});

// POST /livreur/sync — synchronisation complète (location + status + commande en cours)
//
// IMPORTANT: le driverId envoyé ici vient de la base du repo Livreurs (l'app
// chauffeur), qui est une base Postgres SEPAREE de celle de Manager. Les deux
// bases ont chacune leur propre numerotation auto-incrementee : l'id d'un
// livreur cote Livreurs n'a AUCUNE raison de correspondre a l'id de sa ligne
// dans la table drivers de Manager. Pareil pour currentOrderId (id interne
// Livreurs) compare a l'id d'une commande dans la table orders de Manager.
// Utiliser ces id bruts pour un UPDATE ... WHERE id = X ne matchait donc
// quasiment jamais la bonne ligne -> la position GPS et l'assignation de
// commande n'apparaissaient jamais correctement sur le tableau de bord.
//
// Le telephone du livreur et le numero de suivi (trackingNumber / ref) sont
// en revanche les MEMES partout (Bridge-safi, Livreurs, Manager) : on les
// utilise comme cle de correspondance fiable, avec repli sur l'ancien
// comportement par id pour ne rien casser si une vieille version de l'app
// livreur n'envoie pas encore ces champs.
router.post("/sync", async (req, res) => {
  const {
    driverId,
    phone,
    lat,
    lng,
    status,
    currentOrderId,
    currentOrderStatus,
    currentOrderTrackingNumber,
  } = req.body as {
    driverId?: number;
    phone?: string;
    lat?: number;
    lng?: number;
    status?: string;
    currentOrderId?: number;
    currentOrderStatus?: string;
    currentOrderTrackingNumber?: string;
  };

  if (!driverId && !phone) {
    res.status(400).json({ error: "driverId ou phone requis" });
    return;
  }

  const updates: Record<string, unknown> = { lastActiveAt: new Date() };
  if (lat !== undefined && lng !== undefined) {
    updates.lat = lat;
    updates.lng = lng;
  }
  if (status) updates.status = status;

  let driver: typeof driversTable.$inferSelect | undefined;

  if (phone) {
    [driver] = await db.update(driversTable).set(updates).where(eq(driversTable.phone, phone)).returning();
  }
  // Repli : mêmes numéros écrits différemment ("0612345678" vs "+212612345678"
  // vs espaces). On compare les 9 derniers chiffres, seule partie stable d'un
  // numéro marocain, pour que la correspondance ne dépende pas du format saisi.
  if (!driver && phone) {
    const last9 = phone.replace(/[^0-9]/g, "").slice(-9);
    if (last9.length === 9) {
      [driver] = await db
        .update(driversTable)
        .set(updates)
        .where(sql`right(regexp_replace(${driversTable.phone}, '[^0-9]', '', 'g'), 9) = ${last9}`)
        .returning();
    }
  }
  if (!driver && driverId) {
    [driver] = await db.update(driversTable).set(updates).where(eq(driversTable.id, driverId)).returning();
  }

  if (!driver) {
    await logActivity({
      action: "sync_driver_not_found",
      details: `Sync livreur: aucune ligne trouvee (phone=${phone ?? "?"}, driverId Livreurs=${driverId ?? "?"})`,
    });
    res.status(404).json({ error: "Livreur introuvable (ni par téléphone, ni par id)" });
    return;
  }

  if (currentOrderStatus) {
    const validStatuses = ["assigned", "picked_up", "delivering", "delivered", "cancelled"];
    if (validStatuses.includes(currentOrderStatus)) {
      let orderUpdated: (typeof ordersTable.$inferSelect)[] = [];

      if (currentOrderTrackingNumber) {
        orderUpdated = await db
          .update(ordersTable)
          .set({ status: currentOrderStatus, driverId: driver.id, updatedAt: new Date() })
          .where(eq(ordersTable.orderNumber, currentOrderTrackingNumber))
          .returning();
      } else if (currentOrderId) {
        orderUpdated = await db
          .update(ordersTable)
          .set({ status: currentOrderStatus, driverId: driver.id, updatedAt: new Date() })
          .where(and(
            eq(ordersTable.id, currentOrderId),
            eq(ordersTable.driverId, driver.id),
          ))
          .returning();
      }

      if (orderUpdated.length === 0) {
        await logActivity({
          driverId: driver.id,
          action: "sync_order_not_found",
          details: `Sync livreur: commande introuvable (ref=${currentOrderTrackingNumber ?? "?"}, id Livreurs=${currentOrderId ?? "?"})`,
        });
      } else {
        emitEvent("order:updated", {
          id: orderUpdated[0].id,
          orderNumber: orderUpdated[0].orderNumber,
          status: currentOrderStatus,
          driverId: driver.id,
        });
      }
    }
  }

  if (lat !== undefined && lng !== undefined) {
    emitEvent("driver:location", { driverId: driver.id, lat, lng });
  }

  const activeOrders = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.driverId, driver.id),
        or(
          eq(ordersTable.status, "assigned"),
          eq(ordersTable.status, "picked_up"),
          eq(ordersTable.status, "delivering"),
        )
      )
    )
    .limit(5);

  res.json({
    ok: true,
    driver: formatDriver(driver as Record<string, unknown>),
    activeOrders: activeOrders.map(o => formatOrder(o as Record<string, unknown>)),
  });
});

export default router;
