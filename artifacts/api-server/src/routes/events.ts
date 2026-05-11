import { Router } from "express";
import { addSSEClient, removeSSEClient, getClientCount } from "../lib/event-bus";
import { randomUUID } from "crypto";

const router = Router();

router.get("/", (req, res) => {
  const clientId = randomUUID();
  const role = (req.query.role as string) ?? "unknown";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, role, clients: getClientCount() + 1 })}\n\n`);

  addSSEClient(clientId, res, role);

  const heartbeat = setInterval(() => {
    try {
      res.write(`event: ping\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 20000);

  req.on("close", () => {
    clearInterval(heartbeat);
    removeSSEClient(clientId);
  });
});

export default router;
