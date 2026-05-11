import { Router } from "express";
import { createHmac } from "crypto";
import { db, playersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { emitEvent } from "../lib/event-bus";

const router = Router();

const GAME_TOKEN_SECRET = process.env.GAME_TOKEN_SECRET || "bridge-game-secret-2026";

// ─── TOKEN HELPERS ───────────────────────────────────────────────────────────

function createGameToken(phone: string, userId: string): string {
  const timestamp = Date.now();
  const data = `${phone}|${userId}|${timestamp}`;
  const hmac = createHmac("sha256", GAME_TOKEN_SECRET).update(data).digest("hex");
  return Buffer.from(`${data}|${hmac}`).toString("base64url");
}

function verifyGameToken(token: string): { phone: string; userId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split("|");
    if (parts.length !== 4) return null;
    const [phone, userId, timestampStr, hmac] = parts;
    const timestamp = Number(timestampStr);
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) return null;
    const data = `${phone}|${userId}|${timestampStr}`;
    const expected = createHmac("sha256", GAME_TOKEN_SECRET).update(data).digest("hex");
    if (hmac !== expected) return null;
    return { phone, userId };
  } catch {
    return null;
  }
}

// ─── JWT HELPERS ─────────────────────────────────────────────────────────────

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractPhone(payload: Record<string, unknown>): string | null {
  const phone = payload.phone_number ?? payload.phone ?? payload.primary_phone_number;
  if (typeof phone === "string") return phone;
  const phones = payload.phone_numbers;
  if (Array.isArray(phones) && phones.length > 0) {
    const first = phones[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && typeof (first as Record<string, unknown>).phone_number === "string") {
      return (first as Record<string, unknown>).phone_number as string;
    }
  }
  return null;
}

function extractName(payload: Record<string, unknown>): string {
  const firstName = typeof payload.first_name === "string" ? payload.first_name : "";
  const lastName = typeof payload.last_name === "string" ? payload.last_name : "";
  const full = [firstName, lastName].filter(Boolean).join(" ");
  if (full) return full;
  if (typeof payload.name === "string" && payload.name) return payload.name;
  if (typeof payload.username === "string" && payload.username) return payload.username;
  return "";
}

function getIdentityFromRequest(req: import("express").Request): { phone?: string; userId?: string; name?: string } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const phone = extractPhone(payload) ?? undefined;
  const userId = typeof payload.sub === "string" ? payload.sub : undefined;
  const name = extractName(payload);
  return { phone, userId, name };
}

function normalisePhone(phone: string): string {
  return phone.replace(/\s+/g, "").replace(/^00/, "+");
}

// ─── UPSERT PLAYER ────────────────────────────────────────────────────────────

async function upsertPlayer(phone: string, pseudo: string, diamonds?: number, score?: number) {
  const normalised = normalisePhone(phone);
  const [existing] = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.phone, normalised))
    .limit(1);

  if (!existing) {
    const [created] = await db
      .insert(playersTable)
      .values({
        pseudo: pseudo || `Joueur-${normalised.slice(-4)}`,
        phone: normalised,
        diamonds: diamonds ?? 0,
        score: score ?? 0,
        gamesPlayed: 0,
      })
      .returning();
    emitEvent("player:created", { id: created.id, pseudo: created.pseudo, diamonds: created.diamonds, score: created.score });
    return created;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof diamonds === "number") updates.diamonds = Math.max(existing.diamonds, diamonds);
  if (typeof score === "number" && score > existing.score) updates.score = score;

  const [updated] = await db
    .update(playersTable)
    .set(updates)
    .where(eq(playersTable.id, existing.id))
    .returning();

  emitEvent("player:updated", { id: updated.id, pseudo: updated.pseudo, diamonds: updated.diamonds, score: updated.score });
  return updated;
}

