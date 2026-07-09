import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Prefer RAILWAY_DATABASE_URL (external Railway DB) over the local Replit DB
const connectionString = process.env.RAILWAY_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString, ssl: process.env.RAILWAY_DATABASE_URL ? { rejectUnauthorized: false } : undefined });
export const db = drizzle(pool, { schema });

export * from "./schema";
