import { Router } from "express";
import { db, driversTable, restaurantsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import jwt from "jsonwebtoken";

const router = Router();

const JWT_SECRET = process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  throw new Error("[AUTH] SESSION_SECRET environment variable is required but not set");
}
const JWT_EXPIRY = "30d";

// POST /auth/login — drivers OR restaurant owners
router.post("/login", async (req, res) => {
  const { email, phone, identifier, role } = req.body as {
    email?: string;
    phone?: string;
    identifier?: string;
    role?: string;
  };

  const lookup = (identifier ?? email ?? phone ?? "").trim();
  if (!lookup) {
    res.status(400).json({ success: false, error: "Email, téléphone ou identifiant requis" });
    return;
  }

  // 1. Try driver login (email or phone match)
  const conditions = [];
  const lowerLookup = lookup.toLowerCase();
  conditions.push(eq(driversTable.email, lowerLookup));
  conditions.push(eq(driversTable.phone, lookup));

  const [driver] = await db
    .select()
    .from(driversTable)
    .where(or(...conditions))
    .limit(1);

  if (driver) {
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
    return;
  }

  // 2. Try restaurant login (phone match)
  const [restaurant] = await db
    .select()
    .from(restaurantsTable)
    .where(eq(restaurantsTable.phone, lookup))
    .limit(1);

  if (restaurant) {
    const token = jwt.sign(
      { id: restaurant.id, name: restaurant.name, type: "restaurant" },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
    res.json({
      success: true,
      id: restaurant.id,
      name: restaurant.name,
      phone: restaurant.phone,
      type: "restaurant",
      restaurantId: restaurant.id,
      token,
    });
    return;
  }

  res.status(401).json({ success: false, error: "Compte introuvable" });
});

// GET /auth/me — validate JWT and return user info
router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token requis" });
    return;
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as {
      id: number;
      name: string;
      type: "restaurant" | "driver";
    };

    if (payload.type === "restaurant") {
      const [restaurant] = await db
        .select()
        .from(restaurantsTable)
        .where(eq(restaurantsTable.id, payload.id))
        .limit(1);
      if (!restaurant) {
        res.status(401).json({ error: "Restaurant introuvable" });
        return;
      }
      res.json({
        id: restaurant.id,
        name: restaurant.name,
        phone: restaurant.phone,
        email: null,
        type: "restaurant",
        token,
        restaurantId: restaurant.id,
      });
      return;
    }

    res.status(401).json({ error: "Type non supporté" });
  } catch {
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
});

export default router;
