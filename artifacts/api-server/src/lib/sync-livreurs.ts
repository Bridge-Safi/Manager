import { Client } from "pg";

const LIVREURS_DB_URL = process.env.LIVREURS_DATABASE_URL;

async function withLivreursClient(fn) {
  if (!LIVREURS_DB_URL) {
    console.warn("[sync-livreurs] LIVREURS_DATABASE_URL non configuree, sync ignoree");
    return null;
  }
  const client = new Client({ connectionString: LIVREURS_DB_URL });
  try {
    await client.connect();
    return await fn(client);
  } catch (err) {
    console.error("[sync-livreurs] erreur:", err);
    return null;
  } finally {
    await client.end().catch(() => {});
  }
}

function mapVehicleType(vt) {
  if (vt === "moto") return "motorcycle";
  if (["bicycle", "motorcycle", "car", "van"].includes(vt)) return vt;
  return "motorcycle";
}

function randomPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function syncDriverToLivreurs(driver) {
  if (driver.services !== "nourriture") return;
  if (!driver.hashedPassword) return;
  const vehicleType = mapVehicleType(driver.vehicleType);

await withLivreursClient(async (client) => {
  const existingDrivers = await client.query("select id from drivers where phone=$1", [driver.phone]);
  if (existingDrivers.rows.length > 0) {
    await client.query(
      "update drivers set name=$1, email=$2, vehicle_type=$3, password=$4, is_blocked=$5, avatar_url=$6, services='nourriture' where phone=$7",
      [driver.name, driver.email || null, vehicleType, driver.hashedPassword, !!driver.isBlocked, driver.avatarUrl || null, driver.phone]
      );
  } else {
    await client.query(
      "insert into drivers (name,phone,email,vehicle_type,status,password,vehicle_model,vehicle_plate,license_number,rating,total_trips,pin,is_blocked,avatar_url,services,created_at) values ($1,$2,$3,$4,'available',$5,'','','',$6,0,$7,$8,$9,'nourriture',now())",
      [driver.name, driver.phone, driver.email || null, vehicleType, driver.hashedPassword, driver.rating ?? 5.0, randomPin(), !!driver.isBlocked, driver.avatarUrl || null]
      );
  }

                         const existingDeliverers = await client.query("select id from deliverers where phone=$1", [driver.phone]);
  if (existingDeliverers.rows.length > 0) {
    await client.query(
      "update deliverers set name=$1, email=$2, vehicle_type=$3, password=$4 where phone=$5",
      [driver.name, driver.email || null, vehicleType, driver.hashedPassword, driver.phone]
      );
  } else {
    await client.query(
      "insert into deliverers (name,phone,email,vehicle_type,status,password,zone,total_deliveries,rating,pin,created_at) values ($1,$2,$3,$4,'available',$5,'Safi',0,$6,$7,now())",
      [driver.name, driver.phone, driver.email || null, vehicleType, driver.hashedPassword, driver.rating ?? 5.0, randomPin()]
      );
  }
});
}
