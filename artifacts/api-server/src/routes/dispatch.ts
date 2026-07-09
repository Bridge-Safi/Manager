import { Router, type IRouter } from "express";
import { eq, and, ne, or, isNull, count, inArray } from "drizzle-orm";
import { db, deliveriesTable, deliverersTable } from "@workspace/db";
import {
  DispatchDeliveryParams,
  AcceptDeliveryBody,
  AcceptDeliveryParams,
  RefuseDeliveryBody,
  RefuseDeliveryParams,
  ConfirmDeliveredBody,
  ConfirmDeliveredParams,
  GetPendingDispatchQueryParams,
  GetPendingDispatchParams,
  GetDeliveryResponse,
} from "@workspace/api-zod";
import { sendWhatsAppProof } from "../lib/whatsapp";
import { serializeDelivery } from "../lib/serializers";
import { sendPushToAllDeliverers } from "./push";

const router: IRouter = Router();

const DISPATCH_TIMEOUT_MS = 5 * 60 * 1000;

// ── Pending dispatch for a livreur ─────────────────────────────────────────
// All livreurs see the same order at the SAME TIME — no proximity delay.
// Only livreurs poll this endpoint. Chauffeurs have their own /trips/pending-dispatch.
router.get("/deliveries/pending-dispatch", async (req, res): Promise<void> => {
  res.set("Cache-Control", "no-store");

  const rawDelivererId = parseInt(req.query.delivererId as string, 10);
  if (!rawDelivererId || isNaN(rawDelivererId)) {
    res.status(400).json({ error: "delivererId est requis" });
    return;
  }

  // Guard: offline livreurs don't receive orders
  const [deliverer] = await db
    .select()
    .from(deliverersTable)
    .where(eq(deliverersTable.id, rawDelivererId));

  if (deliverer?.status === "offline") {
    res.json({ hasPending: false });
    return;
  }

  // Seuls les serviceTypes "food delivery" vont aux livreurs.
  // click_collect, taxi, moto et tout type inconnu sont exclus.
  const FOOD_SERVICE_TYPES = ["eats", "tabac", "pharmacie", "fleurs", "autre"];
  const allDispatching = await db
    .select()
    .from(deliveriesTable)
    .where(
      and(
        ne(deliveriesTable.dispatchPhase, "none"),
        ne(deliveriesTable.dispatchPhase, "accepted"),
        or(
          isNull(deliveriesTable.serviceType),
          inArray(deliveriesTable.serviceType, FOOD_SERVICE_TYPES)
        )
      )
    );

  let found = null;
  for (const delivery of allDispatching) {
    const now = Date.now();
    const dispatchedTime = delivery.dispatchedAt ? new Date(delivery.dispatchedAt).getTime() : 0;
    let elapsed = now - dispatchedTime;
    let effectiveDispatchedTime = dispatchedTime;

    // ── Réarmement au lieu d'expiration définitive ────────────────────────
    // Avant : une commande non acceptée après 5 min passait en dispatchPhase
    // "none" et disparaissait pour toujours — même si AUCUN livreur n'était
    // en ligne pour l'accepter pendant ces 5 minutes. Un livreur qui se
    // connectait ensuite (même 1h plus tard) ne la recevait jamais et elle
    // restait orpheline. Maintenant : tant qu'aucun livreur ne l'a acceptée,
    // on relance une fenêtre de 5 min fraîche à chaque fois qu'un livreur en
    // ligne la consulte, au lieu de l'abandonner.
    if (elapsed >= DISPATCH_TIMEOUT_MS) {
      const [reArmed] = await db
        .update(deliveriesTable)
        .set({ dispatchedAt: new Date(), updatedAt: new Date() })
        .where(eq(deliveriesTable.id, delivery.id))
        .returning();
      effectiveDispatchedTime = reArmed?.dispatchedAt ? new Date(reArmed.dispatchedAt).getTime() : now;
      elapsed = now - effectiveDispatchedTime;
    }

    // ── NO proximity gate: all livreurs see this at the same time ──
    const secondsLeft = Math.max(0, Math.floor((DISPATCH_TIMEOUT_MS - elapsed) / 1000));
    found = {
      hasPending: true,
      delivery: GetDeliveryResponse.parse(serializeDelivery(delivery)),
      expiresAt: new Date(effectiveDispatchedTime + DISPATCH_TIMEOUT_MS).toISOString(),
      secondsLeft,
      phase: "cascade",
    };
    break;
  }

  if (!found) {
    res.json({ hasPending: false });
    return;
  }

  res.json(found);
});

