import { Router } from "express";
import { db, driversTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, phone, password, role } = req.body as {
    email?: string;
    phone?: string;
    password?: string;
    role?: string;
  };

  if (!email && !phone) {
    res.status(400).json({ success: false, error: "Email ou téléphone requis" });
    return;
  }

  const conditions = [];
  if (email) conditions.push(eq(driversTable.email, email.trim().toLowerCase()));
  if (phone) conditions.push(eq(driversTable.phone, phone.trim()));

  const [driver] = await db
    .select()
    .from(driversTable)
    .where(conditions.length === 1 ? conditions[0] : or(...conditions))
    .limit(1);

  if (!driver) {
    res.status(401).json({ success: false, error: "Compte introuvable" });
    return;
  }

  if (driver.isBlocked) {
    res.status(403).json({ success: false, error: "Compte bloqué. Contactez l'administration." });
    return;
  }

  res.json({
    success: true,
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    email: driver.email,
    role: role ?? "livreur",
    vehicleType: driver.vehicleType,
    services: driver.services,
    avatarUrl: driver.avatarUrl,
  });
});

export default router;
