import { Router, type Request, type Response, type NextFunction } from "express";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import { db, driversTable, clientsTable, restaurantsTable } from "@workspace/db";
import { isNotNull } from "drizzle-orm";

const router = Router();

const VALID_AUDIENCES = ["all", "clients", "drivers", "restaurants", "players", "official"] as const;
type Audience = typeof VALID_AUDIENCES[number];

// ─── MANAGER AUTH MIDDLEWARE ─────────────────────────────────────────────────

function requireManagerAuth(req: Request, res: Response, next: NextFunction): void {
  const JWT_SECRET = process.env.SESSION_SECRET;
  if (!JWT_SECRET) { res.status(500).json({ error: "Configuration serveur manquante" }); return; }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) { res.status(401).json({ error: "Token manager requis" }); return; }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { type?: string };
    if (payload.type !== "manager") { res.status(403).json({ error: "Accès refusé" }); return; }
    next();
  } catch {
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
}

function createTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

// ─── EMAIL TEMPLATES ────────────────────────────────────────────────────────

function wrapEmail(head: string, body: string, footer: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  ${head}
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
  ${body}
  <div style="text-align:center;padding:20px;font-size:11px;color:#444;">
    ${footer}
  </div>
</body>
</html>`;
}

/** 🍔 Clients — GradoEats food delivery — warm orange/amber */
function buildClientEmail(subject: string, message: string): string {
  const head = `<title>${subject}</title>`;
  const body = `
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="border-radius:20px;overflow:hidden;border:1px solid rgba(255,140,0,0.25);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#ff6b00,#ffb300);padding:40px 32px;text-align:center;">
      <div style="font-size:48px;margin-bottom:12px;">🍔</div>
      <div style="font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px;">GradoEats</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.8);letter-spacing:0.18em;text-transform:uppercase;margin-top:6px;">Livraison de repas · Safi</div>
    </div>
    <!-- Body -->
    <div style="background:#111;padding:36px 32px;">
      <div style="display:inline-block;background:rgba(255,107,0,0.15);border:1px solid rgba(255,107,0,0.35);color:#ff8c00;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:5px 14px;border-radius:999px;margin-bottom:20px;">Pour nos clients</div>
      <h2 style="font-size:22px;font-weight:700;color:#fff;margin:0 0 16px;line-height:1.35;">${subject}</h2>
      <div style="background:rgba(255,107,0,0.07);border-left:3px solid #ff6b00;border-radius:0 12px 12px 0;padding:18px 20px;margin-bottom:24px;">
        <p style="color:#ddd;font-size:15px;line-height:1.75;margin:0;">${message}</p>
      </div>
      <div style="display:flex;gap:12px;margin:28px 0;flex-wrap:wrap;">
        <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:18px;text-align:center;">
          <div style="font-size:32px;">🛵</div>
          <div style="font-size:13px;font-weight:700;color:#fff;margin-top:8px;">Livraison rapide</div>
          <div style="font-size:11px;color:#666;margin-top:4px;">Partout à Safi</div>
        </div>
        <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:18px;text-align:center;">
          <div style="font-size:32px;">🏪</div>
          <div style="font-size:13px;font-weight:700;color:#fff;margin-top:8px;">Meilleurs restos</div>
          <div style="font-size:11px;color:#666;margin-top:4px;">Sélection locale</div>
        </div>
        <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:18px;text-align:center;">
          <div style="font-size:32px;">⚡</div>
          <div style="font-size:13px;font-weight:700;color:#fff;margin-top:8px;">Suivi en direct</div>
          <div style="font-size:11px;color:#666;margin-top:4px;">En temps réel</div>
        </div>
      </div>
      <div style="text-align:center;margin-top:32px;">
        <a href="https://bridge-safi.replit.app" style="display:inline-block;background:linear-gradient(135deg,#ff6b00,#ffb300);color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:15px 40px;border-radius:999px;box-shadow:0 8px 28px rgba(255,107,0,0.4);">Commander maintenant →</a>
      </div>
    </div>
    <!-- Footer strip -->
    <div style="background:#0d0d0d;border-top:1px solid rgba(255,255,255,0.05);padding:20px 32px;text-align:center;">
      <p style="font-size:12px;color:#555;margin:0;">GradoEats · Bridge Safi · Safi, Maroc 🇲🇦 · <a href="mailto:bridge.safi@gmail.com" style="color:#ff6b00;text-decoration:none;">bridge.safi@gmail.com</a></p>
    </div>
  </div>