router.post("/deliveries/:id/dispatch", async (req, res): Promise<void> => {
  const params = DispatchDeliveryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [delivery] = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, params.data.id));
  if (!delivery) {
    res.status(404).json({ error: "Delivery not found" });
    return;
  }

  // Broadcast to ALL livreurs immediately — no "available" check blocks the dispatch
  const [updated] = await db
    .update(deliveriesTable)
    .set({
      delivererId: null,
      status: "pending",
      dispatchPhase: "cascade",
      dispatchedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(deliveriesTable.id, params.data.id))
    .returning();

  req.log.info({ deliveryId: params.data.id, phase: "cascade" }, "Delivery broadcast to all livreurs");

  sendPushToAllDeliverers({
    title: "🛵 Nouvelle commande — Bridge Safi",
    body: `${updated.customerName} · ${updated.deliveryAddress} — 5 min pour accepter`,
    url: "/livreur",
  }).catch(() => {});

  res.json({
    delivery: GetDeliveryResponse.parse(serializeDelivery(updated)),
    phase: "cascade",
    message: `Commande envoyée à tous les livreurs — 5 minutes pour accepter`,
  });
});

router.post("/deliveries/:id/accept", async (req, res): Promise<void> => {
  const params = AcceptDeliveryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = AcceptDeliveryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [delivery] = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, params.data.id));
  if (!delivery) {
    res.status(404).json({ error: "Delivery not found" });
    return;
  }

  if (delivery.dispatchPhase === "none" || delivery.dispatchPhase === "accepted") {
    res.status(409).json({ error: "Cette livraison n'est plus disponible" });
    return;
  }

  // Enforce max 3 simultaneous deliveries (pending accepted + in_progress)
  const [{ activeCount }] = await db
    .select({ activeCount: count() })
    .from(deliveriesTable)
    .where(and(
      eq(deliveriesTable.delivererId, body.data.delivererId),
      or(
        eq(deliveriesTable.status, "pending"),
        eq(deliveriesTable.status, "in_progress")
      )
    ));

  if (activeCount >= 3) {
    res.status(409).json({ error: "Maximum 3 commandes simultanées atteint" });
    return;
  }

  // Status stays "pending" — livreur must physically pick up and press
  // "Commande récupérée" to transition to "in_progress"
  const [updated] = await db
    .update(deliveriesTable)
    .set({
      delivererId: body.data.delivererId,
      dispatchPhase: "accepted",
      updatedAt: new Date(),
    })
    .where(eq(deliveriesTable.id, params.data.id))
    .returning();

  await db
    .update(deliverersTable)
    .set({ status: "busy" })
    .where(eq(deliverersTable.id, body.data.delivererId));

  req.log.info({ deliveryId: params.data.id, delivererId: body.data.delivererId, activeCount: activeCount + 1 }, "Delivery accepted");

  res.json(GetDeliveryResponse.parse(serializeDelivery(updated)));
});

router.post("/deliveries/:id/refuse", async (req, res): Promise<void> => {
  const params = RefuseDeliveryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = RefuseDeliveryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [delivery] = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, params.data.id));
  if (!delivery) {
    res.status(404).json({ error: "Delivery not found" });
    return;
  }

  req.log.info({ deliveryId: params.data.id, delivererId: body.data.delivererId }, "Delivery refused (local only)");

  res.json(GetDeliveryResponse.parse(serializeDelivery(delivery)));
});

