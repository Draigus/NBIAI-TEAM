import {
  pgSchema,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
  jsonb,
  date,
  bigserial,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core'

export const newsSchema = pgSchema('news')

// §5.1 news.sources
export const sources = newsSchema.table('sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  tier: text('tier').notNull(),
  feedUrl: text('feed_url').notNull(),
  feedType: text('feed_type').notNull().default('rss'),
  baseUrl: text('base_url'),
  enabled: boolean('enabled').notNull().default(true),
  priorityWeight: numeric('priority_weight').notNull().default('1.0'),
  customParserKey: text('custom_parser_key'),
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// §5.7 news.media_assets (declared before stories so hero_asset_id FK can reference it)
export const mediaAssets = newsSchema.table('media_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceUrl: text('source_url').notNull().unique(),
  hash: text('hash').notNull().unique(),
  mimeType: text('mime_type').notNull(),
  bytes: integer('bytes').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
  lastServedAt: timestamp('last_served_at', { withTimezone: true }),
  expired: boolean('expired').notNull().default(false),
})

// §5.9 news.generation_runs (declared early; digests and monthly_summaries reference it)
export const generationRuns = newsSchema.table('generation_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  runType: text('run_type').notNull(),
  digestId: uuid('digest_id'),
  monthlySummaryId: uuid('monthly_summary_id'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  llmAuthMode: text('llm_auth_mode').notNull(),
  failoverOccurred: boolean('failover_occurred').notNull().default(false),
  inputTokenCount: integer('input_token_count').notNull().default(0),
  outputTokenCount: integer('output_token_count').notNull().default(0),
  status: text('status').notNull().default('running'),
  errorMessage: text('error_message'),
}, (t) => ({
  startedAtIdx: index('generation_runs_started_at_idx').on(t.startedAt),
}))

// §5.5 news.digests
export const digests = newsSchema.table('digests', {
  id: uuid('id').primaryKey().defaultRandom(),
  digestType: text('digest_type').notNull(),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  heroStoryId: uuid('hero_story_id'),
  status: text('status').notNull().default('draft'),
  generationRunId: uuid('generation_run_id').references(() => generationRuns.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  periodStartIdx: index('digests_period_start_idx').on(t.periodStart),
}))

// §5.3 news.stories (references digests and media_assets)
export const stories = newsSchema.table('stories', {
  id: uuid('id').primaryKey().defaultRandom(),
  digestId: uuid('digest_id').notNull().references(() => digests.id),
  category: text('category').notNull(),
  isDynamicCategory: boolean('is_dynamic_category').notNull().default(false),
  dynamicCategoryLabel: text('dynamic_category_label'),
  rank: integer('rank').notNull(),
  headline: text('headline').notNull(),
  summary: text('summary').notNull(),
  heroAssetId: uuid('hero_asset_id').references(() => mediaAssets.id),
  hasVideo: boolean('has_video').notNull().default(false),
  sourceCount: integer('source_count').notNull().default(0),
  primaryEntities: jsonb('primary_entities'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // search_vector is added via 0001_search_vectors.sql (generated tsvector)
}, (t) => ({
  digestCategoryRankIdx: index('stories_digest_category_rank_idx').on(t.digestId, t.category, t.rank),
}))

// §5.2 news.articles (references sources and media_assets indirectly via og_image_hash)
export const articles = newsSchema.table('articles', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceId: uuid('source_id').notNull().references(() => sources.id),
  url: text('url').notNull(),
  canonicalUrl: text('canonical_url').notNull().unique(),
  title: text('title').notNull(),
  summary: text('summary'),
  bodyHtml: text('body_html'),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
  author: text('author'),
  ogImageUrl: text('og_image_url'),
  ogImageHash: text('og_image_hash'),
  embeddedVideoUrls: text('embedded_video_urls').array().notNull().default([]),
  language: text('language').notNull().default('en'),
  ingestedAt: timestamp('ingested_at', { withTimezone: true }).notNull().defaultNow(),
  entities: jsonb('entities'),
  // search_vector is added via 0001_search_vectors.sql (generated tsvector)
}, (t) => ({
  sourcePublishedIdx: index('articles_source_published_idx').on(t.sourceId, t.publishedAt),
}))

// §5.4 news.story_articles (composite PK)
export const storyArticles = newsSchema.table('story_articles', {
  storyId: uuid('story_id').notNull().references(() => stories.id),
  articleId: uuid('article_id').notNull().references(() => articles.id),
  isPrimarySource: boolean('is_primary_source').notNull().default(false),
}, (t) => ({
  pk: primaryKey({ columns: [t.storyId, t.articleId] }),
}))

// §5.6 news.monthly_summaries
export const monthlySummaries = newsSchema.table('monthly_summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  month: date('month').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  title: text('title').notNull(),
  bodyMarkdown: text('body_markdown').notNull(),
  featuredStoryIds: uuid('featured_story_ids').array().notNull().default([]),
  generationRunId: uuid('generation_run_id').references(() => generationRuns.id),
}, (t) => ({
  monthIdx: index('monthly_summaries_month_idx').on(t.month),
}))

// §5.8 news.feed_health (time-series, bigserial PK)
export const feedHealth = newsSchema.table('feed_health', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  sourceId: uuid('source_id').notNull().references(() => sources.id),
  attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull(),
  outcome: text('outcome').notNull(),
  httpStatus: integer('http_status'),
  errorMessage: text('error_message'),
  itemsIngested: integer('items_ingested').notNull().default(0),
  itemsNew: integer('items_new').notNull().default(0),
  durationMs: integer('duration_ms').notNull().default(0),
}, (t) => ({
  sourceAttemptedIdx: index('feed_health_source_attempted_idx').on(t.sourceId, t.attemptedAt),
}))

// §5.10 news.prompts (editable prompts with version history)
export const prompts = newsSchema.table('prompts', {
  id: uuid('id').primaryKey().defaultRandom(),
  promptKey: text('prompt_key').notNull(),
  version: integer('version').notNull(),
  body: text('body').notNull(),
  fewShotExamples: jsonb('few_shot_examples'),
  isActive: boolean('is_active').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by'),
})
