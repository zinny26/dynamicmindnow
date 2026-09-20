import {
  index,
  integer,
  json,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * Articles delivered by the external publishing service.
 *
 * `external_id` is the publisher's own id and is the key every upsert is
 * performed on, so re-sending an article updates it instead of duplicating it.
 */
export const articles = pgTable(
  'articles',
  {
    id: serial('id').primaryKey(),
    externalId: text('external_id').notNull(),
    title: text('title'),
    slug: text('slug'),
    contentHtml: text('content_html'),
    contentMarkdown: text('content_markdown'),
    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),
    subtitle: text('subtitle'),
    category: text('category'),
    authorName: text('author_name'),
    imageUrl: text('image_url'),
    readTime: text('read_time'),
    wordCount: integer('word_count'),
    tags: json('tags'),
    faqs: json('faqs'),
    jsonLdSchema: json('json_ld_schema'),
    languageCode: text('language_code'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('articles_external_id_key').on(table.externalId),
    uniqueIndex('articles_slug_key').on(table.slug),
    index('articles_published_at_idx').on(table.publishedAt),
  ],
);
