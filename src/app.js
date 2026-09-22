import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import express from 'express';
import { baseUrl } from './lib/html.js';
import { renderNotFound } from './views/blog.js';
import { router as blogRouter } from './routes/blog.js';
import { router as seoRouter } from './routes/seo.js';
import { router as webhookRouter } from './routes/webhook.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Builds the Express app.
 *
 * @param {object} [options]
 * @param {boolean} [options.serveStatic] Serve index.html and the other
 *   marketing pages from disk. Left off on Netlify, where those files are
 *   served by the CDN and only the dynamic routes reach the function.
 */
export function createApp({ serveStatic = true } = {}) {
  const app = express();

  // Hosting platforms terminate TLS in front of the app; trust their headers so
  // req.protocol and the canonical URLs come out as https.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // The webhook and the SEO routes are registered before any static or fallback
  // handling, so nothing else can swallow /sitemap.xml, /robots.txt or /blog.
  app.use('/api/articles-webhook', webhookRouter);
  app.use(seoRouter);
  app.use(blogRouter);

  if (serveStatic) {
    app.get('/', (_req, res) => res.sendFile(path.join(rootDir, 'index.html')));
    app.use(
      express.static(rootDir, {
        extensions: ['html'],
        index: false,
        dotfiles: 'ignore',
        maxAge: '1h',
      }),
    );
  }

  // Anything unmatched is a genuine 404 — there is no catch-all serving HTML 200s.
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res
      .status(404)
      .type('html')
      .send(renderNotFound({ canonicalUrl: `${baseUrl(req)}/blog` }));
  });

  app.use((error, req, res, _next) => {
    console.error('[server] unhandled error:', error);
    if (res.headersSent) return;
    if (req.path.startsWith('/api/')) {
      return res.status(500).json({ error: 'Internal error' });
    }
    return res.status(500).type('html').send('<h1>Something went wrong</h1>');
  });

  return app;
}

export const app = createApp();
