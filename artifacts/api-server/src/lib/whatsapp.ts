import { logger } from "./logger";

const ADMIN_PHONE = "0764794856";
const ADMIN_WHATSAPP = `whatsapp:+33${ADMIN_PHONE.replace(/^0/, "")}`;

function formatAdminPhone(raw: string): string {
  const cleaned = raw.replace(/\s/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return `+33${cleaned.slice(1)}`;
  return `+33${cleaned}`;
}

const adminWhatsApp = `whatsapp:${formatAdminPhone(ADMIN_PHONE)}`;

export async function sendWhatsAppProof(params: {
  deliveryId: number;
  trackingNumber: string;
  customerName: string;
  deliveryAddress: string;
  delivererName: string;
  delivererPhone: string;
  proofNote?: string;
}): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !fromNumber) {
    logger.warn("Twilio credentials not configured - skipping WhatsApp notification");
    return false;
  }

  const message = `✅ *Livraison confirmée - Bridge*

📦 Commande: ${params.trackingNumber}
👤 Client: ${params.customerName}
📍 Adressé: ${params.deliveryAddress}

🛵 Livreur: ${params.delivererName}
📞 Tél: ${params.delivererPhone}

${params.proofNote ? `📝 Note: ${params.proofNote}\n` : ""}⏰ Heure: ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}

_Bridge Plateforme Logistique_`;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({
      From: `whatsapp:${fromNumber}`,
      To: adminWhatsApp,
      Body: message,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error({ status: response.status, error: errText }, "WhatsApp send failed");
      return false;
    }

    logger.info({ to: adminWhatsApp, trackingNumber: params.trackingNumber }, "WhatsApp proof sent");
    return true;
  } catch (err) {
    logger.error({ err }, "WhatsApp send error");
    return false;
  }
}
