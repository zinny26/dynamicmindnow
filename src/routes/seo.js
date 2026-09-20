import express from 'express';
import { desc, isNotNull, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { articles } from '../db/schema.js';
import { baseUrl, escapeHtml, isoDate } from '../lib/html.js';

export const router = express.Router();

// Crawlers that power AI answers. Listed explicitly so there is no doubt they
// are welcome, on top of the blanket allow for User-agent: *.
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'meta-externalagent',
  'Amazonbot',
  'Bytespider',
  'CCBot',
  'cohere-ai',
];

/** robots.txt — allows everything and points at the live sitemap. */
router.get('/robots.txt', (req, res) => {
  const site = baseUrl(req);
  const blocks = ['User-agent: *', 'Allow: /', ''];
  for (const agent of AI_CRAWLERS) {
    blocks.push(`User-agent: ${agent}`, 'Allow: /', '');
  }
  blocks.push(`Sitemap: ${site}/sitemap.xml`, '');

  res.set('Cache-Control', 'public, max-age=3600');
  res.type('text/plain').send(blocks.join('\n'));
});

/**
 * sitemap.xml — built from the articles table on every request, so a freshly
 * received article is listed immediately.
 */
router.get('/sitemap.xml', async (req, res) => {
  const site = baseUrl(req);
  const rows = await db
    .select({
      slug: articles.slug,
      updatedAt: articles.updatedAt,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .where(isNotNull(articles.slug))
    .orderBy(sql`${articles.publishedAt} DESC NULLS LAST`, desc(articles.updatedAt));

  const newest = rows
    .map((row) => row.updatedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))[0];

  const urls = [
    { loc: `${site}/`, changefreq: 'weekly', priority: '1.0' },
    {
      loc: `${site}/blog`,
      lastmod: isoDate(newest),
      changefreq: 'daily',
      priority: '0.9',
    },
    ...rows.map((row) => ({
      loc: `${site}/blog/${encodeURIComponent(row.slug)}`,
      lastmod: isoDate(row.updatedAt) || isoDate(row.publishedAt),
      changefreq: 'monthly',
      priority: '0.8',
    })),
  ];

  const body = urls
    .map((url) => {
      const parts = [`    <loc>${escapeHtml(url.loc)}</loc>`];
      if (url.lastmod) parts.push(`    <lastmod>${escapeHtml(url.lastmod)}</lastmod>`);
      if (url.changefreq) parts.push(`    <changefreq>${url.changefreq}</changefreq>`);
      if (url.priority) parts.push(`    <priority>${url.priority}</priority>`);
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    })
    .join('\n');

  res.set('Cache-Control', 'public, max-age=600');
  res.set('Content-Type', 'application/xml; charset=utf-8');
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
  );
});