</div>`;
  return wrapEmail(head, body, "");
}

/** 🛵 Livreurs/Drivers — dark, professional, action-oriented */
function buildDriverEmail(subject: string, message: string): string {
  const head = `<title>${subject}</title>`;
  const body = `
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a1a1a,#0d0d0d);border-bottom:2px solid #ff5a1f;padding:36px 32px;">
      <div style="display:flex;align-items:center;gap:16px;">
        <div style="width:56px;height:56px;background:linear-gradient(135deg,#ff5a1f,#ff8c00);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px;">🛵</div>
        <div>
          <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.3px;">Bridge Safi</div>
          <div style="font-size:11px;color:#ff5a1f;letter-spacing:0.2em;text-transform:uppercase;font-weight:600;margin-top:3px;">Espace Livreurs</div>
        </div>
      </div>
    </div>
    <!-- Body -->
    <div style="background:#111;padding:36px 32px;">
      <div style="display:inline-block;background:rgba(255,90,31,0.12);border:1px solid rgba(255,90,31,0.3);color:#ff7a47;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:5px 14px;border-radius:999px;margin-bottom:20px;">Message Livreurs</div>
      <h2 style="font-size:22px;font-weight:700;color:#fff;margin:0 0 20px;line-height:1.35;">${subject}</h2>
      <p style="color:#bbb;font-size:15px;line-height:1.75;margin:0 0 28px;">${message}</p>
      <div style="background:#0d0d0d;border:1px solid rgba(255,90,31,0.2);border-radius:16px;padding:24px;">
        <div style="font-size:12px;font-weight:700;color:#ff5a1f;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:16px;">📋 Vos avantages</div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div style="display:flex;align-items:center;gap:12px;"><div style="width:32px;height:32px;background:rgba(255,90,31,0.12);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">💰</div><span style="color:#ddd;font-size:14px;">Paiement rapide & fiable</span></div>
          <div style="display:flex;align-items:center;gap:12px;"><div style="width:32px;height:32px;background:rgba(255,90,31,0.12);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">📍</div><span style="color:#ddd;font-size:14px;">GPS intégré dans l'app</span></div>
          <div style="display:flex;align-items:center;gap:12px;"><div style="width:32px;height:32px;background:rgba(255,90,31,0.12);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">🏆</div><span style="color:#ddd;font-size:14px;">Primes & récompenses</span></div>
        </div>
      </div>
      <div style="text-align:center;margin-top:32px;">
        <a href="https://bridge-safi.replit.app/driver-app/" style="display:inline-block;background:linear-gradient(135deg,#ff5a1f,#ff8c00);color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:15px 40px;border-radius:999px;box-shadow:0 8px 28px rgba(255,90,31,0.35);">Ouvrir l'app livreur →</a>
      </div>
    </div>
    <div style="background:#0d0d0d;border-top:1px solid rgba(255,255,255,0.05);padding:20px 32px;text-align:center;">
      <p style="font-size:12px;color:#555;margin:0;">Bridge Safi · Équipe Livreurs · <a href="mailto:bridge.safi@gmail.com" style="color:#ff5a1f;text-decoration:none;">bridge.safi@gmail.com</a></p>
    </div>
  </div>
