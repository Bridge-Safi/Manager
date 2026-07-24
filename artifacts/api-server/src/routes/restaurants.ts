import { Router } from "express";
import { db, restaurantsTable, ordersTable } from "@workspace/db";
import { eq, sql, and, inArray, desc } from "drizzle-orm";

// Géocodage via Nominatim (OpenStreetMap, gratuit, sans clé)
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${address}, Safi, Maroc`);
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=ma`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "GradoEats-Manager/1.0 (contact@bridgesafi.com)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { lat: string; lon: string }[];
    if (!data[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

// Géocode les restaurants sans coordonnées (best-effort, en arrière-plan)
async function geocodePendingRestaurants(): Promise<void> {
  const rows = await db
    .select({ id: restaurantsTable.id, name: restaurantsTable.name, address: restaurantsTable.address })
    .from(restaurantsTable)
    .where(sql`lat IS NULL AND address IS NOT NULL AND address != '—'`);

  for (const r of rows) {
    const coords = await geocodeAddress(r.address !== "—" ? r.address : r.name);
    if (coords) {
      await db.update(restaurantsTable)
        .set({ lat: coords.lat, lng: coords.lng })
        .where(eq(restaurantsTable.id, r.id));
    }
  }
}

const router = Router();

// ── Restos inscrits sur le dashboard restaurateurs (restaurant.safi-bridge.ma) ──
// Base Postgres separee : sans cette synchro, un resto qui s'inscrit la-bas
// n'apparaissait JAMAIS ici (page Restaurants vide). Sync-on-read best-effort :
// on importe les noms manquants comme vraies lignes locales.
const RESTAURANT_DASHBOARD_BASE = process.env.RESTAURANT_DASHBOARD_BASE ?? "https://restaurant.safi-bridge.ma";
const INTERNAL_LOOKUP_SECRET = process.env.INTERNAL_LOOKUP_SECRET ?? "bridge-safi-internal-lookup-2026";

async function syncDashboardRestaurants(): Promise<void> {
  try {
    const resp = await fetch(`${RESTAURANT_DASHBOARD_BASE}/api/restaurant/all`, {
      headers: { "X-Internal-Secret": INTERNAL_LOOKUP_SECRET },
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return;
    const remote = (await resp.json()) as { name: string; email?: string | null; serviceType?: string | null }[];
    if (!Array.isArray(remote) || remote.length === 0) return;

    const local = await db.select({ name: restaurantsTable.name }).from(restaurantsTable);
    const localNames = new Set(local.map((r) => r.name.trim().toLowerCase()));

    // Map serviceType from the remote dashboard to our platform values
    const SERVICE_TO_PLATFORM: Record<string, string> = {
      restaurant: "eats", nourriture: "eats", eats: "eats",
      tabac: "tabac",
      pharmacie: "pharmacie",
      boulangerie: "boulangerie",
      souk: "souk",
      supermarche: "supermarche", supermarché: "supermarche",
      fleur: "fleurs", fleurs: "fleurs",
    };

    for (const r of remote) {
      const name = (r.name ?? "").trim();
      if (!name || localNames.has(name.toLowerCase())) continue;
      const rawType = (r.serviceType ?? "").toLowerCase().trim();
      const platform = SERVICE_TO_PLATFORM[rawType] ?? "eats";
      await db.insert(restaurantsTable).values({
        name,
        phone: "—",
        address: "—",
        cuisine: rawType && rawType !== "restaurant" && rawType !== "eats" ? rawType : null,
        notes: `Inscrit via restaurant.safi-bridge.ma${r.email ? ` · ${r.email}` : ""}`,
        platform,
        status: "open",
        isActive: true,
      });
    }
  } catch {
    // best-effort : le dashboard resto peut etre injoignable, on liste le local
  }
}

// GET /restaurants
router.get("/", async (_req, res) => {
  await syncDashboardRestaurants();
  geocodePendingRestaurants().catch(() => {}); // best-effort, non-bloquant
  const rows = await db.select().from(restaurantsTable).orderBy(restaurantsTable.name);
  res.json(rows.map(formatRestaurant));
});

// POST /restaurants
router.post("/", async (req, res) => {
  const { name, phone, address, cuisine, avgPrepTime, notes, platform } = req.body as Record<string, string | number>;
  if (!name || !phone || !address) {
    res.status(400).json({ error: "name, phone et address sont requis" });
    return;
  }
  const [restaurant] = await db
    .insert(restaurantsTable)
    .values({
      name: String(name),
      phone: String(phone),
      address: String(address),
      cuisine: cuisine ? String(cuisine) : null,
      avgPrepTime: avgPrepTime ? Number(avgPrepTime) : 20,
      notes: notes ? String(notes) : null,
      platform: platform ? String(platform) : "eats",
      status: "open",
      isActive: true,
    })
    .returning();
  res.status(201).json(formatRestaurant(restaurant));
});

// PATCH /restaurants/:id
router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { status, avgPrepTime, notes, name, phone, address, cuisine, isActive, platform } = req.body as Record<string, string | number | boolean>;

  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (avgPrepTime !== undefined) updates.avgPrepTime = Number(avgPrepTime);
  if (notes !== undefined) updates.notes = notes;
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (address !== undefined) updates.address = address;
  if (cuisine !== undefined) updates.cuisine = cuisine;
  if (isActive !== undefined) updates.isActive = isActive;
  if (platform !== undefined) updates.platform = platform;

  const [updated] = await db
    .update(restaurantsTable)
    .set(updates)
    .where(eq(restaurantsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Restaurant non trouvé" });
    return;
  }
  res.json(formatRestaurant(updated));
});

// DELETE /restaurants/:id
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [deleted] = await db
    .update(restaurantsTable)
    .set({ isActive: false })
    .where(eq(restaurantsTable.id, id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Restaurant non trouvé" });
    return;
  }
  res.json({ ok: true });
});

// GET /restaurants/:id/stats — stats for the surveillance panel
router.get("/:id/stats", async (req, res) => {
  const id = Number(req.params.id);

  const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, id));
  if (!restaurant) {
    res.status(404).json({ error: "Restaurant non trouvé" });
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [counts] = await db
    .select({
      todayOrders: sql<number>`count(*)::int`,
      pendingCount: sql<number>`count(*) filter (where status = 'pending')::int`,
      assignedCount: sql<number>`count(*) filter (where status = 'assigned')::int`,
      inDeliveryCount: sql<number>`count(*) filter (where status = 'in_delivery')::int`,
      deliveredCount: sql<number>`count(*) filter (where status = 'delivered')::int`,
      todayRevenue: sql<number>`coalesce(sum(case when status = 'delivered' then total_amount else 0 end), 0)::float`,
    })
    .from(ordersTable)
    .where(and(eq(ordersTable.restaurantId, id), sql`created_at >= ${today}`));

  const recentOrders = await db
    .select({
      id: ordersTable.id,
      orderNumber: ordersTable.orderNumber,
      customerName: ordersTable.customerName,
      status: ordersTable.status,
      totalAmount: ordersTable.totalAmount,
      createdAt: ordersTable.createdAt,
    })
    .from(ordersTable)
    .where(eq(ordersTable.restaurantId, id))
    .orderBy(desc(ordersTable.createdAt))
    .limit(5);

  res.json({
    restaurant: formatRestaurant(restaurant),
    todayOrders: counts?.todayOrders ?? 0,
    pendingCount: counts?.pendingCount ?? 0,
    assignedCount: counts?.assignedCount ?? 0,
    inDeliveryCount: counts?.inDeliveryCount ?? 0,
    deliveredCount: counts?.deliveredCount ?? 0,
    todayRevenue: counts?.todayRevenue ?? 0,
    recentOrders: recentOrders.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
    })),
  });
});

