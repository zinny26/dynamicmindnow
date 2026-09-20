const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapes text for interpolation into markup or an attribute value. */
export function escapeHtml(value) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/**
 * Serialises a value for a <script type="application/ld+json"> body. `<` is
 * escaped so a `</script>` inside the data cannot close the tag early.
 */
export function jsonLdBody(value) {
  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (parsed === null || parsed === undefined) return null;
  if (typeof parsed !== 'object') return null;
  if (Array.isArray(parsed) && parsed.length === 0) return null;
  if (!Array.isArray(parsed) && Object.keys(parsed).length === 0) return null;
  return JSON.stringify(parsed).replace(/</g, '\\u003c');
}

/** The public origin of the site, used for canonical URLs and the sitemap. */
export function baseUrl(req) {
  const configured = process.env.SITE_URL;
  if (configured) return configured.replace(/\/+$/, '');
  const forwarded = req.get('x-forwarded-proto');
  const protocol = forwarded ? forwarded.split(',')[0].trim() : req.protocol;
  return `${protocol}://${req.get('host')}`;
}

/** Turns arbitrary text into a URL-safe slug. */
export function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

/** Shortens text to `limit` characters on a word boundary. */
export function truncate(value, limit = 180) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, text.lastIndexOf(' ', limit) || limit).trim()}…`;
}

/** Strips tags from stored HTML so it can be used as a plain-text summary. */
export function htmlToText(value) {
  return String(value ?? '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Human-readable date, e.g. "March 4, 2026". */
export function formatDate(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** ISO-8601 form used by <time datetime> and sitemap <lastmod>. */
export function isoDate(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}