</div>`;
  return wrapEmail(head, body, "");
}

/** 🏪 Restaurants — clean, partnership-focused, professional green */
function buildRestaurantEmail(subject: string, message: string): string {
  const head = `<title>${subject}</title>`;
  const body = `
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="border-radius:20px;overflow:hidden;border:1px solid rgba(16,185,129,0.2);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#064e3b,#065f46);padding:40px 32px;text-align:center;">
      <div style="font-size:48px;margin-bottom:12px;">🏪</div>
      <div style="font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.3px;">Espace Restaurateurs</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.7);letter-spacing:0.18em;text-transform:uppercase;margin-top:6px;">Bridge Safi · Partenaires</div>
    </div>
    <!-- Body -->
    <div style="background:#111;padding:36px 32px;">
      <div style="display:inline-block;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);color:#10b981;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:5px 14px;border-radius:999px;margin-bottom:20px;">Partenaire Restaurant</div>
      <h2 style="font-size:22px;font-weight:700;color:#fff;margin:0 0 16px;line-height:1.35;">${subject}</h2>
      <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:14px;padding:20px 22px;margin-bottom:28px;">
        <p style="color:#ccc;font-size:15px;line-height:1.75;margin:0;">${message}</p>
      </div>
      <div style="display:grid;gap:14px;">
        <div style="display:flex;align-items:center;gap:14px;background:#0d0d0d;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px 18px;">
          <span style="font-size:28px;">📈</span>
          <div><div style="font-size:14px;font-weight:600;color:#fff;">Augmentez vos ventes</div><div style="font-size:12px;color:#666;margin-top:2px;">Plus de clients, plus de commandes</div></div>
        </div>
        <div style="display:flex;align-items:center;gap:14px;background:#0d0d0d;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px 18px;">
          <span style="font-size:28px;">📊</span>
          <div><div style="font-size:14px;font-weight:600;color:#fff;">Tableau de bord complet</div><div style="font-size:12px;color:#666;margin-top:2px;">Gérez vos commandes en temps réel</div></div>
        </div>
        <div style="display:flex;align-items:center;gap:14px;background:#0d0d0d;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px 18px;">
          <span style="font-size:28px;">🤝</span>
          <div><div style="font-size:14px;font-weight:600;color:#fff;">Support dédié</div><div style="font-size:12px;color:#666;margin-top:2px;">Notre équipe à votre disposition</div></div>
        </div>
      </div>
      <div style="text-align:center;margin-top:32px;">
        <a href="https://bridge-safi.replit.app/restaurant-dashboard/" style="display:inline-block;background:linear-gradient(135deg,#059669,#10b981);color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:15px 40px;border-radius:999px;box-shadow:0 8px 28px rgba(16,185,129,0.3);">Accéder à mon espace →</a>
      </div>
    </div>
    <div style="background:#0d0d0d;border-top:1px solid rgba(255,255,255,0.05);padding:20px 32px;text-align:center;">
      <p style="font-size:12px;color:#555;margin:0;">Bridge Safi · Partenaires Restaurateurs · <a href="mailto:bridge.safi@gmail.com" style="color:#10b981;text-decoration:none;">bridge.safi@gmail.com</a></p>
    </div>
  </div>
