import { Router } from "express";
import { db, resetRequestsTable, driversTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { logActivity } from "../lib/log-activity";

const router = Router();

function generateCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function formatRequest(r: {
  id: number;
  driverId: number;
  type: string;
  status: string;
  resetCode: string;
  resetLink: string | null;
  requestedAt: Date;
  sentAt: Date | null;
  driverName: string | null;
  driverPhone: string | null;
}) {
  return {
    ...r,
    requestedAt: r.requestedAt.toISOString(),
    sentAt: r.sentAt ? r.sentAt.toISOString() : null,
  };
}

// GET /reset-requests
router.get("/", async (req, res) => {
  const status = req.query.status as string | undefined;

  const rows = await db
    .select({
      id: resetRequestsTable.id,
      driverId: resetRequestsTable.driverId,
      type: resetRequestsTable.type,
      status: resetRequestsTable.status,
      resetCode: resetRequestsTable.resetCode,
      resetLink: resetRequestsTable.resetLink,
      requestedAt: resetRequestsTable.requestedAt,
      sentAt: resetRequestsTable.sentAt,
      driverName: driversTable.name,
      driverPhone: driversTable.phone,
    })
    .from(resetRequestsTable)
    .leftJoin(driversTable, eq(resetRequestsTable.driverId, driversTable.id))
    .where(status ? eq(resetRequestsTable.status, status) : undefined)
    .orderBy(
      sql`CASE WHEN ${resetRequestsTable.status} = 'pending' THEN 0 WHEN ${resetRequestsTable.status} = 'sent' THEN 1 ELSE 2 END`,
      desc(resetRequestsTable.requestedAt)
    );

  res.json(rows.map(formatRequest));
});

// GET /reset-requests/pending-count
router.get("/pending-count", async (_req, res) => {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(resetRequestsTable)
    .where(eq(resetRequestsTable.status, "pending"));

  res.json({ count: result?.count ?? 0 });
});

// POST /reset-requests
router.post("/", async (req, res) => {
  const { driverId, type } = req.body as { driverId: number; type: string };

  if (!driverId || !type) {
    res.status(400).json({ error: "driverId and type are required" });
    return;
  }

  const drivers = await db.select().from(driversTable).where(eq(driversTable.id, driverId));
  const driver = drivers[0];
  if (!driver) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }

  const resetCode = generateCode(6);
  const typeLabel = type === "pin" ? "code PIN" : "mot de passe";
  const resetLink = `https://gradoeats.app/reset?driver=${driverId}&code=${resetCode}&type=${type}`;

  const [request] = await db
    .insert(resetRequestsTable)
    .values({
      driverId,
      type,
      status: "pending",
      resetCode,
      resetLink,
    })
    .returning();

  await logActivity({
    driverId,
    action: "status_offline",
    details: `Demande de réinitialisation de ${typeLabel} créée pour ${driver.name}`,
  });

  const row = {
    ...request,
    driverName: driver.name,
    driverPhone: driver.phone,
    requestedAt: request.requestedAt,
    sentAt: request.sentAt,
  };

  res.status(201).json(formatRequest(row));
});

// PATCH /reset-requests/:id/send
router.patch("/:id/send", async (req, res) => {
  const id = parseInt(req.params.id);

  const [updated] = await db
    .update(resetRequestsTable)
    .set({ status: "sent", sentAt: new Date() })
    .where(eq(resetRequestsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Reset request not found" });
    return;
  }

  const drivers = await db.select().from(driversTable).where(eq(driversTable.id, updated.driverId));
  const driver = drivers[0];

  res.json(formatRequest({
    ...updated,
    driverName: driver?.name ?? null,
    driverPhone: driver?.phone ?? null,
  }));
});

// PATCH /reset-requests/:id/complete
router.patch("/:id/complete", async (req, res) => {
  const id = parseInt(req.params.id);

  const [updated] = await db
    .update(resetRequestsTable)
    .set({ status: "completed" })
    .where(eq(resetRequestsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Reset request not found" });
    return;
  }

  const drivers = await db.select().from(driversTable).where(eq(driversTable.id, updated.driverId));
  const driver = drivers[0];

  res.json(formatRequest({
    ...updated,
    driverName: driver?.name ?? null,
    driverPhone: driver?.phone ?? null,
  }));
});

export default router;
