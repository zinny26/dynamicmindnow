import express from 'express';
import { desc, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { articles } from '../db/schema.js';
import { baseUrl } from '../lib/html.js';
import { renderArticle, renderBlogIndex, renderNotFound } from '../views/blog.js';

export const router = express.Router();

const LIST_LIMIT = 200;

/** Listing page — newest first, rendered server-side for crawlers. */
router.get('/blog', async (req, res) => {
  const site = baseUrl(req);
  const rows = await db
    .select({
      title: articles.title,
      slug: articles.slug,
      subtitle: articles.subtitle,
      metaDescription: articles.metaDescription,
      category: articles.category,
      authorName: articles.authorName,
      imageUrl: articles.imageUrl,
      readTime: articles.readTime,
      publishedAt: articles.publishedAt,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .where(isNotNull(articles.slug))
    .orderBy(sql`${articles.publishedAt} DESC NULLS LAST`, desc(articles.updatedAt))
    .limit(LIST_LIMIT);

  res.set('Cache-Control', 'public, max-age=300');
  res.type('html').send(
    renderBlogIndex({ articles: rows, canonicalUrl: `${site}/blog`, siteUrl: site }),
  );
});

/** Single article. An unknown slug answers 404, never a 200 shell. */
router.get('/blog/:slug', async (req, res) => {
  const [article] = await db
    .select()
    .from(articles)
    .where(eq(articles.slug, req.params.slug))
    .limit(1);

  if (!article) {
    return res
      .status(404)
      .type('html')
      .send(renderNotFound({ canonicalUrl: `${baseUrl(req)}/blog` }));
  }

  const canonicalUrl = `${baseUrl(req)}/blog/${encodeURIComponent(article.slug)}`;
  res.set('Cache-Control', 'public, max-age=300');
  return res.type('html').send(renderArticle({ article, canonicalUrl }));
});