</div>`;
  return wrapEmail(head, body, "");
}

/** 🎮 Joueurs Safi Runner — gaming, energetic, purple/blue */
function buildPlayerEmail(subject: string, message: string): string {
  const head = `<title>${subject}</title>`;
  const body = `
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="border-radius:20px;overflow:hidden;border:1px solid rgba(139,92,246,0.25);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95);padding:40px 32px;text-align:center;position:relative;">
      <div style="font-size:52px;margin-bottom:12px;">🎮</div>
      <div style="font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Safi Runner</div>
      <div style="font-size:11px;color:rgba(196,181,253,0.9);letter-spacing:0.2em;text-transform:uppercase;margin-top:6px;">Le jeu de la ville · Bridge Safi</div>
      <div style="display:flex;justify-content:center;gap:8px;margin-top:20px;flex-wrap:wrap;">
        <span style="background:rgba(139,92,246,0.3);border:1px solid rgba(139,92,246,0.5);color:#c4b5fd;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;">🏆 Classement</span>
        <span style="background:rgba(139,92,246,0.3);border:1px solid rgba(139,92,246,0.5);color:#c4b5fd;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;">💎 Diamants</span>
        <span style="background:rgba(139,92,246,0.3);border:1px solid rgba(139,92,246,0.5);color:#c4b5fd;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;">⚡ Nouveautés</span>
      </div>
    </div>
    <!-- Body -->
    <div style="background:#0f0f1a;padding:36px 32px;">
      <div style="display:inline-block;background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.3);color:#a78bfa;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:5px 14px;border-radius:999px;margin-bottom:20px;">Message Joueurs</div>
      <h2 style="font-size:22px;font-weight:700;color:#fff;margin:0 0 16px;line-height:1.35;">${subject}</h2>
      <div style="background:linear-gradient(135deg,rgba(139,92,246,0.08),rgba(59,130,246,0.08));border:1px solid rgba(139,92,246,0.2);border-radius:14px;padding:20px 22px;margin-bottom:28px;">
        <p style="color:#ccc;font-size:15px;line-height:1.75;margin:0;">${message}</p>
      </div>
      <div style="background:#0d0d18;border:1px solid rgba(139,92,246,0.15);border-radius:16px;padding:22px;margin-bottom:28px;">
        <div style="font-size:12px;font-weight:700;color:#a78bfa;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:16px;">🎯 Dans le jeu</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <div style="flex:1;min-width:100px;text-align:center;">
            <div style="font-size:28px;">🏃</div>
            <div style="font-size:13px;font-weight:600;color:#fff;margin-top:8px;">Runner 3D</div>
            <div style="font-size:11px;color:#666;margin-top:2px;">Infini</div>
          </div>
          <div style="flex:1;min-width:100px;text-align:center;">
            <div style="font-size:28px;">💎</div>
            <div style="font-size:13px;font-weight:600;color:#fff;margin-top:8px;">Collectez</div>
            <div style="font-size:11px;color:#666;margin-top:2px;">Diamants</div>
          </div>
          <div style="flex:1;min-width:100px;text-align:center;">
            <div style="font-size:28px;">🥇</div>
            <div style="font-size:13px;font-weight:600;color:#fff;margin-top:8px;">Top Scores</div>
            <div style="font-size:11px;color:#666;margin-top:2px;">Mondial</div>
          </div>
        </div>
      </div>
      <div style="text-align:center;">
        <a href="https://bridge-safi.replit.app/safi-runner/" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:15px 40px;border-radius:999px;box-shadow:0 8px 28px rgba(124,58,237,0.4);">Jouer maintenant →</a>
      </div>
    </div>
    <div style="background:#0a0a12;border-top:1px solid rgba(139,92,246,0.1);padding:20px 32px;text-align:center;">
      <p style="font-size:12px;color:#555;margin:0;">Safi Runner · Bridge Safi · <a href="mailto:bridge.safi@gmail.com" style="color:#a78bfa;text-decoration:none;">bridge.safi@gmail.com</a></p>
    </div>
  </div>
