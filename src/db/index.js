import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env and point DATABASE_URL at a Postgres database.',
  );
}

// Hosted Postgres (Neon, Supabase, Render, Railway...) terminates TLS with a
// chain the container may not carry, so only verify when explicitly asked to.
const wantsSsl = /[?&]sslmode=(require|verify-ca|verify-full)/.test(connectionString);

export const pool = new pg.Pool({
  connectionString,
  ssl: wantsSsl ? { rejectUnauthorized: process.env.DATABASE_SSL_VERIFY === 'true' } : false,
  max: Number(process.env.DATABASE_POOL_MAX ?? 5),
});

export const db = drizzle(pool, { schema });
export { schema };
