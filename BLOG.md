# Blog + article webhook

This repository used to be three static HTML pages. To receive articles from an
external publisher, store them, and render them server-side for crawlers, it now
also contains a small Node/Express server. The original pages are unchanged and
are still served at `/`, `/privacy.html` and `/terms.html`.

## Requirements

- Node 20 or newer
- A PostgreSQL database
- A host that runs a Node process (Render, Railway, Fly.io, a VPS, ...).
  Static hosting such as GitHub Pages cannot run the webhook or the
  server-rendered blog pages.

## Setup

```bash
npm install
cp .env.example .env    # then fill in the values
npm start
```

| Variable             | Required | Purpose                                                        |
| -------------------- | -------- | -------------------------------------------------------------- |
| `DATABASE_URL`       | yes      | Postgres connection string.                                     |
| `GRANDRANKER_SECRET` | yes      | Shared key the publisher sends in the `X-API-Key` header.       |
| `SITE_URL`           | yes      | Public origin, e.g. `https://adhdanxietydepressionhelp.org`. Used for canonical URLs, `og:url` and the sitemap. |
| `PORT`               | no       | Listen port. Most hosts set this for you. Defaults to `3000`.   |

`GRANDRANKER_SECRET` is only ever read from the environment — it is never
written into the code or committed.

The `articles` table and its indexes are created automatically at startup, so no
separate migration step is needed. If your Postgres provider requires TLS, add
`?sslmode=require` to `DATABASE_URL`; set `DATABASE_SSL_VERIFY=true` as well if
the provider's certificate chain is in the system trust store.

## Routes

| Route                   | Purpose                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| `GET /blog`             | Article listing, newest first, rendered server-side.              |
| `GET /blog/:slug`       | One article. Unknown slugs return HTTP **404**.                   |
| `POST /api/articles-webhook` | Receives articles. Requires the `X-API-Key` header.          |
| `GET|HEAD /api/articles-webhook` | Health check. Returns 200, no key required.             |
| `GET /sitemap.xml`      | Built from the `articles` table on every request.                 |
| `GET /robots.txt`       | Allows all crawlers (including AI crawlers) and links the sitemap.|

`/sitemap.xml` and `/robots.txt` are registered before static file handling and
there is no catch-all route, so neither can be swallowed by an HTML response.

## Webhook contract

Send `Content-Type: application/json` and `X-API-Key: <GRANDRANKER_SECRET>`.
Bodies up to **10 MB** are accepted. A wrong or missing key returns 401.

Publish or update articles — each item is upserted on `external_id`, so
re-sending an article updates it instead of creating a duplicate:

```json
{
  "event_type": "publish_articles",
  "data": {
    "articles": [
      {
        "id": "abc123",
        "title": "...",
        "slug": "...",
        "content_html": "...",
        "content_markdown": "...",
        "meta_title": "...",
        "meta_description": "...",
        "subtitle": "...",
        "category": "...",
        "author_name": "...",
        "image_url": "...",
        "read_time": "7 min read",
        "word_count": 1420,
        "tags": ["..."],
        "faqs": [{ "question": "...", "answer": "..." }],
        "json_ld_schema": { "@context": "https://schema.org" },
        "language_code": "en",
        "publish_date": "2026-03-04T09:00:00Z",
        "updated_at": "2026-03-06T12:00:00Z"
      }
    ]
  }
}
```

The item's `id` is stored as `external_id`. Any field that is not a column —
`author_initials`, `hreflang_tags` and anything added later — is ignored rather
than causing an error.

Remove an article:

```json
{ "event_type": "unpublish_article", "data": { "id": "abc123" } }
```

Responses: `200` on success, `400` for malformed JSON or a missing `data.id`,
`401` for a bad key, `413` above 10 MB. Unrecognised `event_type` values are
acknowledged with 200 so the publisher does not retry them forever.

## SEO

Each article page serves, in the initial HTML response:

- `<title>` and `<meta name="description">` from `meta_title` / `meta_description`
- `<link rel="canonical">` with the page's full URL
- `og:title`, `og:description`, `og:image`, `og:url` and Twitter card tags
- `<script type="application/ld+json">` in `<head>` when `json_ld_schema` is set

No JavaScript is required to read any of it.

## Deploying

Any Node host works. `npm start` is the entrypoint and the app listens on
`$PORT`. A `Dockerfile` is included for hosts that build from one. After
deploying, point the domain at the Node host and confirm:

```bash
curl -i https://adhdanxietydepressionhelp.org/api/articles-webhook
```

A `200` with `{"status":"ok"}` means the publisher can reach the endpoint.