</div>`;
  return wrapEmail(head, body, "");
}

/** 🌐 Bridge Safi Officiel — general announcement, full brand */
function buildOfficialEmail(subject: string, message: string): string {
  const head = `<title>${subject}</title>`;
  const body = `
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="border-radius:20px;overflow:hidden;border:1px solid rgba(255,90,31,0.2);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#ff5a1f,#ff8c00);padding:44px 32px;text-align:center;">
      <div style="width:72px;height:72px;margin:0 auto 16px;">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
          <polygon points="50,5 93,27.5 93,72.5 50,95 7,72.5 7,27.5" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.6)" stroke-width="3"/>
          <polygon points="60,28 38,55 55,55 40,82 67,44 47,44" fill="#ffffff"/>
        </svg>
      </div>
      <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Bridge Safi</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.8);letter-spacing:0.18em;text-transform:uppercase;margin-top:6px;">Votre plateforme locale · Safi, Maroc</div>
    </div>
    <!-- Body -->
    <div style="background:#111;padding:36px 32px;">
      <div style="display:inline-block;background:rgba(255,90,31,0.1);border:1px solid rgba(255,90,31,0.3);color:#ff7a47;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:5px 14px;border-radius:999px;margin-bottom:20px;">Annonce officielle</div>
      <h2 style="font-size:22px;font-weight:700;color:#fff;margin:0 0 16px;line-height:1.35;">${subject}</h2>
      <div style="background:rgba(255,90,31,0.06);border:1px solid rgba(255,90,31,0.15);border-radius:14px;padding:20px 22px;margin-bottom:28px;">
        <p style="color:#ccc;font-size:15px;line-height:1.75;margin:0;">${message}</p>
      </div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:32px;">
        <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:18px;text-align:center;">
          <div style="font-size:32px;">🍔</div>
          <div style="font-size:13px;font-weight:600;color:#fff;margin-top:8px;">GradoEats</div>
          <div style="font-size:11px;color:#555;margin-top:3px;">Livraison repas</div>
        </div>
        <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:18px;text-align:center;">
          <div style="font-size:32px;">🚖</div>
          <div style="font-size:13px;font-weight:600;color:#fff;margin-top:8px;">Bridge Taxi</div>
          <div style="font-size:11px;color:#555;margin-top:3px;">VTC & chauffeurs</div>
        </div>
        <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:18px;text-align:center;">
          <div style="font-size:32px;">🎮</div>
          <div style="font-size:13px;font-weight:600;color:#fff;margin-top:8px;">Safi Runner</div>
          <div style="font-size:11px;color:#555;margin-top:3px;">Jeu mobile</div>
        </div>
      </div>
      <div style="text-align:center;">
        <a href="https://bridge-safi.replit.app" style="display:inline-block;background:linear-gradient(135deg,#ff5a1f,#ff8c00);color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:15px 40px;border-radius:999px;box-shadow:0 8px 28px rgba(255,90,31,0.35);">Découvrir Bridge Safi →</a>
      </div>
    </div>
    <div style="background:#0d0d0d;border-top:1px solid rgba(255,255,255,0.05);padding:20px 32px;text-align:center;">
      <p style="font-size:12px;color:#555;margin:0;">© 2025 Bridge Safi · Safi, Maroc 🇲🇦 · <a href="mailto:bridge.safi@gmail.com" style="color:#ff5a1f;text-decoration:none;">bridge.safi@gmail.com</a></p>
    </div>
  </div>