router.post("/deliveries/:id/confirm-delivered", async (req, res): Promise<void> => {
  const params = ConfirmDeliveredParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = ConfirmDeliveredBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [delivery] = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, params.data.id));
  if (!delivery) {
    res.status(404).json({ error: "Livraison introuvable" });
    return;
  }

  if (delivery.status === "delivered") {
    res.status(409).json({ error: "Livraison déjà confirmée" });
    return;
  }

  // ── Anti-cheat: cannot confirm too soon after pickup ─────────────────────
  // Fenêtre réduite (60s -> 15s) : Safi est une petite ville, certaines
  // livraisons sont légitimement très rapides et se faisaient bloquer.
  const ANTI_CHEAT_WINDOW_MS = 15_000;
  if (delivery.pickedUpAt) {
    const elapsed = Date.now() - new Date(delivery.pickedUpAt).getTime();
    if (elapsed < ANTI_CHEAT_WINDOW_MS) {
      const remaining = Math.ceil((ANTI_CHEAT_WINDOW_MS - elapsed) / 1000);
      res.status(409).json({ error: `Trop tôt — patientez encore ${remaining}s avant de confirmer.` });
      return;
    }
  }

  const delivererId = body.data.delivererId;
  const [deliverer] = await db.select().from(deliverersTable).where(eq(deliverersTable.id, delivererId));

  const [updated] = await db
    .update(deliveriesTable)
    .set({
      status: "delivered",
      dispatchPhase: "none",
      updatedAt: new Date(),
    })
    .where(eq(deliveriesTable.id, params.data.id))
    .returning();

  // Check remaining active deliveries (pending accepted + in_progress)
  const [{ remainingCount }] = await db
    .select({ remainingCount: count() })
    .from(deliveriesTable)
    .where(and(
      eq(deliveriesTable.delivererId, delivererId),
      or(
        eq(deliveriesTable.status, "pending"),
        eq(deliveriesTable.status, "in_progress")
      )
    ));

  await db
    .update(deliverersTable)
    .set({
      status: remainingCount > 0 ? "busy" : "available",
      totalDeliveries: (deliverer?.totalDeliveries ?? 0) + 1,
    })
    .where(eq(deliverersTable.id, delivererId));

  req.log.info({ deliveryId: params.data.id }, "Delivery confirmed as delivered");

  if (deliverer) {
    sendWhatsAppProof({
      deliveryId: delivery.id,
      trackingNumber: delivery.trackingNumber,
      customerName: delivery.customerName,
      deliveryAddress: delivery.deliveryAddress,
      delivererName: deliverer.name,
      delivererPhone: deliverer.phone,
      proofNote: body.data.proofNote,
    }).catch(() => {});
  }

  // ── Notifie Bridge-safi (client) que la livraison est terminée ────────────
  // Sans ce callback, la page de suivi du client (Bridge Eats / Pharmacie /
  // Boulangerie / etc.) ne voit jamais le statut "delivered" : elle continue
  // d'afficher la carte GPS au lieu du message de félicitations.
  if (delivery.trackingNumber) {
    fetch("https://www.safi-bridge.ma/api/callbacks/order-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber: delivery.trackingNumber,
        status: "delivered",
      }),
    })
      .then((r) => req.log.info({ trackingNumber: delivery.trackingNumber, ok: r.ok }, "Bridge-safi notified of delivery completion"))
      .catch((err) => req.log.warn({ err, trackingNumber: delivery.trackingNumber }, "Failed to notify Bridge-safi of delivery completion"));
  }

  res.json(GetDeliveryResponse.parse(serializeDelivery(updated)));
});

router.get("/deliveries/:id/pending-dispatch", async (req, res): Promise<void> => {
  const params = GetPendingDispatchParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const query = GetPendingDispatchQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const [delivery] = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, params.data.id));

  if (!delivery) {
    res.json({ hasPending: false });
    return;
  }

  if (delivery.dispatchPhase !== "cascade") {
    res.json({ hasPending: false });
    return;
  }

  const now = Date.now();
  const dispatchedTime = delivery.dispatchedAt ? new Date(delivery.dispatchedAt).getTime() : 0;
  const elapsed = now - dispatchedTime;

  if (elapsed >= DISPATCH_TIMEOUT_MS) {
    // Réarmement (voir /deliveries/pending-dispatch) au lieu d'expirer pour de bon.
    const [reArmed] = await db
      .update(deliveriesTable)
      .set({ dispatchedAt: new Date(), updatedAt: new Date() })
      .where(eq(deliveriesTable.id, params.data.id))
      .returning();
    const newDispatchedTime = reArmed?.dispatchedAt ? new Date(reArmed.dispatchedAt).getTime() : now;
    res.json({
      hasPending: true,
      delivery: GetDeliveryResponse.parse(serializeDelivery(reArmed ?? delivery)),
      expiresAt: new Date(newDispatchedTime + DISPATCH_TIMEOUT_MS).toISOString(),
      secondsLeft: Math.floor(DISPATCH_TIMEOUT_MS / 1000),
      phase: "cascade",
    });
    return;
  }

  const secondsLeft = Math.max(0, Math.floor((DISPATCH_TIMEOUT_MS - elapsed) / 1000));

  res.json({
    hasPending: true,
    delivery: GetDeliveryResponse.parse(serializeDelivery(delivery)),
    expiresAt: new Date(dispatchedTime + DISPATCH_TIMEOUT_MS).toISOString(),
    secondsLeft,
    phase: "cascade",
  });
});

export default router;
