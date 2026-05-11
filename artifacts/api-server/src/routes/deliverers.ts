import { Router } from "express";
import { db, driversTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

type DriverRow = typeof driversTable.$inferSelect;

const formatDriver = (d: DriverRow) => ({
  ...d,
  createdAt: d.createdAt.toISOString(),
  lastActiveAt: d.lastActiveAt ? d.lastActiveAt.toISOString() : null,
  warnedAt: d.warnedAt ? d.warnedAt.toISOString() : null,
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, id));
  if (!driver) { res.status(404).json({ error: "Livreur introuvable" }); return; }
  res.json(formatDriver(driver));
});

router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, phone, email, vehicleType, services, status, rating, avatarUrl } = req.body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates["name"] = name;
  if (phone !== undefined) updates["phone"] = phone;
  if (email !== undefined) updates["email"] = email;
  if (vehicleType !== undefined) updates["vehicleType"] = vehicleType;
  if (services !== undefined) updates["services"] = services;
  if (status !== undefined) updates["status"] = status;
  if (rating !== undefined) updates["rating"] = rating;
  if (avatarUrl !== undefined) updates["avatarUrl"] = avatarUrl;

  if (Object.keys(updates).length === 0) {
    const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, id));
    if (!driver) { res.status(404).json({ error: "Not found" }); return; }
    res.json(formatDriver(driver));
    return;
  }

  const [updated] = await db
    .update(driversTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set(updates as any)
    .where(eq(driversTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatDriver(updated));
});

router.patch("/:id/location", async (req, res) => {
  const id = Number(req.params.id);
  const { lat, lng } = req.body as { lat: number; lng: number };

  await db
    .update(driversTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set({ lat, lng, lastActiveAt: new Date() } as any)
    .where(eq(driversTable.id, id));

  res.json({ ok: true });
});

export default router;
