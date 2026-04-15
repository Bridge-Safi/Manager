import { db, activitiesTable, driversTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function logActivity(params: {
  driverId?: number | null;
  orderId?: number | null;
  action: string;
  details?: string | null;
}) {
  try {
    await db.insert(activitiesTable).values({
      driverId: params.driverId ?? null,
      orderId: params.orderId ?? null,
      action: params.action,
      details: params.details ?? null,
    });

    if (params.driverId) {
      await db
        .update(driversTable)
        .set({ lastActiveAt: new Date() })
        .where(eq(driversTable.id, params.driverId));
    }
  } catch {
    // non-blocking — don't crash main flow if activity log fails
  }
}
