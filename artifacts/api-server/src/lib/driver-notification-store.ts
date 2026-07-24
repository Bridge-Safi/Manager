/**
 * In-memory store for pending manager→driver notifications.
 * One pending notification per driver at a time.
 * Cleared when the driver polls and retrieves it.
 */

export type DriverNotification = {
  type: "warn" | "refuse" | "block" | "unblock";
  title: string;
  message: string;
  createdAt: number; // timestamp ms
};

const store = new Map<number, DriverNotification>();

export function setDriverNotification(driverId: number, notif: Omit<DriverNotification, "createdAt">) {
  store.set(driverId, { ...notif, createdAt: Date.now() });
}

export function popDriverNotification(driverId: number): DriverNotification | null {
  const notif = store.get(driverId) ?? null;
  if (notif) store.delete(driverId);
  return notif;
}
