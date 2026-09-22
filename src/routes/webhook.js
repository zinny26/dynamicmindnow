import crypto from 'node:crypto';
import express from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { ensureSchemaReady } from '../db/ensure-schema.js';
import { articles } from '../db/schema.js';
import { slugify } from '../lib/html.js';

export const router = express.Router();

/** Articles carry full HTML, so the default 100kb body limit is far too small. */
const BODY_LIMIT = '10mb';

function toText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value);
  return text.length ? text : null;
}

function toInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/** JSON columns accept an object/array directly or a JSON-encoded string. */
function toJson(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return value;
}

function toDate(value) {
  if (value === undefined || value === null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Deterministic short suffix used to break a slug collision. */
function slugSuffix(externalId) {
  return crypto.createHash('sha1').update(String(externalId)).digest('hex').slice(0, 8);
}

/**
 * Maps one payload item onto the table's columns. Every other field in the
 * payload (author_initials, hreflang_tags, ...) is deliberately dropped.
 */
function buildRow(item, externalId) {
  const slug =
    slugify(item.slug) || slugify(item.title) || `article-${slugSuffix(externalId)}`;

  return {
    externalId,
    title: toText(item.title),
    slug,
    contentHtml: toText(item.content_html),
    contentMarkdown: toText(item.content_markdown),
    metaTitle: toText(item.meta_title),
    metaDescription: toText(item.meta_description),
    subtitle: toText(item.subtitle),
    category: toText(item.category),
    authorName: toText(item.author_name),
    imageUrl: toText(item.image_url),
    readTime: toText(item.read_time),
    wordCount: toInt(item.word_count),
    tags: toJson(item.tags),
    faqs: toJson(item.faqs),
    jsonLdSchema: toJson(item.json_ld_schema),
    languageCode: toText(item.language_code),
    publishedAt: toDate(item.publish_date),
    updatedAt: toDate(item.updated_at) ?? new Date(),
  };
}

/**
 * Drizzle wraps driver failures in a DrizzleQueryError, so the Postgres error
 * code lives further down the `cause` chain.
 */
function isSlugConflict(error) {
  for (let current = error, depth = 0; current && depth < 5; current = current.cause, depth += 1) {
    if (current.code === '23505' && String(current.constraint ?? '').includes('slug')) {
      return true;
    }
  }
  return false;
}

async function upsert(row) {
  const { externalId, ...updatable } = row;
  await db
    .insert(articles)
    .values(row)
    .onConflictDoUpdate({ target: articles.externalId, set: updatable });
}

/** Upserts one article, keyed on external_id. */
async function upsertArticle(item) {
  const externalId = toText(item?.id);
  if (!externalId) return { status: 'skipped', reason: 'missing id' };

  const row = buildRow(item, externalId);
  try {
    await upsert(row);
  } catch (error) {
    // Another article already owns this slug: keep both by suffixing the new one.
    if (!isSlugConflict(error)) throw error;
    row.slug = `${row.slug}-${slugSuffix(externalId)}`;
    await upsert(row);
  }
  return { status: 'ok', externalId, slug: row.slug };
}

/** Rejects a POST whose X-API-Key header does not match GRANDRANKER_SECRET. */
function requireApiKey(req, res, next) {
  const secret = process.env.GRANDRANKER_SECRET;
  if (!secret) {
    console.error('[webhook] GRANDRANKER_SECRET is not set; rejecting request.');
    return res.status(500).json({ error: 'Webhook secret is not configured' });
  }

  const provided = req.get('X-API-Key');
  if (typeof provided !== 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  const matches = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!matches) return res.status(401).json({ error: 'Unauthorized' });

  return next();
}

// Health check. GET also answers HEAD, and neither requires the key so the
// publisher can confirm the endpoint is reachable before sending anything.
router.get('/', (_req, res) => {
  res.status(200).json({ status: 'ok', endpoint: '/api/articles-webhook' });
});

router.post(
  '/',
  requireApiKey,
  ensureSchemaReady,
  express.json({ limit: BODY_LIMIT }),
  async (req, res) => {
    const payload = req.body ?? {};
    const eventType = payload.event_type;
    const data = payload.data ?? {};

    if (eventType === 'publish_articles') {
      const items = Array.isArray(data.articles) ? data.articles : [];
      const results = [];
      for (const item of items) {
        results.push(await upsertArticle(item));
      }
      const upserted = results.filter((result) => result.status === 'ok').length;
      console.log(`[webhook] publish_articles: ${upserted}/${items.length} upserted`);
      return res.status(200).json({
        success: true,
        event_type: eventType,
        received: items.length,
        upserted,
        skipped: results.length - upserted,
      });
    }

    if (eventType === 'unpublish_article') {
      const externalId = toText(data.id);
      if (!externalId) {
        return res.status(400).json({ error: 'data.id is required' });
      }
      const deleted = await db
        .delete(articles)
        .where(eq(articles.externalId, externalId))
        .returning({ id: articles.id });
      console.log(`[webhook] unpublish_article: ${externalId} (${deleted.length} deleted)`);
      return res
        .status(200)
        .json({ success: true, event_type: eventType, deleted: deleted.length });
    }

    // Unknown events are acknowledged so the publisher does not keep retrying.
    return res
      .status(200)
      .json({ success: true, ignored: true, event_type: eventType ?? null });
  },
);

// Body-parser failures (malformed JSON, oversized payload) answer as JSON
// rather than falling through to the site's HTML error page.
router.use((error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ error: `Payload exceeds the ${BODY_LIMIT} limit` });
  }
  if (error?.type === 'entity.parse.failed' || error instanceof SyntaxError) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  console.error('[webhook] error:', error);
  return res.status(500).json({ error: 'Internal error' });
});
