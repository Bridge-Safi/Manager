import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { db, deliveriesTable, deliverersTable } from "@workspace/db";
import { sendPushToDeliverer } from "./push";

const router: IRouter = Router();

const WEBHOOK_SECRET = process.env["BRIDGE_WEBHOOK_SECRET"];
if (!WEBHOOK_SECRET) {
  // Fail-closed : sans secret, les tokens d'assignation ne peuvent pas être générés
  console.error("[assign] BRIDGE_WEBHOOK_SECRET non configuré — route /assign désactivée");
}

export function signAssignToken(deliveryId: number, delivererId: number): string {
  return crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(`${deliveryId}:${delivererId}`)
    .digest("base64url");
}

function verifyToken(deliveryId: number, delivererId: number, token: string): boolean {
  const expected = signAssignToken(deliveryId, delivererId);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

function successHtml(delivererName: string, delivery: {
  customerName: string;
  deliveryAddress: string;
  trackingNumber: string;
}) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Commande assignée — Bridge</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FAF6EF;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{background:#fff;border-radius:24px;padding:32px 24px;max-width:400px;width:100%;box-shadow:0 4px 24px rgba(44,24,16,.10);border:1px solid #E8DDD0;text-align:center}
    .icon{width:72px;height:72px;background:#E8F5EE;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:36px}
    h1{color:#2C1810;font-size:22px;font-weight:700;margin-bottom:8px}
    .sub{color:#6B4033;font-size:15px;margin-bottom:24px}
    .detail{background:#FAF6EF;border-radius:14px;padding:16px;text-align:left;border:1px solid #E8DDD0;margin-bottom:12px}
    .detail-row{display:flex;gap:10px;align-items:flex-start;padding:6px 0;font-size:14px;color:#2C1810}
    .detail-row:not(:last-child){border-bottom:1px solid #E8DDD0}
    .emoji{width:22px;text-align:center;flex-shrink:0}
    .badge{display:inline-block;background:#C14B2A;color:#fff;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;margin-top:20px;letter-spacing:.5px}
    .stripe{height:4px;border-radius:4px 4px 0 0;background:repeating-linear-gradient(90deg,#C14B2A 0,#C14B2A 20px,#D4880C 20px,#D4880C 40px,#2A7A48 40px,#2A7A48 60px,#D4880C 60px,#D4880C 80px);margin:-32px -24px 28px}
  </style>
</head>
<body>
  <div class="card">
    <div class="stripe"></div>
    <div class="icon">✅</div>
    <h1>Commande assignée !</h1>
    <div class="sub">Notification envoyée à <strong>${delivererName}</strong></div>
    <div class="detail">
      <div class="detail-row"><span class="emoji">👤</span><span>${delivery.customerName}</span></div>
      <div class="detail-row"><span class="emoji">📍</span><span>${delivery.deliveryAddress}</span></div>
      <div class="detail-row"><span class="emoji">🔖</span><span style="font-family:monospace">${delivery.trackingNumber}</span></div>
    </div>
    <div class="badge">🔔 ${delivererName} a reçu l'alerte</div>
  </div>
</body>
</html>`;
}

function errorHtml(message: string) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Erreur — Bridge</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FAF6EF;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{background:#fff;border-radius:24px;padding:32px 24px;max-width:400px;width:100%;box-shadow:0 4px 24px rgba(44,24,16,.10);border:1px solid #E8DDD0;text-align:center}
    .icon{font-size:48px;margin-bottom:16px}
    h1{color:#C14B2A;font-size:20px;font-weight:700;margin-bottom:10px}
    p{color:#6B4033;font-size:14px}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚠️</div>
    <h1>Impossible d'assigner</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

router.get("/assign/:deliveryId/:delivererId/:token", async (req, res): Promise<void> => {
  const { deliveryId, delivererId, token } = req.params;

  const dId = parseInt(deliveryId, 10);
  const lId = parseInt(delivererId, 10);

  if (isNaN(dId) || isNaN(lId)) {
    res.status(400).send(errorHtml("Lien invalide."));
    return;
  }

  if (!verifyToken(dId, lId, token)) {
    res.status(401).send(errorHtml("Lien expiré ou non autorisé."));
    return;
  }

  const [delivery] = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, dId));
  if (!delivery) {
    res.status(404).send(errorHtml("Commande introuvable."));
    return;
  }

  if (delivery.status !== "pending") {
    const [deliverer] = await db.select().from(deliverersTable).where(eq(deliverersTable.id, lId));
    const who = deliverer?.name || "un autre livreur";
    res.status(200).send(errorHtml(`Cette commande a déjà été assignée à ${who}.`));
    return;
  }

  const [deliverer] = await db.select().from(deliverersTable).where(eq(deliverersTable.id, lId));
  if (!deliverer) {
    res.status(404).send(errorHtml("Livreur introuvable."));
    return;
  }

  await db
    .update(deliveriesTable)
    .set({ delivererId: lId, status: "in_progress", dispatchPhase: "accepted" })
    .where(eq(deliveriesTable.id, dId));

  // Mark deliverer as busy
  await db
    .update(deliverersTable)
    .set({ status: "busy" })
    .where(eq(deliverersTable.id, lId));

  await sendPushToDeliverer(lId, {
    title: `🎯 Commande pour toi — ${delivery.customerName}`,
    body: `📍 ${delivery.deliveryAddress}\n⏱️ Assignée directement par le gérant`,
    url: "/livreur",
    urgent: true,
  });

  req.log.info(
    { deliveryId: dId, delivererId: lId, delivererName: deliverer.name },
    "[ASSIGN] ✅ Commande assignée directement depuis WhatsApp"
  );

  res.status(200).send(successHtml(deliverer.name, {
    customerName: delivery.customerName,
    deliveryAddress: delivery.deliveryAddress,
    trackingNumber: delivery.trackingNumber,
  }));
});

export default router;
