import { Router } from "express";
import nodemailer from "nodemailer";
import { db, driversTable, clientsTable } from "@workspace/db";
import { isNotNull } from "drizzle-orm";

const router = Router();

function createTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

function buildEmailHtml(subject: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${subject}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#0a0a0a; font-family:'Inter',Arial,sans-serif; color:#e5e5e5; }
    .wrapper { max-width:600px; margin:0 auto; padding:32px 16px; }
    .card { background:linear-gradient(145deg,#111111,#1a1a1a); border:1px solid rgba(255,90,31,0.2); border-radius:24px; overflow:hidden; }
    .header { background:linear-gradient(135deg,#ff5a1f,#ff8c00); padding:40px 32px; text-align:center; }
    .logo-hex { width:72px; height:72px; margin:0 auto 16px; }
    .logo-hex svg { width:100%; height:100%; }
    .brand { font-size:28px; font-weight:800; color:#fff; letter-spacing:-0.5px; }
    .brand-sub { font-size:13px; color:rgba(255,255,255,0.75); letter-spacing:0.15em; text-transform:uppercase; margin-top:4px; }
    .content { padding:40px 32px; }
    .content h2 { font-size:22px; font-weight:700; color:#fff; margin-bottom:16px; line-height:1.3; }
    .content p { color:#a0a0a0; font-size:15px; line-height:1.7; margin-bottom:16px; }
    .highlight { background:rgba(255,90,31,0.08); border:1px solid rgba(255,90,31,0.2); border-radius:12px; padding:20px; margin:24px 0; }
    .highlight p { color:#e5e5e5; margin:0; }
    .badge { display:inline-block; background:linear-gradient(135deg,#ff5a1f,#ff8c00); color:#fff; font-weight:700; font-size:12px; letter-spacing:0.1em; text-transform:uppercase; padding:6px 16px; border-radius:999px; margin-bottom:8px; }
    .cta { text-align:center; margin:32px 0; }
    .cta a { display:inline-block; background:linear-gradient(135deg,#ff5a1f,#ff8c00); color:#fff; font-weight:700; font-size:15px; text-decoration:none; padding:14px 36px; border-radius:999px; box-shadow:0 8px 32px rgba(255,90,31,0.35); }
    .divider { height:1px; background:rgba(255,255,255,0.06); margin:28px 0; }
    .services { display:flex; gap:16px; margin:20px 0; flex-wrap:wrap; }
    .service { flex:1; min-width:120px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:16px; text-align:center; }
    .service-icon { font-size:28px; margin-bottom:8px; }
    .service-name { font-size:13px; font-weight:600; color:#fff; }
    .service-desc { font-size:11px; color:#666; margin-top:4px; }
    .footer { padding:24px 32px; border-top:1px solid rgba(255,255,255,0.06); text-align:center; }
    .footer p { font-size:12px; color:#555; line-height:1.6; }
    .footer a { color:#ff5a1f; text-decoration:none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo-hex">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <polygon points="50,5 93,27.5 93,72.5 50,95 7,72.5 7,27.5" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.6)" stroke-width="3"/>
            <polygon points="60,28 38,55 55,55 40,82 67,44 47,44" fill="#ffffff"/>
          </svg>
        </div>
        <div class="brand">Bridge Safi</div>
        <div class="brand-sub">Votre plateforme locale</div>
      </div>
      <div class="content">
        ${body}
      </div>
      <div class="footer">
        <p>Vous recevez cet email car vous êtes inscrit sur Bridge Safi.<br/>
        <a href="mailto:bridge.safi@gmail.com">bridge.safi@gmail.com</a> · Safi, Maroc 🇲🇦</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

router.get("/status", (_req, res) => {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  res.json({
    gmailConfigured: !!(user && pass),
    gmailUser: user ?? null,
  });
});

router.get("/emails", async (_req, res) => {
  const drivers = await db.select({ email: driversTable.email, name: driversTable.name })
    .from(driversTable)
    .where(isNotNull(driversTable.email));

  const clients = await db.select({ email: clientsTable.email, name: clientsTable.name })
    .from(clientsTable)
    .where(isNotNull(clientsTable.email));

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
    ...drivers.map(d => ({ email: d.email!, name: d.name, source: "driver" })),
    ...clients.map(c => ({ email: c.email!, name: c.name, source: "client" })),
    ...players.map(p => ({ ...p, source: "player" })),
  ];

  const seen = new Set<string>();
  const unique = all.filter(e => {
    if (seen.has(e.email.toLowerCase())) return false;
    seen.add(e.email.toLowerCase());
    return true;
  });

  res.json({ count: unique.length, emails: unique });
});

router.post("/send-announcement", async (req, res) => {
  const transport = createTransport();
  if (!transport) {
    res.status(503).json({ error: "Gmail non configuré. Ajoutez GMAIL_USER et GMAIL_APP_PASSWORD." });
    return;
  }

  const { to, subject, customBody } = req.body as {
    to?: string[];
    subject?: string;
    customBody?: string;
  };

  const emailSubject = subject ?? "🚀 Bridge Safi arrive bientôt !";

  const htmlBody = customBody ?? `
    <span class="badge">Bientôt disponible</span>
    <h2>L'application Bridge Safi arrive à Safi ! 🎉</h2>
    <p>Nous sommes ravis de vous annoncer que <strong>Bridge Safi</strong> — votre plateforme de livraison locale — sera bientôt disponible.</p>

    <div class="highlight">
      <p>🛵 <strong>Livraison de repas</strong>, 🚖 <strong>VTC & taxi</strong>, 🎮 <strong>Safi Runner</strong> — tout dans une seule application pensée pour Safi.</p>
    </div>

    <div class="services">
      <div class="service">
        <div class="service-icon">🍔</div>
        <div class="service-name">GradoEats</div>
        <div class="service-desc">Livraison de repas</div>
      </div>
      <div class="service">
        <div class="service-icon">🚖</div>
        <div class="service-name">Bridge Taxi</div>
        <div class="service-desc">VTC & chauffeurs</div>
      </div>
      <div class="service">
        <div class="service-icon">🎮</div>
        <div class="service-name">Safi Runner</div>
        <div class="service-desc">Le jeu de la ville</div>
      </div>
    </div>

    <div class="divider"></div>
    <p>Restez connecté — le lancement officiel approche. Nous vous enverrons une notification dès que l'application est disponible sur votre téléphone.</p>

    <div class="cta">
      <a href="https://bridge-safi.replit.app">Voir le site →</a>
    </div>
  `;

  const html = buildEmailHtml(emailSubject, htmlBody);

  let recipients = to ?? [];
  if (recipients.length === 0) {
    const drivers = await db.select({ email: driversTable.email }).from(driversTable).where(isNotNull(driversTable.email));
    const clients = await db.select({ email: clientsTable.email }).from(clientsTable).where(isNotNull(clientsTable.email));
    recipients = [...drivers.map(d => d.email!), ...clients.map(c => c.email!)];
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
        }).then(() => { results.sent++; })
          .catch((err: Error) => { results.failed++; results.errors.push(`${email}: ${err.message}`); })
      )
    );
  }

  res.json({ ...results, total: recipients.length });
});

export default router;
