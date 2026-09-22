import {
  escapeHtml,
  formatDate,
  htmlToText,
  isoDate,
  jsonLdBody,
  truncate,
} from '../lib/html.js';
import { renderDocument } from './layout.js';

const BOOKING_URL =
  'https://calendly.com/dynamicmentalhealth/adhd-anxiety-diagnostic-evaluation';

const CTA = `
  <aside class="cta-box">
    <h2>Need answers sooner than a waitlist allows?</h2>
    <p>Licensed Psychiatric Nurse Practitioners in NY, NJ &amp; CT deliver rapid ADHD evaluations with a signed 504/IEP letter in 48 hours.</p>
    <a class="cta-btn" href="${BOOKING_URL}" target="_blank" rel="noopener">Book Evaluation</a>
  </aside>
`;

/** Best available one-line summary for an article. */
function summaryOf(article) {
  const source =
    article.metaDescription || article.subtitle || htmlToText(article.contentHtml);
  return truncate(source, 170);
}

function cardMeta(article) {
  const bits = [];
  if (article.authorName) bits.push(escapeHtml(article.authorName));
  const published = formatDate(article.publishedAt);
  if (published) {
    bits.push(`<time datetime="${escapeHtml(isoDate(article.publishedAt))}">${escapeHtml(published)}</time>`);
  }
  if (article.readTime) bits.push(escapeHtml(article.readTime));
  return bits.join('<span aria-hidden="true">•</span>');
}

/** Listing page at /blog, newest first. */
export function renderBlogIndex({ articles, canonicalUrl, siteUrl }) {
  const description =
    'Evidence-based articles on ADHD, anxiety and depression from the licensed clinicians at Dynamic Mental Health Services.';
  const title = 'Blog | Dynamic Mental Health Services';

  const cards = articles
    .map((article) => {
      const href = `/blog/${encodeURIComponent(article.slug)}`;
      const image = article.imageUrl
        ? `<a href="${escapeHtml(href)}"><img src="${escapeHtml(article.imageUrl)}" alt="${escapeHtml(article.title ?? '')}" loading="lazy" /></a>`
        : '';
      const category = article.category
        ? `<span class="pill">${escapeHtml(article.category)}</span>`
        : '';
      return `
      <article class="card">
        ${image}
        <div class="card-body">
          ${category}
          <h2><a href="${escapeHtml(href)}">${escapeHtml(article.title ?? 'Untitled')}</a></h2>
          <p>${escapeHtml(summaryOf(article))}</p>
          <div class="meta">${cardMeta(article)}</div>
        </div>
      </article>`;
    })
    .join('\n');

  const listSchema = jsonLdBody({
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Dynamic Mental Health Services Blog',
    url: canonicalUrl,
    blogPost: articles.slice(0, 50).map((article) => ({
      '@type': 'BlogPosting',
      headline: article.title ?? '',
      url: `${siteUrl}/blog/${encodeURIComponent(article.slug)}`,
      datePublished: isoDate(article.publishedAt) || undefined,
      dateModified: isoDate(article.updatedAt) || undefined,
    })),
  });

  const head = `
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />
${listSchema ? `<script type="application/ld+json">${listSchema}</script>` : ''}
`;

  const body = `
<main class="wrap wide">
  <div class="page-head">
    <h1>Mental Health Insights</h1>
    <p class="lede">${escapeHtml(description)}</p>
  </div>
  ${
    articles.length
      ? `<div class="cards">${cards}</div>`
      : '<div class="empty"><p>No articles have been published yet. Check back soon.</p></div>'
  }
  ${CTA}
</main>`;

  return renderDocument({ head, body });
}

