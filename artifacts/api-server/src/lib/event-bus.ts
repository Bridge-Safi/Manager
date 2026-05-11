import type { Response } from "express";

type SSEClient = {
  id: string;
  res: Response;
  role?: string;
};

const clients = new Map<string, SSEClient>();

export function addSSEClient(id: string, res: Response, role?: string) {
  clients.set(id, { id, res, role });
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

export function getClientCount() {
  return clients.size;
}
