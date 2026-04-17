CREATE SCHEMA "news";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "news"."articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"url" text NOT NULL,
	"canonical_url" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"body_html" text,
	"published_at" timestamp with time zone NOT NULL,
	"author" text,
	"og_image_url" text,
	"og_image_hash" text,
	"embedded_video_urls" text[] DEFAULT '{}' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"entities" jsonb,
	CONSTRAINT "articles_canonical_url_unique" UNIQUE("canonical_url")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "news"."digests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"digest_type" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"published_at" timestamp with time zone,
	"hero_story_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"generation_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "news"."feed_health" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source_id" uuid NOT NULL,
	"attempted_at" timestamp with time zone NOT NULL,
	"outcome" text NOT NULL,
	"http_status" integer,
	"error_message" text,
	"items_ingested" integer DEFAULT 0 NOT NULL,
	"items_new" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "news"."generation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_type" text NOT NULL,
	"digest_id" uuid,
	"monthly_summary_id" uuid,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"llm_auth_mode" text NOT NULL,
	"failover_occurred" boolean DEFAULT false NOT NULL,
	"input_token_count" integer DEFAULT 0 NOT NULL,
	"output_token_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "news"."media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_url" text NOT NULL,
	"hash" text NOT NULL,
	"mime_type" text NOT NULL,
	"bytes" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"last_served_at" timestamp with time zone,
	"expired" boolean DEFAULT false NOT NULL,
	CONSTRAINT "media_assets_source_url_unique" UNIQUE("source_url"),
	CONSTRAINT "media_assets_hash_unique" UNIQUE("hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "news"."monthly_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" date NOT NULL,
	"published_at" timestamp with time zone,
	"title" text NOT NULL,
	"body_markdown" text NOT NULL,
	"featured_story_ids" uuid[] DEFAULT '{}' NOT NULL,
	"generation_run_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "news"."prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt_key" text NOT NULL,
	"version" integer NOT NULL,
	"body" text NOT NULL,
	"few_shot_examples" jsonb,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "news"."sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"tier" text NOT NULL,
	"feed_url" text NOT NULL,
	"feed_type" text DEFAULT 'rss' NOT NULL,
	"base_url" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority_weight" numeric DEFAULT '1.0' NOT NULL,
	"custom_parser_key" text,
	"last_success_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sources_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "news"."stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"digest_id" uuid NOT NULL,
	"category" text NOT NULL,
	"is_dynamic_category" boolean DEFAULT false NOT NULL,
	"dynamic_category_label" text,
	"rank" integer NOT NULL,
	"headline" text NOT NULL,
	"summary" text NOT NULL,
	"hero_asset_id" uuid,
	"has_video" boolean DEFAULT false NOT NULL,
	"source_count" integer DEFAULT 0 NOT NULL,
	"primary_entities" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "news"."story_articles" (
	"story_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"is_primary_source" boolean DEFAULT false NOT NULL,
	CONSTRAINT "story_articles_story_id_article_id_pk" PRIMARY KEY("story_id","article_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "news"."articles" ADD CONSTRAINT "articles_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "news"."sources"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "news"."digests" ADD CONSTRAINT "digests_generation_run_id_generation_runs_id_fk" FOREIGN KEY ("generation_run_id") REFERENCES "news"."generation_runs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "news"."feed_health" ADD CONSTRAINT "feed_health_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "news"."sources"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "news"."monthly_summaries" ADD CONSTRAINT "monthly_summaries_generation_run_id_generation_runs_id_fk" FOREIGN KEY ("generation_run_id") REFERENCES "news"."generation_runs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "news"."stories" ADD CONSTRAINT "stories_digest_id_digests_id_fk" FOREIGN KEY ("digest_id") REFERENCES "news"."digests"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "news"."stories" ADD CONSTRAINT "stories_hero_asset_id_media_assets_id_fk" FOREIGN KEY ("hero_asset_id") REFERENCES "news"."media_assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "news"."story_articles" ADD CONSTRAINT "story_articles_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "news"."stories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "news"."story_articles" ADD CONSTRAINT "story_articles_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "news"."articles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "articles_source_published_idx" ON "news"."articles" USING btree ("source_id","published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "digests_period_start_idx" ON "news"."digests" USING btree ("period_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feed_health_source_attempted_idx" ON "news"."feed_health" USING btree ("source_id","attempted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "generation_runs_started_at_idx" ON "news"."generation_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "monthly_summaries_month_idx" ON "news"."monthly_summaries" USING btree ("month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stories_digest_category_rank_idx" ON "news"."stories" USING btree ("digest_id","category","rank");