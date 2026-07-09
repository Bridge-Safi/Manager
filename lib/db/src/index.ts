import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Prefer external Railway DB over the local Replit DB
let connectionString = process.env.DATABASE_PUBLIC_URL ?? process.env.RAILWAY_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// If the connection string uses the internal Railway host, automatically replace it
// with the public TCP proxy host so it works from outside Railway's network.
const publicHost = process.env.RAILWAY_PUBLIC_HOST;
if (publicHost && connectionString.includes("postgres.railway.internal")) {
  connectionString = connectionString.replace(/postgres\.railway\.internal:\d+/, publicHost);
  console.log("[db] Replaced internal Railway host with public proxy:", publicHost);
}

// Railway public TCP proxy does not support SSL — disable it when using RAILWAY_DATABASE_URL
export const pool = new Pool({ connectionString, ssl: false });
export const db = drizzle(pool, { schema });

export * from "./schema";
