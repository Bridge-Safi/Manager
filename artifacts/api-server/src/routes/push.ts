import { Router } from "express";

const router = Router();

router.get("/vapid-public-key", (_req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY ?? "";
  if (!key) {
    res.status(503).json({ error: "Push not configured" });
    return;
  }
  res.json({ publicKey: key });
});

router.post("/subscribe", async (req, res) => {
  const { subscription, delivererId, driverId } = req.body;
  if (!subscription) {
    res.status(400).json({ error: "subscription required" });
    return;
  }
  res.json({ ok: true });
});

export default router;
