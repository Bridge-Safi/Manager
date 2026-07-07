import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface RestaurantJWTPayload {
  id: number;
  name: string;
  type: "restaurant";
}

// Extend Express Request
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      restaurant?: RestaurantJWTPayload;
    }
  }
}

/**
 * Middleware: verify Bearer JWT and attach restaurant payload to req.restaurant.
 * Returns 401 if token is missing/invalid, 403 if not a restaurant account.
 * Returns 500 if SESSION_SECRET is not configured (fail-safe).
 */
export function requireRestaurantAuth(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Authentification non configurée (SESSION_SECRET manquant)" });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token d'authentification requis" });
    return;
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, secret) as RestaurantJWTPayload;

    if (payload.type !== "restaurant") {
      res.status(403).json({ error: "Accès réservé aux comptes restaurant" });
      return;
    }

    req.restaurant = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
}
