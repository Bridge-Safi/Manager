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

// GET /stats/visits-by-day — historique des visites par jour (14 derniers jours)
router.get("/visits-by-day", async (_req, res) => {
  const rows = await db
    .select({
      day: sql<string>`${visitLogsTable.createdAt}::date::text`,
      count: count(),
    })
    .from(visitLogsTable)
    .groupBy(sql`${visitLogsTable.createdAt}::date`)
    .orderBy(sql`${visitLogsTable.createdAt}::date DESC`)
    .limit(30);

  res.json(rows);
});

// GET /stats/devices — répartition des navigateurs/appareils
router.get("/devices", async (_req, res) => {
  const rows = await db
    .select({
      userAgent: visitLogsTable.userAgent,
      count: count(),
    })
    .from(visitLogsTable)
    .groupBy(visitLogsTable.userAgent)
    .orderBy(sql`count(*) DESC`)
    .limit(20);

  const parsed = rows.map((r) => {
    const ua = r.userAgent ?? "";
    let device = "Inconnu";
    let browser = "Inconnu";
    if (/iPhone|iPad|Android/.test(ua)) device = "Mobile";
    else if (/Macintosh|Windows|Linux/.test(ua)) device = "Desktop";
    if (/HeadlessChrome/.test(ua)) browser = "Bot/Crawl";
    else if (/Edg/.test(ua)) browser = "Edge";
    else if (/Chrome/.test(ua)) browser = "Chrome";
    else if (/Safari/.test(ua)) browser = "Safari";
    else if (/Firefox/.test(ua)) browser = "Firefox";
    return { userAgent: r.userAgent, device, browser, count: r.count };
  });

  res.json(parsed);
});

export default router;
