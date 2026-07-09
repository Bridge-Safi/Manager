import { Router } from "express";
import webpush from "web-push";
import { db } from "@workspace/db";
import { pushSubscriptionsTable } from "@workspace/db";
import { eq, and, isNotNull } from "drizzle-orm";

const router = Router();

// ── Configure VAPID ───────────────────────────────────────────────────────────
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT     ?? "mailto:contact@bridgesafi.com";

let vapidReady = false;
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    vapidReady = true;
    console.log("[push] ✅ VAPID configuré — push notifications actives");
  } catch (err) {
    console.error("[push] ❌ Erreur VAPID:", err);
  }
} else {
  console.warn("[push] ⚠️  VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY manquants — push désactivé");
}

// ── Routes publiques ──────────────────────────────────────────────────────────

router.get("/vapid-public-key", (_req, res) => {
  if (!vapidReady) {
    res.status(503).json({ error: "Push not configured" });
    return;
  }
  res.json({ publicKey: VAPID_PUBLIC });
});

router.post("/subscribe", async (req, res) => {
  const { subscription, delivererId, driverId } = req.body as {
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
    delivererId?: number;
    driverId?: number;
  };

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    res.status(400).json({ error: "subscription invalide" });
    return;
  }

  try {
    // Supprimer les anciennes subscriptions pour ce livreur/driver
    if (delivererId) {
      await db
        .delete(pushSubscriptionsTable)
        .where(eq(pushSubscriptionsTable.delivererId, delivererId));
    } else if (driverId) {
      await db
        .delete(pushSubscriptionsTable)
        .where(eq(pushSubscriptionsTable.driverId, driverId));
    }

    // Insérer la nouvelle
    await db.insert(pushSubscriptionsTable).values({
      delivererId: delivererId ?? null,
      driverId: driverId ?? null,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("[push] Erreur save subscription:", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── Helpers internes ──────────────────────────────────────────────────────────

async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string; urgent?: boolean; tag?: string }
): Promise<void> {
  if (!vapidReady) return;
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 }
    );
  } catch (err: any) {
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      // Subscription expirée → nettoyer
      await db
        .delete(pushSubscriptionsTable)
        .where(eq(pushSubscriptionsTable.endpoint, sub.endpoint))
        .catch(() => {});
    } else {
      console.error("[push] Erreur sendNotification:", err?.message ?? err);
    }
  }
}

/**
 * Envoie une notification push à un livreur spécifique (delivery).
 */
export async function sendPushToDeliverer(
  delivererId: number,
  notification: { title: string; body: string; url?: string; urgent?: boolean }
): Promise<void> {
  if (!vapidReady) return;
  const subs = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.delivererId, delivererId));

  await Promise.all(subs.map((s) => sendPush(s, { ...notification, tag: `order-${delivererId}` })));
}

/**
 * Envoie une notification push à un chauffeur/moto spécifique.
 */
export async function sendPushToDriver(
  driverId: number,
  notification: { title: string; body: string; url?: string; urgent?: boolean }
): Promise<void> {
  if (!vapidReady) return;
  const subs = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.driverId, driverId));

  await Promise.all(subs.map((s) => sendPush(s, { ...notification, tag: `ride-${driverId}` })));
}

/**
 * Envoie une notification push à TOUS les livreurs (nouvelle commande en dispatch).
 */
export async function sendPushToAllDeliverers(
  notification: { title: string; body: string; url?: string; urgent?: boolean }
): Promise<void> {
  if (!vapidReady) return;
  const subs = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(isNotNull(pushSubscriptionsTable.delivererId));

  await Promise.all(subs.map((s) => sendPush(s, { ...notification, tag: "new-dispatch" })));
}

export default router;
