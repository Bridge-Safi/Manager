import { Router } from "express";

const router = Router();

router.get("/vapid-public-key", (_req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY ?? "";
  if (!key) {
    res.status(503).json({ error: "Push not configured" });
    return;
  }
  res.json({ publicKey: key });
});

router.post("/subscribe", async (req, res) => {
  const { subscription, delivererId, driverId } = req.body;
  if (!subscription) {
    res.status(400).json({ error: "subscription required" });
    return;
  }
  res.json({ ok: true });
});

/**
 * Envoie une notification push à un livreur spécifique.
 * Stub — à implémenter avec web-push + table push_subscriptions (tâche #3).
 */
export async function sendPushToDeliverer(
  _delivererId: number,
  _notification: { title: string; body: string; url?: string; urgent?: boolean }
): Promise<void> {
  // TODO: implémenter avec web-push quand VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY sont configurés
}

/**
 * Envoie une notification push à tous les livreurs disponibles.
 * Stub — à implémenter avec web-push + table push_subscriptions (tâche #3).
 */
export async function sendPushToAllDeliverers(
  _notification: { title: string; body: string; url?: string; urgent?: boolean }
): Promise<void> {
  // TODO: implémenter avec web-push quand VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY sont configurés
}

export default router;