</div>`;
  return wrapEmail(head, body, "");
}

function buildHtml(audience: Audience, subject: string, message: string): string {
  switch (audience) {
    case "clients":   return buildClientEmail(subject, message);
    case "drivers":   return buildDriverEmail(subject, message);
    case "restaurants": return buildRestaurantEmail(subject, message);
    case "players":   return buildPlayerEmail(subject, message);
    default:          return buildOfficialEmail(subject, message);
  }
}

// ─── ROUTES ────────────────────────────────────────────────────────────────

router.get("/status", requireManagerAuth, (_req, res) => {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  res.json({ gmailConfigured: !!(user && pass), gmailUser: user ?? null });
});

router.get("/emails", requireManagerAuth, async (_req, res) => {
  const [drivers, clients, restaurants] = await Promise.all([
    db.select({ email: driversTable.email, name: driversTable.name })
      .from(driversTable).where(isNotNull(driversTable.email)),
    db.select({ email: clientsTable.email, name: clientsTable.name })
      .from(clientsTable).where(isNotNull(clientsTable.email)),
    db.select({ email: restaurantsTable.email, name: restaurantsTable.name })
      .from(restaurantsTable).where(isNotNull(restaurantsTable.email)),
  ]);

  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let players: { email: string; name: string }[] = [];
  if (supabaseKey) {
    try {
      const resp = await fetch(
        "https://ngfmuysddnixtbbguakr.supabase.co/auth/v1/admin/users?per_page=1000",
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );
      if (resp.ok) {
        const data = await resp.json() as { users: { email?: string; user_metadata?: { username?: string } }[] };
        players = (data.users ?? [])
          .filter(u => u.email)
          .map(u => ({ email: u.email!, name: u.user_metadata?.username ?? u.email! }));
      }
    } catch {}
  }

  const all = [
    ...drivers.map(d => ({ email: d.email!, name: d.name, source: "driver" as const })),
    ...clients.map(c => ({ email: c.email!, name: c.name, source: "client" as const })),
    ...restaurants.map(r => ({ email: r.email!, name: r.name, source: "restaurant" as const })),
    ...players.map(p => ({ ...p, source: "player" as const })),
  ];

  const seen = new Set<string>();
  const unique = all.filter(e => {
    if (seen.has(e.email.toLowerCase())) return false;
    seen.add(e.email.toLowerCase());
    return true;
  });

  res.json({ count: unique.length, emails: unique });
});

router.post("/send-announcement", requireManagerAuth, async (req, res) => {
  const transport = createTransport();
  if (!transport) {
    res.status(503).json({ error: "Gmail non configuré. Ajoutez GMAIL_USER et GMAIL_APP_PASSWORD." });
    return;
  }

  const { to, subject, message, audience } = req.body as {
    to?: unknown;
    subject?: unknown;
    message?: unknown;
    audience?: unknown;
  };

  // Validate inputs
  const emailAudience: Audience = VALID_AUDIENCES.includes(audience as Audience)
    ? (audience as Audience)
    : "official";

  const emailSubject = typeof subject === "string" && subject.trim().length > 0
    ? subject.trim().slice(0, 200)
    : "🚀 Annonce Bridge Safi";

  const emailMessage = typeof message === "string" && message.trim().length > 0
    ? message.trim().slice(0, 5000)
    : "Nous avons une annonce importante à vous partager concernant Bridge Safi, votre plateforme locale à Safi.";

  // Validate explicit recipient list if provided
  const explicitTo: string[] | null = Array.isArray(to)
    ? to.filter((e): e is string => typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    : null;

  const html = buildHtml(emailAudience, emailSubject, emailMessage);

  // Use validated explicit list if provided, otherwise resolve by audience from DB
  let recipients: string[] = explicitTo ?? [];

  if (recipients.length === 0) {
    const [drivers, clients, restaurants] = await Promise.all([
      db.select({ email: driversTable.email }).from(driversTable).where(isNotNull(driversTable.email)),
      db.select({ email: clientsTable.email }).from(clientsTable).where(isNotNull(clientsTable.email)),
      db.select({ email: restaurantsTable.email }).from(restaurantsTable).where(isNotNull(restaurantsTable.email)),
    ]);

    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let players: string[] = [];
    if (supabaseKey) {
      try {
        const resp = await fetch(
          "https://ngfmuysddnixtbbguakr.supabase.co/auth/v1/admin/users?per_page=1000",
          { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
        );
        if (resp.ok) {
          const data = await resp.json() as { users: { email?: string }[] };
          players = (data.users ?? []).filter(u => u.email).map(u => u.email!);
        }
      } catch {}
    }

    if (emailAudience === "all") {
      recipients = [
        ...drivers.map(d => d.email!),
        ...clients.map(c => c.email!),
        ...restaurants.map(r => r.email!),
        ...players,
      ];
    } else if (emailAudience === "drivers") {
      recipients = drivers.map(d => d.email!);
    } else if (emailAudience === "clients") {
      recipients = clients.map(c => c.email!);
    } else if (emailAudience === "restaurants") {
      recipients = restaurants.map(r => r.email!);
    } else if (emailAudience === "players") {
      recipients = players;
    } else {
      // official → everyone
      recipients = [
        ...drivers.map(d => d.email!),
        ...clients.map(c => c.email!),
        ...restaurants.map(r => r.email!),
        ...players,
      ];
    }

    // deduplicate
    recipients = [...new Set(recipients.map(e => e.toLowerCase()))];
  }

  const results = { sent: 0, failed: 0, errors: [] as string[] };

  const BATCH = 10;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH);
    await Promise.allSettled(
      batch.map(email =>
        transport.sendMail({
          from: `"Bridge Safi" <${process.env.GMAIL_USER}>`,
          to: email,
          subject: emailSubject,
          html,
        })
          .then(() => { results.sent++; })
          .catch((err: Error) => { results.failed++; results.errors.push(`${email}: ${err.message}`); })
      )
    );
  }

  res.json({ ...results, total: recipients.length });
});

export default router;
