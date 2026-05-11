import { Router } from "express";
import { db, siteStatsTable, visitLogsTable } from "@workspace/db";
import { eq, sql, count } from "drizzle-orm";

const router = Router();

async function ensureStatsRow() {
  const rows = await db.select().from(siteStatsTable).limit(1);
  if (rows.length === 0) {
    await db.insert(siteStatsTable).values({ visits: 0, registrations: 0 });
  }
  return rows[0] ?? (await db.select().from(siteStatsTable).limit(1))[0];
}

// GET /stats — retourne les compteurs
router.get("/", async (_req, res) => {
  const stats = await ensureStatsRow();
  res.json({
    visits: stats.visits,
    registrations: stats.registrations,
    updatedAt: stats.updatedAt.toISOString(),
  });
});

// POST /stats/visit — enregistre une visite (dédupliquée par sessionId)
router.post("/visit", async (req, res) => {
  const { sessionId, userAgent } = req.body as { sessionId?: string; userAgent?: string };
  if (!sessionId) {
    res.status(400).json({ error: "sessionId requis" });
    return;
  }

  // Vérifier si cette session a déjà été comptée (dans les dernières 24h)
  const existing = await db
    .select({ id: visitLogsTable.id })
    .from(visitLogsTable)
    .where(
      sql`${visitLogsTable.sessionId} = ${sessionId} AND ${visitLogsTable.createdAt} > now() - interval '24 hours'`
    )
    .limit(1);

  if (existing.length > 0) {
    const stats = await ensureStatsRow();
    res.json({ counted: false, visits: stats.visits, registrations: stats.registrations });
    return;
  }

  // Log la visite
  await db.insert(visitLogsTable).values({ sessionId, userAgent: userAgent ?? null });

  // Incrémenter le compteur
  await ensureStatsRow();
  await db.update(siteStatsTable).set({
    visits: sql`${siteStatsTable.visits} + 1`,
    updatedAt: new Date(),
  }).where(eq(siteStatsTable.id, 1));

  const stats = await db.select().from(siteStatsTable).limit(1);
  res.json({ counted: true, visits: stats[0]?.visits ?? 0, registrations: stats[0]?.registrations ?? 0 });
});

// POST /stats/register — enregistre une inscription
router.post("/register", async (_req, res) => {
  await ensureStatsRow();
  await db.update(siteStatsTable).set({
    registrations: sql`${siteStatsTable.registrations} + 1`,
    updatedAt: new Date(),
  }).where(eq(siteStatsTable.id, 1));

  const stats = await db.select().from(siteStatsTable).limit(1);
  res.json({ registrations: stats[0]?.registrations ?? 0 });
});

export default router;
