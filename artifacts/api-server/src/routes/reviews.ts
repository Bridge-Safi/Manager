import { Router } from "express";
import { db, reviewsTable, driversTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { logActivity } from "../lib/log-activity";

const router = Router();

// POST /drivers/:id/refuse
router.post("/:id/refuse", async (req, res) => {
  const driverId = Number(req.params.id);

  const [driver] = await db
    .update(driversTable)
    .set({ totalRefusals: sql`${driversTable.totalRefusals} + 1` })
    .where(eq(driversTable.id, driverId))
    .returning();

  if (!driver) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }

  await logActivity({
    driverId,
    orderId: req.body?.orderId ?? null,
    action: "order_cancelled",
    details: `${driver.name} a refusé une commande (total: ${driver.totalRefusals} refus)`,
  });

  res.json({
    ...driver,
    createdAt: driver.createdAt.toISOString(),
    lastActiveAt: driver.lastActiveAt ? driver.lastActiveAt.toISOString() : null,
    warnedAt: driver.warnedAt ? driver.warnedAt.toISOString() : null,
  });
});

// POST /drivers/:id/warn
router.post("/:id/warn", async (req, res) => {
  const driverId = Number(req.params.id);
  const reason = req.body?.reason ?? "Comportement non conforme";

  const [driver] = await db
    .update(driversTable)
    .set({ warnedAt: new Date() })
    .where(eq(driversTable.id, driverId))
    .returning();

  if (!driver) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }

  await logActivity({
    driverId,
    action: "status_offline",
    details: `⚠️ Avertissement envoyé à ${driver.name}: ${reason}`,
  });

  res.json({
    ...driver,
    createdAt: driver.createdAt.toISOString(),
    lastActiveAt: driver.lastActiveAt ? driver.lastActiveAt.toISOString() : null,
    warnedAt: driver.warnedAt ? driver.warnedAt.toISOString() : null,
  });
});

// PATCH /drivers/:id/block
router.patch("/:id/block", async (req, res) => {
  const driverId = Number(req.params.id);
  const blocked: boolean = req.body?.blocked ?? true;

  const [driver] = await db
    .update(driversTable)
    .set({
      isBlocked: blocked,
      status: blocked ? "offline" : "available",
    })
    .where(eq(driversTable.id, driverId))
    .returning();

  if (!driver) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }

  await logActivity({
    driverId,
    action: blocked ? "status_offline" : "status_online",
    details: blocked
      ? `🔒 Compte de ${driver.name} bloqué par le manager`
      : `🔓 Compte de ${driver.name} débloqué par le manager`,
  });

  res.json({
    ...driver,
    createdAt: driver.createdAt.toISOString(),
    lastActiveAt: driver.lastActiveAt ? driver.lastActiveAt.toISOString() : null,
    warnedAt: driver.warnedAt ? driver.warnedAt.toISOString() : null,
  });
});

// GET /drivers/:id/reviews
router.get("/:id/reviews", async (req, res) => {
  const driverId = Number(req.params.id);
  const limit = parseInt(req.query.limit as string) || 20;

  const rows = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.driverId, driverId))
    .orderBy(desc(reviewsTable.createdAt))
    .limit(limit);

  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

// POST /drivers/:id/reviews
router.post("/:id/reviews", async (req, res) => {
  const driverId = Number(req.params.id);
  const { rating, comment, orderId, sentiment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Rating must be between 1 and 5" });
    return;
  }

  const [review] = await db
    .insert(reviewsTable)
    .values({ driverId, rating, comment: comment ?? null, orderId: orderId ?? null, sentiment: sentiment ?? "neutral" })
    .returning();

  // Recalculate driver average rating
  const avg = await db
    .select({ avg: sql<number>`round(avg(${reviewsTable.rating})::numeric, 1)::float` })
    .from(reviewsTable)
    .where(eq(reviewsTable.driverId, driverId));

  const newRating = avg[0]?.avg ?? rating;
  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, driverId));

  await db.update(driversTable).set({ rating: newRating }).where(eq(driversTable.id, driverId));

  await logActivity({
    driverId,
    orderId: orderId ?? null,
    action: "order_delivered",
    details: `Avis ${rating}⭐ pour ${driver?.name ?? "le livreur"}: ${sentiment === "positive" ? "👍" : sentiment === "negative" ? "👎" : "😐"} ${comment ?? ""}`,
  });

  res.status(201).json({ ...review, createdAt: review.createdAt.toISOString() });
});

export default router;
