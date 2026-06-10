import { Router } from "express";
import { db, gradoSubscriptionsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

const PLANS: Record<string, { label: string; amountMad: number; promoMad?: number; promoMonths?: number }> = {
  elite: { label: "Sans limites · Élite", amountMad: 359, promoMad: 180, promoMonths: 3 },
  starter: { label: "Starter", amountMad: 149 },
};

// GET /grado/subscriptions
router.get("/subscriptions", async (_req, res) => {
  const rows = await db
    .select()
    .from(gradoSubscriptionsTable)
    .orderBy(desc(gradoSubscriptionsTable.requestedAt));
  res.json(rows.map(r => ({ ...r, planInfo: PLANS[r.plan] ?? null })));
});

// GET /grado/subscriptions/stats
router.get("/subscriptions/stats", async (_req, res) => {
  const rows = await db.select().from(gradoSubscriptionsTable);
  const pending = rows.filter(r => r.status === "pending").length;
  const active = rows.filter(r => r.status === "active").length;
  const rejected = rows.filter(r => r.status === "rejected").length;
  const expired = rows.filter(r => r.status === "expired").length;
  const totalRevenue = rows
    .filter(r => r.status === "active")
    .reduce((s, r) => s + (r.amountMad ?? 0), 0);
  res.json({ pending, active, rejected, expired, total: rows.length, totalRevenue });
});

// POST /grado/subscriptions — créer une demande d'abonnement
router.post("/subscriptions", async (req, res) => {
  const { username, supabaseUserId, plan = "elite", paymentMethod = "virement", notes, periodMonths } = req.body as Record<string, string | number>;
  if (!username) { res.status(400).json({ error: "username requis" }); return; }

  const planInfo = PLANS[String(plan)] ?? PLANS.elite;
  const months = Number(periodMonths) || 1;
  const amount = months >= 3 && planInfo.promoMad ? planInfo.promoMad * months : planInfo.amountMad * months;

  const [sub] = await db
    .insert(gradoSubscriptionsTable)
    .values({
      username: String(username),
      supabaseUserId: supabaseUserId ? String(supabaseUserId) : null,
      plan: String(plan),
      amountMad: amount,
      periodMonths: months,
      paymentMethod: String(paymentMethod),
      notes: notes ? String(notes) : null,
      status: "pending",
    })
    .returning();

  res.status(201).json({ ...sub, planInfo });
});

// PATCH /grado/subscriptions/:id/validate — valider un paiement
router.patch("/subscriptions/:id/validate", async (req, res) => {
  const id = Number(req.params.id);
  const { notes } = req.body as { notes?: string };

  const [existing] = await db
    .select()
    .from(gradoSubscriptionsTable)
    .where(eq(gradoSubscriptionsTable.id, id));

  if (!existing) { res.status(404).json({ error: "Abonnement non trouvé" }); return; }

  const months = existing.periodMonths ?? 1;
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + months);

  const [updated] = await db
    .update(gradoSubscriptionsTable)
    .set({
      status: "active",
      validatedAt: new Date(),
      expiresAt,
      notes: notes ?? existing.notes,
    })
    .where(eq(gradoSubscriptionsTable.id, id))
    .returning();

  res.json({ ...updated, planInfo: PLANS[updated.plan] ?? null });
});

// PATCH /grado/subscriptions/:id/reject — refuser un paiement
router.patch("/subscriptions/:id/reject", async (req, res) => {
  const id = Number(req.params.id);
  const { notes } = req.body as { notes?: string };

  const [updated] = await db
    .update(gradoSubscriptionsTable)
    .set({ status: "rejected", notes: notes ?? null })
    .where(eq(gradoSubscriptionsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Abonnement non trouvé" }); return; }
  res.json({ ...updated, planInfo: PLANS[updated.plan] ?? null });
});

// DELETE /grado/subscriptions/:id
router.delete("/subscriptions/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(gradoSubscriptionsTable).where(eq(gradoSubscriptionsTable.id, id));
  res.json({ ok: true });
});

// GET /grado/plans
router.get("/plans", (_req, res) => {
  res.json(Object.entries(PLANS).map(([key, val]) => ({ key, ...val })));
});

export default router;