// GET /restaurants/overview — all restaurants with live stats (for surveillance)
router.get("/overview", async (_req, res) => {
  syncDashboardRestaurants().catch(() => {}); // best-effort, non-bloquant
  geocodePendingRestaurants().catch(() => {}); // best-effort, non-bloquant
  const restaurants = await db
    .select()
    .from(restaurantsTable)
    .where(eq(restaurantsTable.isActive, true))
    .orderBy(restaurantsTable.name);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = await db
    .select({
      restaurantId: ordersTable.restaurantId,
      todayOrders: sql<number>`count(*)::int`,
      pendingCount: sql<number>`count(*) filter (where status = 'pending')::int`,
      activeCount: sql<number>`count(*) filter (where status in ('assigned', 'in_delivery'))::int`,
      deliveredCount: sql<number>`count(*) filter (where status = 'delivered')::int`,
      todayRevenue: sql<number>`coalesce(sum(case when status = 'delivered' then total_amount else 0 end), 0)::float`,
    })
    .from(ordersTable)
    .where(
      and(
        sql`${ordersTable.restaurantId} is not null`,
        sql`created_at >= ${today}`
      )
    )
    .groupBy(ordersTable.restaurantId);

  const statsMap = new Map(stats.map((s) => [s.restaurantId, s]));

  res.json(
    restaurants.map((r) => {
      const s = statsMap.get(r.id);
      return {
        ...formatRestaurant(r),
        todayOrders: s?.todayOrders ?? 0,
        pendingCount: s?.pendingCount ?? 0,
        activeCount: s?.activeCount ?? 0,
        deliveredCount: s?.deliveredCount ?? 0,
        todayRevenue: s?.todayRevenue ?? 0,
      };
    })
  );
});

function formatRestaurant(r: typeof restaurantsTable.$inferSelect) {
  return {
    ...r,
    lastOrderAt: r.lastOrderAt ? r.lastOrderAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  };
}

export default router;