/** Renders the FAQ block when the payload carried one. */
function renderFaqs(faqs) {
  const list = Array.isArray(faqs) ? faqs : [];
  const items = list
    .map((entry) => {
      const question = entry?.question ?? entry?.q ?? entry?.title;
      const answer = entry?.answer ?? entry?.a ?? entry?.content;
      if (!question || !answer) return '';
      return `
      <details>
        <summary>${escapeHtml(question)}</summary>
        <p>${escapeHtml(htmlToText(answer))}</p>
      </details>`;
    })
    .filter(Boolean)
    .join('\n');

  if (!items) return '';
  return `<section class="faq"><h2>Frequently asked questions</h2>${items}</section>`;
}

function renderTags(tags) {
  const list = Array.isArray(tags) ? tags : [];
  const pills = list
    .map((tag) => (typeof tag === 'string' ? tag : tag?.name))
    .filter(Boolean)
    .map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`)
    .join('');
  return pills ? `<div class="tags">${pills}</div>` : '';
}

/** Single article page at /blog/:slug. */
export function renderArticle({ article, canonicalUrl }) {
  const title = article.metaTitle || article.title || 'Article';
  const description = article.metaDescription || summaryOf(article);
  const schema = jsonLdBody(article.jsonLdSchema);

  const head = `
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
${article.imageUrl ? `<meta property="og:image" content="${escapeHtml(article.imageUrl)}" />` : ''}
<meta property="og:site_name" content="Dynamic Mental Health Services" />
${article.publishedAt ? `<meta property="article:published_time" content="${escapeHtml(isoDate(article.publishedAt))}" />` : ''}
${article.updatedAt ? `<meta property="article:modified_time" content="${escapeHtml(isoDate(article.updatedAt))}" />` : ''}
${article.authorName ? `<meta name="author" content="${escapeHtml(article.authorName)}" />` : ''}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
${article.imageUrl ? `<meta name="twitter:image" content="${escapeHtml(article.imageUrl)}" />` : ''}
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />
${schema ? `<script type="application/ld+json">${schema}</script>` : ''}
`;

  const meta = [];
  if (article.authorName) meta.push(escapeHtml(article.authorName));
  const published = formatDate(article.publishedAt);
  if (published) {
    meta.push(`<time datetime="${escapeHtml(isoDate(article.publishedAt))}">${escapeHtml(published)}</time>`);
  }
  if (article.readTime) meta.push(escapeHtml(article.readTime));
  if (article.wordCount) meta.push(`${escapeHtml(article.wordCount)} words`);

  const body = `
<main class="wrap">
  <a class="back" href="/blog">← All articles</a>
  <article>
    <header class="article-head">
      ${article.category ? `<span class="pill">${escapeHtml(article.category)}</span>` : ''}
      <h1>${escapeHtml(article.title ?? title)}</h1>
      ${article.subtitle ? `<p class="subtitle">${escapeHtml(article.subtitle)}</p>` : ''}
      <div class="meta">${meta.join('<span aria-hidden="true">•</span>')}</div>
    </header>
    ${article.imageUrl ? `<img class="hero-img" src="${escapeHtml(article.imageUrl)}" alt="${escapeHtml(article.title ?? '')}" />` : ''}
    <div class="article-body">${article.contentHtml ?? ''}</div>
    ${renderTags(article.tags)}
    ${renderFaqs(article.faqs)}
  </article>
  ${CTA}
</main>`;

  return renderDocument({ head, body, lang: article.languageCode || 'en' });
}

/** 404 body, served with an actual 404 status. */
export function renderNotFound({ canonicalUrl } = {}) {
  const head = `
<title>Page not found | Dynamic Mental Health Services</title>
<meta name="robots" content="noindex,follow" />
${canonicalUrl ? `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />` : ''}
`;
  const body = `
<main class="wrap">
  <div class="page-head">
    <h1>We couldn't find that page</h1>
    <p class="lede">The article you are looking for may have been moved or unpublished.</p>
  </div>
  <p style="margin-top:20px;"><a class="back" href="/blog">← Browse all articles</a></p>
</main>`;
  return renderDocument({ head, body });
}