// ─── POST /game/token — generate game token for bridge-client ─────────────────
router.post("/token", async (req, res) => {
  const identity = getIdentityFromRequest(req);
  if (!identity?.phone) {
    res.json({ error: "no_phone" });
    return;
  }
  const { phone, userId = "", name = "" } = identity;
  const token = createGameToken(phone, userId);

  // Auto-create player if not yet in DB
  const normalised = normalisePhone(phone);
  const [existing] = await db.select({ id: playersTable.id }).from(playersTable).where(eq(playersTable.phone, normalised)).limit(1);
  if (!existing) {
    const pseudo = name || `Joueur-${normalised.slice(-4)}`;
    const [created] = await db.insert(playersTable).values({ pseudo, phone: normalised, diamonds: 0, score: 0, gamesPlayed: 0 }).returning();
    emitEvent("player:created", { id: created.id, pseudo: created.pseudo });
  }

  res.json({ token, phone, name });
});

// ─── GET /game/verify-token — verify game token (called by game.safi-bridge.ma) ─
router.get("/verify-token", (req, res) => {
  const token = req.query.token as string | undefined;
  if (!token) { res.status(400).json({ valid: false, error: "token manquant" }); return; }
  const result = verifyGameToken(token);
  if (!result) { res.status(401).json({ valid: false, error: "token invalide ou expiré" }); return; }
  res.json({ valid: true, phone: result.phone, userId: result.userId });
});

// ─── GET /game/diamonds — get player diamond balance ─────────────────────────
router.get("/diamonds", async (req, res) => {
  const identity = getIdentityFromRequest(req);
  const phoneParam = req.query.phone as string | undefined;
  const phone = phoneParam ?? identity?.phone;

  if (!phone) {
    res.json({ diamonds: 0, score: 0, gamesPlayed: 0 });
    return;
  }

  const normalised = normalisePhone(phone);

  const [player] = await db
    .select({ id: playersTable.id, diamonds: playersTable.diamonds, score: playersTable.score, gamesPlayed: playersTable.gamesPlayed, pseudo: playersTable.pseudo })
    .from(playersTable)
    .where(eq(playersTable.phone, normalised))
    .limit(1);

  if (!player) {
    res.json({ diamonds: 0, score: 0, gamesPlayed: 0 });
    return;
  }

  res.json({ playerId: player.id, pseudo: player.pseudo, diamonds: player.diamonds, score: player.score, gamesPlayed: player.gamesPlayed });
});

// ─── POST /game/diamonds — save diamonds from bridge-client GameIframe ────────
// Called when the game sends a postMessage with diamond count.
// Upserts the player — creates if not yet in DB.
router.post("/diamonds", async (req, res) => {
  const identity = getIdentityFromRequest(req);
  const phoneParam = req.query.phone as string | undefined;
  const phone = phoneParam ?? identity?.phone;
  const rawDiamonds = req.body?.diamonds;
  const diamonds = typeof rawDiamonds === "number" ? rawDiamonds : Number(rawDiamonds);

  if (!phone || isNaN(diamonds) || diamonds < 0) {
    res.status(400).json({ error: "phone et diamonds requis" });
    return;
  }

  const name = identity?.name || "";
  const player = await upsertPlayer(phone, name, diamonds);
  res.json({ playerId: player.id, pseudo: player.pseudo, diamonds: player.diamonds });
});

// ─── POST /game/diamonds/by-token — save diamonds using game token ─────────────
// Called directly by game.safi-bridge.ma using the token from the URL.
router.post("/diamonds/by-token", async (req, res) => {
  const token = (req.query.token ?? req.body?.token) as string | undefined;
  const rawDiamonds = req.body?.diamonds ?? req.body?.score ?? req.body?.points ?? req.body?.gems;
  const diamonds = typeof rawDiamonds === "number" ? rawDiamonds : Number(rawDiamonds ?? 0);
  const rawScore = req.body?.gameScore;
  const score = typeof rawScore === "number" ? rawScore : undefined;

  if (!token) { res.status(400).json({ error: "token manquant" }); return; }

  const identity = verifyGameToken(token);
  if (!identity) { res.status(401).json({ error: "token invalide ou expiré" }); return; }

  const player = await upsertPlayer(identity.phone, "", diamonds, score);
  res.json({ ok: true, playerId: player.id, pseudo: player.pseudo, diamonds: player.diamonds, score: player.score });
});

