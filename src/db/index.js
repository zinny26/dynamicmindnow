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
  // Serverless containers are many and short-lived, so each one holds a
  // minimal pool and releases it quickly. Use your provider's *pooled*
  // connection string (Neon/Supabase pgbouncer) when deploying to Netlify.
  max: Number(process.env.DATABASE_POOL_MAX ?? 1),
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
});

export const db = drizzle(pool, { schema });
export { schema };
