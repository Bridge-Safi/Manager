import { Router, type IRouter } from "express";

const router: IRouter = Router();

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Safi centre — fallback si adresse introuvable
const SAFI_FALLBACK = { lat: 32.2994, lng: -9.2372, fallback: true };

router.get("/", async (req, res): Promise<void> => {
  const address = (req.query.address as string | undefined)?.trim();

  if (!address) {
    res.status(400).json({ error: "address requis" });
    return;
  }

  // ── Google Maps Geocoding API ──────────────────────────────────────────────
  if (GOOGLE_KEY) {
    const variants = [
      address,
      address.includes(",") ? address : `${address}, Safi, Maroc`,
    ];

    for (const q of variants) {
      try {
        const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
        url.searchParams.set("address", q);
        url.searchParams.set("key", GOOGLE_KEY);
        url.searchParams.set("language", "fr");
        url.searchParams.set("region", "ma");
        url.searchParams.set("components", "country:MA");

        const r = await fetch(url.toString());
        if (!r.ok) continue;
        const data = (await r.json()) as {
          status: string;
          results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
        };

        if (data.status === "OK" && data.results.length > 0) {
          const { lat, lng } = data.results[0].geometry.location;
          req.log.info({ address: q, lat, lng }, "geocode:google:hit");
          res.json({ lat, lng, fallback: false });
          return;
        }
      } catch (err) {
        req.log.warn({ err }, "geocode:google:error");
      }
    }
  }

  // ── Nominatim fallback ─────────────────────────────────────────────────────
  const clean = address.includes(" — ")
    ? address.split(" — ").pop()!
    : address;
  const query = /safi/i.test(clean) ? `${clean}, Maroc` : `${clean}, Safi, Maroc`;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "ma");

    const r = await fetch(url.toString(), {
      headers: { "User-Agent": "Bridge-Safi-Logistique/1.0" },
    });
    if (r.ok) {
      const data = (await r.json()) as Array<{ lat: string; lon: string }>;
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        req.log.info({ address: query, lat, lng }, "geocode:nominatim:hit");
        res.json({ lat, lng, fallback: false });
        return;
      }
    }
  } catch (err) {
    req.log.warn({ err }, "geocode:nominatim:error");
  }

  // ── Safi centre ────────────────────────────────────────────────────────────
  req.log.warn({ address }, "geocode:fallback:safi-center");
  res.json(SAFI_FALLBACK);
});

export default router;
