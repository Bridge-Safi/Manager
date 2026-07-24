import { Router } from "express";
import { db, ordersTable, driversTable, activitiesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router = Router();

// GET /alerts  — compute real-time alerts
router.get("/", async (req, res) => {
  const now = new Date();
  const alerts: object[] = [];

  // 1. Orders waiting too long (pending for >10 min = warning, >20 min = critical)
  // On ignore les commandes de plus de 24h : elles sont historiques/abandonnées
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const pendingOrders = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.status, "pending"),
        sql`${ordersTable.createdAt} > ${cutoff}`
      )
    );

  for (const order of pendingOrders) {
    const minutesElapsed = Math.floor((now.getTime() - new Date(order.createdAt).getTime()) / 60000);
    if (minutesElapsed >= 10) {
      alerts.push({
        id: `order_wait_${order.id}`,
        type: "order_waiting_too_long",
        severity: minutesElapsed >= 20 ? "critical" : "warning",
        message: `Commande ${order.orderNumber} en attente depuis ${minutesElapsed} min`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        driverId: null,
        driverName: null,
        minutesElapsed,
        createdAt: now.toISOString(),
      });
    }
  }

  // 2. Drivers offline but have an active (assigned/in_delivery) order
  const busyDriverIds = await db
    .select({ id: driversTable.id, name: driversTable.name, status: driversTable.status })
    .from(driversTable)
    .where(eq(driversTable.status, "offline"));

  for (const driver of busyDriverIds) {
    const activeOrders = await db
      .select()
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.driverId, driver.id),
          inArray(ordersTable.status, ["assigned", "in_delivery"])
        )
      );

    for (const order of activeOrders) {
      alerts.push({
        id: `driver_offline_order_${driver.id}_${order.id}`,
        type: "driver_offline_with_order",
        severity: "critical",
        message: `${driver.name} est hors ligne mais a la commande ${order.orderNumber}`,
        driverId: driver.id,
        driverName: driver.name,
        orderId: order.id,
        orderNumber: order.orderNumber,
        minutesElapsed: null,
        createdAt: now.toISOString(),
      });
    }
  }

  // 3. Busy driver with no recent activity (>15 min)
  const busyDrivers = await db
    .select()
    .from(driversTable)
    .where(eq(driversTable.status, "busy"));

  for (const driver of busyDrivers) {
    if (driver.lastActiveAt) {
      const minutesSinceActive = Math.floor(
        (now.getTime() - new Date(driver.lastActiveAt).getTime()) / 60000
      );
      if (minutesSinceActive >= 15) {
        alerts.push({
          id: `driver_inactive_${driver.id}`,
          type: "driver_inactive",
          severity: minutesSinceActive >= 30 ? "critical" : "warning",
          message: `${driver.name} est occupé mais sans activité depuis ${minutesSinceActive} min`,
          driverId: driver.id,
          driverName: driver.name,
          orderId: null,
          orderNumber: null,
          minutesElapsed: minutesSinceActive,
          createdAt: now.toISOString(),
        });
      }
    }
  }

  res.json(alerts);
});

export default router;
