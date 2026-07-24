import type { Response } from "express";

type SSEClient = {
  id: string;
  res: Response;
  role?: string;
  driverId?: number;
};

const clients = new Map<string, SSEClient>();

export function addSSEClient(id: string, res: Response, role?: string, driverId?: number) {
  clients.set(id, { id, res, role, driverId });
}

export function removeSSEClient(id: string) {
  clients.delete(id);
}

export type SSEEventType =
  | "order:created"
  | "order:updated"
  | "delivery:created"
  | "delivery:updated"
  | "driver:updated"
  | "driver:notification"   // targeted: warn / refuse / block notification to a specific driver
  | "driver:deleted"        // targeted: driver was deleted — client must log out immediately
  | "player:created"
  | "player:updated"
  | "player:deleted"
  | "player:online"
  | "new_order"       // restaurant-dashboard: new order arrived (alias for order:created)
  | "ping";

export function emitEvent(type: SSEEventType, data: unknown) {
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients.values()) {
    try {
      client.res.write(payload);
    } catch {
      clients.delete(client.id);
    }
  }
}

/** Send an SSE event only to the client(s) connected with this driverId. */
export function emitToDriver(driverId: number, type: SSEEventType, data: unknown) {
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients.values()) {
    if (client.driverId === driverId) {
      try {
        client.res.write(payload);
      } catch {
        clients.delete(client.id);
      }
    }
  }
}

/**
 * Notify a deleted driver's SSE connections to log out immediately,
 * then close and remove those connections from the map.
 */
export function closeDriverConnections(driverId: number) {
  const payload = `event: driver:deleted\ndata: ${JSON.stringify({ driverId })}\n\n`;
  for (const client of clients.values()) {
    if (client.driverId === driverId) {
      try {
        client.res.write(payload);
        client.res.end();
      } catch {
        // ignore write errors — connection may already be dead
      }
      clients.delete(client.id);
    }
  }
}

export function getClientCount() {
  return clients.size;
}
