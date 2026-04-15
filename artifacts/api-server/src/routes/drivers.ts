import { Router } from "express";
import { db, driversTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateDriverBody,
  UpdateDriverParams,
  UpdateDriverBody,
  GetDriverParams,
  UpdateDriverLocationParams,
  UpdateDriverLocationBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (_req, res) => {
  const rows = await db.select().from(driversTable).orderBy(driversTable.id);
  res.json(rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.post("/", async (req, res) => {
  const parsed = CreateDriverBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [driver] = await db
    .insert(driversTable)
    .values({
      ...parsed.data,
      status: "available",
      rating: 5.0,
      totalDeliveries: 0,
      totalRevenue: 0,
    })
    .returning();

  res.status(201).json({
    ...driver,
    createdAt: driver.createdAt.toISOString(),
  });
});

router.get("/:id", async (req, res) => {
  const parsed = GetDriverParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, parsed.data.id));
  if (!driver) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }

  res.json({ ...driver, createdAt: driver.createdAt.toISOString() });
});

router.patch("/:id", async (req, res) => {
  const paramParsed = UpdateDriverParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const bodyParsed = UpdateDriverBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const [updated] = await db
    .update(driversTable)
    .set(bodyParsed.data)
    .where(eq(driversTable.id, paramParsed.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }

  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

router.patch("/:id/location", async (req, res) => {
  const paramParsed = UpdateDriverLocationParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const bodyParsed = UpdateDriverLocationBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const [updated] = await db
    .update(driversTable)
    .set({ lat: bodyParsed.data.lat, lng: bodyParsed.data.lng })
    .where(eq(driversTable.id, paramParsed.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }

  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

export default router;
