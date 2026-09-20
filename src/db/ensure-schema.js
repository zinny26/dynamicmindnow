import { sql } from 'drizzle-orm';
import { db } from './index.js';

/**
 * Creates the `articles` table and its indexes if they are not there yet, so a
 * fresh deployment is able to accept a webhook without a separate migration
 * step. Every statement is idempotent.
 */
export async function ensureSchema() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS articles (
      id serial PRIMARY KEY,
      external_id text NOT NULL,
      title text,
      slug text,
      content_html text,
      content_markdown text,
      meta_title text,
      meta_description text,
      subtitle text,
      category text,
      author_name text,
      image_url text,
      read_time text,
      word_count integer,
      tags json,
      faqs json,
      json_ld_schema json,
      language_code text,
      published_at timestamptz,
      updated_at timestamptz DEFAULT now()
    )
  `);

  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS articles_external_id_key ON articles (external_id)`,
  );
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS articles_slug_key ON articles (slug)`);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS articles_published_at_idx ON articles (published_at)`,
  );
}