// ─── POST /game/diamonds/spend — deduct diamonds at checkout ─────────────────
router.post("/diamonds/spend", async (req, res) => {
  const identity = getIdentityFromRequest(req);
  const phoneParam = req.query.phone as string | undefined;
  const phone = phoneParam ?? identity?.phone;
  const spend = Number(req.body?.spend ?? 0);

  if (!phone || spend <= 0) {
    res.status(400).json({ error: "phone et spend requis" });
    return;
  }

  const normalised = normalisePhone(phone);

  const [player] = await db.select().from(playersTable).where(eq(playersTable.phone, normalised)).limit(1);
  if (!player) { res.status(404).json({ error: "Joueur introuvable" }); return; }

  const newDiamonds = Math.max(0, player.diamonds - spend);
  const [updated] = await db
    .update(playersTable)
    .set({ diamonds: newDiamonds, updatedAt: new Date() })
    .where(eq(playersTable.id, player.id))
    .returning();

  emitEvent("player:updated", { id: updated.id, pseudo: updated.pseudo, diamonds: updated.diamonds, score: updated.score, action: "spend" });
  res.json({ diamonds: updated.diamonds, spent: spend });
});

// ─── POST /game/score — update score (called by game.safi-bridge.ma or bridge-client) ─
router.post("/score", async (req, res) => {
  const { phone, score, diamonds, gamesPlayed } = req.body as { phone?: string; score?: number; diamonds?: number; gamesPlayed?: number };

  if (!phone) { res.status(400).json({ error: "phone requis" }); return; }

  const normalised = normalisePhone(phone);
  const [player] = await db.select().from(playersTable).where(eq(playersTable.phone, normalised)).limit(1);
  if (!player) { res.status(404).json({ error: "Joueur introuvable" }); return; }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof score === "number") updates.score = sql`${playersTable.score} + ${score}`;
  if (typeof diamonds === "number") updates.diamonds = sql`${playersTable.diamonds} + ${diamonds}`;
  if (typeof gamesPlayed === "number") updates.gamesPlayed = sql`${playersTable.gamesPlayed} + ${gamesPlayed}`;

  const [updated] = await db.update(playersTable).set(updates).where(eq(playersTable.id, player.id)).returning();

  emitEvent("player:updated", { id: updated.id, pseudo: updated.pseudo, diamonds: updated.diamonds, score: updated.score, gamesPlayed: updated.gamesPlayed, action: "score" });
  res.json({ playerId: updated.id, pseudo: updated.pseudo, diamonds: updated.diamonds, score: updated.score, gamesPlayed: updated.gamesPlayed });
});

// ─── POST /game/online — marquer joueur connecté au jeu ──────────────────────
router.post("/online", async (req, res) => {
  const { phone, isOnline } = req.body as { phone?: string; isOnline?: boolean };
  if (!phone) { res.status(400).json({ error: "phone requis" }); return; }

  const normalised = normalisePhone(phone);
  const [updated] = await db
    .update(playersTable)
    .set({ isOnline: isOnline !== false, lastSeenAt: new Date(), updatedAt: new Date() })
    .where(eq(playersTable.phone, normalised))
    .returning();

  if (!updated) { res.status(404).json({ error: "Joueur introuvable" }); return; }

  emitEvent(isOnline !== false ? "player:online" : "player:updated", { id: updated.id, pseudo: updated.pseudo, isOnline: updated.isOnline });
  res.json({ ok: true, isOnline: updated.isOnline });
});

export default router;
