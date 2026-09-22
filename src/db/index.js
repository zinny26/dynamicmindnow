import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

// Netlify's built-in database sets its own variable names, so accept those too
// and nothing has to be copied by hand. A pooled URL is always preferred.
const connectionString =
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED;

if (!connectionString) {
  throw new Error(
    'No database connection string found. Set DATABASE_URL (or add a Netlify ' +
      'database, which sets NETLIFY_DATABASE_URL for you).',
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
