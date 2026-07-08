import { Router } from "express";
import jwt from "jsonwebtoken";

const router = Router();

const JWT_SECRET = process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  throw new Error("[MANAGER-AUTH] SESSION_SECRET environment variable is required but not set");
}

// Code d'accès à 9 chiffres pour le tableau de bord Manager (pas d'email/mot de passe).
// Peut être changé via la variable d'env MANAGER_ACCESS_CODE sans toucher au code.
const MANAGER_ACCESS_CODE = process.env.MANAGER_ACCESS_CODE ?? "159753852";

// POST /api/manager-auth/verify — vérifie le code à 9 chiffres et renvoie un token
router.post("/verify", (req, res) => {
  const { code } = req.body as { code?: string };

  if (!code || typeof code !== "string") {
    res.status(400).json({ success: false, error: "Code requis" });
    return;
  }

  if (code.trim() !== MANAGER_ACCESS_CODE) {
    res.status(401).json({ success: false, error: "Code incorrect" });
    return;
  }

  const token = jwt.sign({ type: "manager" }, JWT_SECRET, { expiresIn: "30d" });
  res.json({ success: true, token });
});

export default router;
