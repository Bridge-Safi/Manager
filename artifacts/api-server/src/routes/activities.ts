import { Router } from "express";
import { db, activitiesTable, driversTable, ordersTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router = Router();

// GET /activities
router.get("/", async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const driverId = req.query.driverId ? parseInt(req.query.driverId as string) : undefined;

  const conditions = driverId ? [eq(activitiesTable.driverId, driverId)] : [];

  const rows = await db
    .select({
      id: activitiesTable.id,
      driverId: activitiesTable.driverId,
      driverName: driversTable.name,
      orderId: activitiesTable.orderId,
      orderNumber: ordersTable.orderNumber,
      action: activitiesTable.action,
      details: activitiesTable.details,
      createdAt: activitiesTable.createdAt,
    })
    .from(activitiesTable)
    .leftJoin(driversTable, eq(activitiesTable.driverId, driversTable.id))
    .leftJoin(ordersTable, eq(activitiesTable.orderId, ordersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(activitiesTable.createdAt))
    .limit(limit);

  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

export default router;
