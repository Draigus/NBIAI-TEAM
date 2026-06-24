--
-- PostgreSQL database dump
--

\restrict hVnOuf0ANNpaPi96cccQNz7FeDlTbBZFvB0BEOD4W7LfXzyDU9I13zdDK29Ea9s

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS drizzle;


--
-- Name: news; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS news;


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: decode_html_entities(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decode_html_entities(s text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
  prev TEXT;
  curr TEXT := s;
BEGIN
  IF s IS NULL THEN RETURN NULL; END IF;
  LOOP
    prev := curr;
    curr := replace(curr, '&amp;',  '&');   -- MUST be first so &amp;#39; → &#39; → '
    curr := replace(curr, '&#39;',  '''');
    curr := replace(curr, '&quot;', '"');
    curr := replace(curr, '&gt;',   '>');
    curr := replace(curr, '&lt;',   '<');
    EXIT WHEN curr = prev;
  END LOOP;
  RETURN curr;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: -
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: -
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: -
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: articles; Type: TABLE; Schema: news; Owner: -
--

CREATE TABLE news.articles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_id uuid NOT NULL,
    url text NOT NULL,
    canonical_url text NOT NULL,
    title text NOT NULL,
    summary text,
    body_html text,
    published_at timestamp with time zone NOT NULL,
    author text,
    og_image_url text,
    og_image_hash text,
    embedded_video_urls text[] DEFAULT '{}'::text[] NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    ingested_at timestamp with time zone DEFAULT now() NOT NULL,
    entities jsonb,
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english'::regconfig, ((((COALESCE(title, ''::text) || ' '::text) || COALESCE(summary, ''::text)) || ' '::text) || COALESCE(body_html, ''::text)))) STORED
);


--
-- Name: digests; Type: TABLE; Schema: news; Owner: -
--

CREATE TABLE news.digests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    digest_type text NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    published_at timestamp with time zone,
    hero_story_id uuid,
    status text DEFAULT 'draft'::text NOT NULL,
    generation_run_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: feed_health; Type: TABLE; Schema: news; Owner: -
--

CREATE TABLE news.feed_health (
    id bigint NOT NULL,
    source_id uuid NOT NULL,
    attempted_at timestamp with time zone NOT NULL,
    outcome text NOT NULL,
    http_status integer,
    error_message text,
    items_ingested integer DEFAULT 0 NOT NULL,
    items_new integer DEFAULT 0 NOT NULL,
    duration_ms integer DEFAULT 0 NOT NULL
);


--
-- Name: feed_health_id_seq; Type: SEQUENCE; Schema: news; Owner: -
--

CREATE SEQUENCE news.feed_health_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feed_health_id_seq; Type: SEQUENCE OWNED BY; Schema: news; Owner: -
--

ALTER SEQUENCE news.feed_health_id_seq OWNED BY news.feed_health.id;


--
-- Name: generation_runs; Type: TABLE; Schema: news; Owner: -
--

CREATE TABLE news.generation_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_type text NOT NULL,
    digest_id uuid,
    monthly_summary_id uuid,
    started_at timestamp with time zone NOT NULL,
    ended_at timestamp with time zone,
    llm_auth_mode text NOT NULL,
    failover_occurred boolean DEFAULT false NOT NULL,
    input_token_count integer DEFAULT 0 NOT NULL,
    output_token_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'running'::text NOT NULL,
    error_message text
);


--
-- Name: media_assets; Type: TABLE; Schema: news; Owner: -
--

CREATE TABLE news.media_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_url text NOT NULL,
    hash text NOT NULL,
    mime_type text NOT NULL,
    bytes integer NOT NULL,
    width integer NOT NULL,
    height integer NOT NULL,
    fetched_at timestamp with time zone NOT NULL,
    last_served_at timestamp with time zone,
    expired boolean DEFAULT false NOT NULL
);


--
-- Name: monthly_summaries; Type: TABLE; Schema: news; Owner: -
--

CREATE TABLE news.monthly_summaries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    month date NOT NULL,
    published_at timestamp with time zone,
    title text NOT NULL,
    body_markdown text NOT NULL,
    featured_story_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    generation_run_id uuid
);


--
-- Name: prompts; Type: TABLE; Schema: news; Owner: -
--

CREATE TABLE news.prompts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prompt_key text NOT NULL,
    version integer NOT NULL,
    body text NOT NULL,
    few_shot_examples jsonb,
    is_active boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: sources; Type: TABLE; Schema: news; Owner: -
--

CREATE TABLE news.sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    tier text NOT NULL,
    feed_url text NOT NULL,
    feed_type text DEFAULT 'rss'::text NOT NULL,
    base_url text,
    enabled boolean DEFAULT true NOT NULL,
    priority_weight numeric DEFAULT 1.0 NOT NULL,
    custom_parser_key text,
    last_success_at timestamp with time zone,
    last_attempt_at timestamp with time zone,
    consecutive_failures integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stories; Type: TABLE; Schema: news; Owner: -
--

CREATE TABLE news.stories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    digest_id uuid NOT NULL,
    category text NOT NULL,
    is_dynamic_category boolean DEFAULT false NOT NULL,
    dynamic_category_label text,
    rank integer NOT NULL,
    headline text NOT NULL,
    summary text NOT NULL,
    hero_asset_id uuid,
    has_video boolean DEFAULT false NOT NULL,
    source_count integer DEFAULT 0 NOT NULL,
    primary_entities jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english'::regconfig, ((COALESCE(headline, ''::text) || ' '::text) || COALESCE(summary, ''::text)))) STORED
);


--
-- Name: story_articles; Type: TABLE; Schema: news; Owner: -
--

CREATE TABLE news.story_articles (
    story_id uuid NOT NULL,
    article_id uuid NOT NULL,
    is_primary_source boolean DEFAULT false NOT NULL
);


--
-- Name: attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    filename text,
    original_name text,
    size_bytes bigint DEFAULT 0,
    mime_type text DEFAULT ''::text,
    uploaded_by text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now(),
    link_url text,
    link_title text
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    action text NOT NULL,
    changed_by text DEFAULT 'Glen'::text,
    changes jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: bug_report_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bug_report_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    author text NOT NULL,
    text text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: bug_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bug_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text DEFAULT 'bug'::text NOT NULL,
    title text NOT NULL,
    description text,
    page text,
    screenshot text,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    priority text,
    updated_at timestamp with time zone DEFAULT now(),
    "position" integer DEFAULT 0 NOT NULL,
    source text DEFAULT 'internal'::text,
    reporter_client_id uuid
);


--
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    title text NOT NULL,
    event_type text NOT NULL,
    start_date date NOT NULL,
    end_date date,
    client_id uuid,
    visibility text DEFAULT 'team'::text,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    team_id uuid
);


--
-- Name: candidate_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidate_activity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    candidate_id uuid NOT NULL,
    event_type text NOT NULL,
    detail text,
    actor text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: candidate_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidate_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    candidate_id uuid NOT NULL,
    author text NOT NULL,
    author_user_id uuid,
    body text NOT NULL,
    internal boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: candidate_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidate_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    candidate_id uuid NOT NULL,
    file_type text NOT NULL,
    title text NOT NULL,
    filename text,
    stored_name text,
    mime_type text,
    size_bytes integer,
    url text,
    uploaded_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT candidate_files_file_type_check CHECK ((file_type = ANY (ARRAY['upload'::text, 'url'::text])))
);


--
-- Name: candidate_stage_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidate_stage_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    candidate_id uuid NOT NULL,
    from_stage text,
    to_stage text NOT NULL,
    moved_by text NOT NULL,
    moved_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text
);


--
-- Name: candidates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    position_id uuid,
    client_id uuid,
    name text NOT NULL,
    role text,
    linkedin_url text,
    cv_filename text,
    due_date date,
    stage text DEFAULT 'sourcing'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    "position" integer DEFAULT 0 NOT NULL,
    stage_assignees jsonb DEFAULT '{}'::jsonb,
    start_date date,
    onboarding_links jsonb DEFAULT '[]'::jsonb,
    archived_at timestamp with time zone,
    email text,
    source text,
    source_detail text,
    tags jsonb DEFAULT '[]'::jsonb,
    consent_given boolean DEFAULT false,
    consent_date timestamp with time zone,
    retention_expires_at timestamp with time zone,
    rejection_reason text,
    rejection_category text,
    stage_changed_at timestamp with time zone DEFAULT now(),
    contract_status text
);


--
-- Name: cc_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cc_snapshots (
    id integer NOT NULL,
    snapshot_date date NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cc_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cc_snapshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cc_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cc_snapshots_id_seq OWNED BY public.cc_snapshots.id;


--
-- Name: client_activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    action text NOT NULL,
    target_type text,
    target_id uuid,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: client_nbi_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_nbi_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: client_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    title text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    source text DEFAULT 'manual'::text,
    source_id text DEFAULT ''::text,
    source_url text DEFAULT ''::text,
    meeting_date timestamp with time zone,
    author text DEFAULT 'Glen'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: client_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    client_name text NOT NULL,
    share_token text NOT NULL,
    report_data jsonb NOT NULL,
    generated_by text DEFAULT ''::text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text,
    founded text DEFAULT ''::text,
    headquarters text DEFAULT ''::text,
    employees text DEFAULT ''::text,
    revenue text DEFAULT ''::text,
    website text DEFAULT ''::text,
    linkedin_company text DEFAULT ''::text,
    nbi_relationship text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    sector text,
    studio_size integer,
    contract_value numeric(12,2),
    current_studio_project text,
    research_data jsonb,
    research_updated_at timestamp with time zone,
    practice_area text,
    abbreviation text,
    doc_default_view boolean DEFAULT true NOT NULL,
    doc_default_edit boolean DEFAULT false NOT NULL,
    doc_default_create boolean DEFAULT false NOT NULL,
    doc_default_upload boolean DEFAULT false NOT NULL,
    always_visible boolean DEFAULT false NOT NULL,
    hiring_stages jsonb
);


--
-- Name: contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    name text NOT NULL,
    role text DEFAULT ''::text,
    notes text DEFAULT ''::text,
    background text DEFAULT ''::text,
    linkedin text DEFAULT ''::text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    email text DEFAULT ''::text,
    phone text DEFAULT ''::text
);


--
-- Name: dashboard_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dashboard_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    snapshot_date date NOT NULL,
    active_projects integer DEFAULT 0 NOT NULL,
    overdue_count integer DEFAULT 0 NOT NULL,
    blocked_count integer DEFAULT 0 NOT NULL,
    at_risk_count integer DEFAULT 0 NOT NULL,
    hours_spent numeric(10,1) DEFAULT 0 NOT NULL,
    hours_estimated numeric(10,1) DEFAULT 0 NOT NULL,
    tasks_planned integer DEFAULT 0 NOT NULL,
    tasks_added integer DEFAULT 0 NOT NULL,
    tasks_completed integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    on_track_count integer DEFAULT 0 NOT NULL,
    active_leads_count integer DEFAULT 0 NOT NULL
);


--
-- Name: document_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    filename text NOT NULL,
    stored_name text NOT NULL,
    mime_type text NOT NULL,
    size_bytes integer NOT NULL,
    uploaded_by text NOT NULL,
    orphaned_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    parent_id uuid,
    task_id uuid,
    title text DEFAULT 'Untitled'::text NOT NULL,
    body_json jsonb DEFAULT '{"type": "doc", "content": []}'::jsonb NOT NULL,
    body_text text DEFAULT ''::text NOT NULL,
    body_version integer DEFAULT 1 NOT NULL,
    visibility text DEFAULT 'all'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_by text NOT NULL,
    updated_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    hidden boolean DEFAULT false NOT NULL,
    candidate_id uuid,
    CONSTRAINT documents_visibility_check CHECK ((visibility = ANY (ARRAY['all'::text, 'nbi_only'::text])))
);


--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: expense_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expense_id uuid NOT NULL,
    filename text NOT NULL,
    original_name text NOT NULL,
    size_bytes integer,
    mime_type text,
    uploaded_by text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: expense_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    submitted_at timestamp with time zone,
    reviewed_by text,
    reviewed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    review_notes text
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'GBP'::text NOT NULL,
    category_id uuid,
    description text,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by text,
    reviewed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    report_id uuid,
    vat_amount numeric(12,2)
);


--
-- Name: finance_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finance_data (
    id integer NOT NULL,
    data jsonb NOT NULL,
    updated_by text DEFAULT 'system'::text,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: finance_data_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.finance_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: finance_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.finance_data_id_seq OWNED BY public.finance_data.id;


--
-- Name: finance_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finance_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    amount numeric(12,2) NOT NULL,
    category text DEFAULT 'expense'::text NOT NULL,
    type text DEFAULT 'one-off'::text NOT NULL,
    tag text,
    entry_date date,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hiring_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hiring_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    candidate_id uuid NOT NULL,
    decision text NOT NULL,
    rejection_category text,
    decided_by uuid,
    notes text NOT NULL,
    decided_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT hiring_decisions_decision_check CHECK ((decision = ANY (ARRAY['advance'::text, 'hold'::text, 'reject'::text])))
);


--
-- Name: hiring_email_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hiring_email_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    name text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    trigger_stage text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hiring_positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hiring_positions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    sow_id uuid,
    title text NOT NULL,
    description text,
    seniority text,
    status text DEFAULT 'open'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    salary_range text,
    employment_type text DEFAULT 'permanent'::text,
    location text,
    interview_panel jsonb DEFAULT '[]'::jsonb,
    jd_filename text,
    jd_original_name text,
    scorecard_criteria jsonb,
    onboarding_template jsonb,
    discipline text,
    closed_reason text,
    filled_by_candidate_id uuid,
    closed_at timestamp with time zone,
    CONSTRAINT hiring_positions_closed_reason_check CHECK ((closed_reason = ANY (ARRAY['filled'::text, 'shut_down'::text])))
);


--
-- Name: interview_config_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interview_config_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_id uuid NOT NULL,
    question_id uuid,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: interview_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interview_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    candidate_id uuid NOT NULL,
    position_id uuid,
    created_by uuid,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    round_type text NOT NULL,
    round_type_custom text,
    round_number integer,
    scheduled_at timestamp with time zone,
    duration_minutes integer,
    location text,
    interviewer_name text,
    outcome text,
    outcome_notes text,
    from_template boolean DEFAULT false NOT NULL,
    CONSTRAINT chk_ic_duration_minutes CHECK (((duration_minutes >= 5) AND (duration_minutes <= 480))),
    CONSTRAINT chk_ic_outcome CHECK ((outcome = ANY (ARRAY['passed'::text, 'failed'::text, 'pending'::text, 'cancelled'::text, 'rescheduled'::text, 'no_show'::text]))),
    CONSTRAINT chk_ic_round_type CHECK ((round_type = ANY (ARRAY['Phone Screen'::text, 'Technical'::text, 'Cultural'::text, 'Final'::text, 'Other'::text]))),
    CONSTRAINT interview_configs_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'completed'::text])))
);


--
-- Name: interview_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interview_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_id uuid NOT NULL,
    decision text NOT NULL,
    decided_by uuid,
    notes text NOT NULL,
    decided_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT interview_decisions_decision_check CHECK ((decision = ANY (ARRAY['advance'::text, 'reject'::text, 'hold'::text])))
);


--
-- Name: interview_question_bank; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interview_question_bank (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    discipline text NOT NULL,
    category text NOT NULL,
    question_text text NOT NULL,
    depth_type text,
    source text DEFAULT 'custom'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    position_titles text[] DEFAULT '{}'::text[],
    CONSTRAINT interview_question_bank_category_check CHECK ((category = ANY (ARRAY['culture'::text, 'technical'::text, 'collaboration'::text, 'leadership'::text, 'depth'::text]))),
    CONSTRAINT interview_question_bank_depth_type_check CHECK ((depth_type = ANY (ARRAY['code'::text, 'art_style'::text, 'narrative'::text, NULL::text]))),
    CONSTRAINT interview_question_bank_source_check CHECK ((source = ANY (ARRAY['ai_generated'::text, 'custom'::text, 'curated'::text])))
);


--
-- Name: interview_rounds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interview_rounds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    candidate_id uuid NOT NULL,
    round_number integer DEFAULT 1 NOT NULL,
    title text NOT NULL,
    scheduled_at timestamp with time zone,
    duration_minutes integer,
    location text,
    status text DEFAULT 'scheduled'::text NOT NULL,
    outcome text,
    outcome_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: interview_scorecards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interview_scorecards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    round_id uuid NOT NULL,
    interviewer_name text NOT NULL,
    interviewer_user_id uuid,
    overall_rating integer,
    recommendation text,
    strengths text,
    concerns text,
    criteria jsonb DEFAULT '[]'::jsonb,
    submitted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT interview_scorecards_overall_rating_check CHECK (((overall_rating >= 1) AND (overall_rating <= 5)))
);


--
-- Name: interview_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interview_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    question_id uuid,
    score integer NOT NULL,
    notes text,
    scored_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT interview_scores_score_check CHECK (((score >= 1) AND (score <= 5)))
);


--
-- Name: interview_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interview_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_id uuid NOT NULL,
    interviewer_id uuid NOT NULL,
    status text DEFAULT 'assigned'::text NOT NULL,
    notified_at timestamp with time zone,
    started_at timestamp with time zone,
    submitted_at timestamp with time zone,
    CONSTRAINT interview_sessions_status_check CHECK ((status = ANY (ARRAY['assigned'::text, 'in_progress'::text, 'submitted'::text, 'declined'::text])))
);


--
-- Name: lead_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    activity_type text NOT NULL,
    description text,
    performed_by text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: lead_field_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_field_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    field_name text NOT NULL,
    value text NOT NULL,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: lead_pipeline_stages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_pipeline_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    colour text DEFAULT '#666666'::text,
    is_closed boolean DEFAULT false,
    is_won boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: lead_resource_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_resource_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: lead_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    resource_type_id uuid NOT NULL,
    quantity integer DEFAULT 1,
    notes text
);


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    title text NOT NULL,
    work_type text,
    service_line text,
    stage_id uuid NOT NULL,
    priority integer,
    currency text DEFAULT 'GBP'::text NOT NULL,
    rom_min numeric,
    rom_max numeric,
    rom_text text,
    win_probability integer,
    primary_contact_id uuid,
    deal_owner text,
    lead_source text,
    est_start_date date,
    expected_close_date date,
    last_contacted date,
    next_followup_date date,
    next_action text,
    location text,
    notes text,
    time_estimate text,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    weighted_value numeric GENERATED ALWAYS AS (((COALESCE(rom_max, rom_min, (0)::numeric) * (COALESCE(win_probability, 0))::numeric) / (100)::numeric)) STORED,
    completed_at timestamp with time zone,
    practice_area text,
    "position" integer DEFAULT 0 NOT NULL,
    sow_id uuid,
    CONSTRAINT leads_win_probability_range CHECK (((win_probability IS NULL) OR ((win_probability >= 0) AND (win_probability <= 100))))
);


--
-- Name: login_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_attempts (
    username text NOT NULL,
    fail_count integer DEFAULT 0 NOT NULL,
    last_attempt timestamp with time zone DEFAULT now() NOT NULL,
    locked_until timestamp with time zone
);


--
-- Name: meeting_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meeting_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id text NOT NULL,
    section text NOT NULL,
    data jsonb NOT NULL,
    source text DEFAULT 'compiled'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT meeting_items_section_check CHECK ((section = ANY (ARRAY['actions'::text, 'decisions'::text, 'people'::text, 'learnings'::text, 'numbers'::text, 'timeline'::text, 'threads'::text, 'meetings'::text])))
);


--
-- Name: meeting_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meeting_metadata (
    id integer DEFAULT 1 NOT NULL,
    meeting_count integer DEFAULT 0 NOT NULL,
    date_range_start text,
    date_range_end text,
    compiled_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT meeting_metadata_id_check CHECK ((id = 1))
);


--
-- Name: milestone_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.milestone_items (
    milestone_id uuid NOT NULL,
    task_id uuid NOT NULL
);


--
-- Name: milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text,
    target_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    username text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text DEFAULT ''::text,
    link text DEFAULT ''::text,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    dismissable boolean DEFAULT true
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: onboarding_checklist_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_checklist_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    candidate_id uuid NOT NULL,
    title text NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    completed_by text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: position_question_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.position_question_templates (
    position_id uuid NOT NULL,
    question_id uuid NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    added_by uuid,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version integer NOT NULL,
    name text NOT NULL,
    applied_at timestamp with time zone DEFAULT now()
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: sows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    title text NOT NULL,
    start_date date,
    end_date date,
    status text DEFAULT 'active'::text,
    work_package_text text,
    extraction_stats jsonb,
    uploaded_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_attachments (
    id integer NOT NULL,
    task_id uuid NOT NULL,
    filename text NOT NULL,
    original_name text NOT NULL,
    size_bytes integer DEFAULT 0,
    mime_type text DEFAULT ''::text,
    uploaded_by text DEFAULT 'unknown'::text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: task_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_attachments_id_seq OWNED BY public.task_attachments.id;


--
-- Name: task_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_comments (
    id integer NOT NULL,
    task_id uuid NOT NULL,
    author text NOT NULL,
    text text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: task_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_comments_id_seq OWNED BY public.task_comments.id;


--
-- Name: task_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    text text NOT NULL,
    author text DEFAULT 'Glen'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    submitted_by text NOT NULL,
    slack_user_id text,
    slack_channel text,
    slack_message_ts text,
    created_at timestamp with time zone DEFAULT now(),
    client_id uuid,
    assignee text,
    item_type text DEFAULT 'task'::text
);


--
-- Name: task_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_templates (
    id integer NOT NULL,
    name text NOT NULL,
    template jsonb NOT NULL,
    recurrence text DEFAULT ''::text,
    last_created_at timestamp without time zone,
    created_by text DEFAULT 'system'::text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: task_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_templates_id_seq OWNED BY public.task_templates.id;


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    parent_id uuid,
    client_id uuid,
    status text DEFAULT 'Not started'::text NOT NULL,
    priority text DEFAULT ''::text,
    health_state text DEFAULT ''::text,
    description text DEFAULT ''::text,
    assignees text[] DEFAULT '{}'::text[],
    hours_estimated real DEFAULT 0,
    hours_spent real DEFAULT 0,
    due_date text DEFAULT ''::text,
    planner_task_id text DEFAULT ''::text,
    source text DEFAULT 'manual'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    start_date text DEFAULT ''::text,
    end_date text DEFAULT ''::text,
    dependencies text[] DEFAULT '{}'::text[],
    item_type text DEFAULT 'task'::text NOT NULL,
    sow_id uuid,
    repeat_rule jsonb,
    collaborations text,
    success_factor text,
    blocker_info jsonb,
    practice_area text,
    "position" integer DEFAULT 0 NOT NULL,
    work_type text,
    risks text DEFAULT ''::text,
    mitigations text DEFAULT ''::text,
    documentation_link text DEFAULT ''::text,
    sort_order integer DEFAULT 0 NOT NULL,
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    client_id uuid,
    sow_id uuid,
    colour text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: time_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_entries (
    id integer NOT NULL,
    task_id uuid NOT NULL,
    user_name text NOT NULL,
    description text DEFAULT ''::text,
    hours numeric(6,2) NOT NULL,
    date text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: time_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.time_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: time_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.time_entries_id_seq OWNED BY public.time_entries.id;


--
-- Name: time_off; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_off (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    label text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    display_name text NOT NULL,
    email text,
    password_hash text NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    capacity_hours_per_week real DEFAULT 40,
    resource_type_ids uuid[] DEFAULT '{}'::uuid[],
    is_active boolean DEFAULT true,
    client_id uuid,
    client_role text,
    must_change_password boolean DEFAULT false,
    docs_view boolean DEFAULT true NOT NULL,
    docs_edit boolean DEFAULT true NOT NULL,
    docs_create boolean DEFAULT true NOT NULL,
    docs_upload boolean DEFAULT true NOT NULL,
    can_submit_queue boolean DEFAULT false,
    CONSTRAINT chk_client_role_requires_client CHECK (((client_role IS NULL) OR (client_id IS NOT NULL)))
);


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: feed_health id; Type: DEFAULT; Schema: news; Owner: -
--

ALTER TABLE ONLY news.feed_health ALTER COLUMN id SET DEFAULT nextval('news.feed_health_id_seq'::regclass);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: cc_snapshots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cc_snapshots ALTER COLUMN id SET DEFAULT nextval('public.cc_snapshots_id_seq'::regclass);


--
-- Name: finance_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_data ALTER COLUMN id SET DEFAULT nextval('public.finance_data_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: task_attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments ALTER COLUMN id SET DEFAULT nextval('public.task_attachments_id_seq'::regclass);


--
-- Name: task_comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments ALTER COLUMN id SET DEFAULT nextval('public.task_comments_id_seq'::regclass);


--
-- Name: task_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_templates ALTER COLUMN id SET DEFAULT nextval('public.task_templates_id_seq'::regclass);


--
-- Name: time_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries ALTER COLUMN id SET DEFAULT nextval('public.time_entries_id_seq'::regclass);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: articles articles_canonical_url_unique; Type: CONSTRAINT; Schema: news; Owner: -
--

ALTER TABLE ONLY news.articles
    ADD CONSTRAINT articles_canonical_url_unique UNIQUE (canonical_url);


--
-- Name: articles articles_pkey; Type: CONSTRAINT; Schema: news; Owner: -
--

ALTER TABLE ONLY news.articles
    ADD CONSTRAINT articles_pkey PRIMARY KEY (id);


--
-- Name: digests digests_pkey; Type: CONSTRAINT; Schema: news; Owner: -
--

ALTER TABLE ONLY news.digests
    ADD CONSTRAINT digests_pkey PRIMARY KEY (id);


--
-- Name: feed_health feed_health_pkey; Type: CONSTRAINT; Schema: news; Owner: -
--

ALTER TABLE ONLY news.feed_health
    ADD CONSTRAINT feed_health_pkey PRIMARY KEY (id);


--
-- Name: generation_runs generation_runs_pkey; Type: CONSTRAINT; Schema: news; Owner: -
--

ALTER TABLE ONLY news.generation_runs
    ADD CONSTRAINT generation_runs_pkey PRIMARY KEY (id);


--
-- Name: media_assets media_assets_hash_unique; Type: CONSTRAINT; Schema: news; Owner: -
--

ALTER TABLE ONLY news.media_assets
    ADD CONSTRAINT media_assets_hash_unique UNIQUE (hash);


--
-- Name: media_assets media_assets_pkey; Type: CONSTRAINT; Schema: news; Owner: -
--

ALTER TABLE ONLY news.media_assets
    ADD CONSTRAINT media_assets_pkey PRIMARY KEY (id);


--
-- Name: media_assets media_assets_source_url_unique; Type: CONSTRAINT; Schema: news; Owner: -
--

ALTER TABLE ONLY news.media_assets
    ADD CONSTRAINT media_assets_source_url_unique UNIQUE (source_url);


--
-- Name: monthly_summaries monthly_summaries_pkey; Type: CONSTRAINT; Schema: news; Owner: -
--

ALTER TABLE ONLY news.monthly_summaries
    ADD CONSTRAINT monthly_summaries_pkey PRIMARY KEY (id);


--
-- Name: prompts prompts_pkey; Type: CONSTRAINT; Schema: news; Owner: -
--

ALTER TABLE ONLY news.prompts
    ADD CONSTRAINT prompts_pkey PRIMARY KEY (id);


--
-- Name: sources sources_pkey; Type: CONSTRAINT; Schema: news; Owner: -
--

ALTER TABLE ONLY news.sources
    ADD CONSTRAINT sources_pkey PRIMARY KEY (id);


--
-- Name: sources sources_slug_unique; Type: CONSTRAINT; Schema: news; Owner: -
--

ALTER TABLE ONLY news.sources
    ADD CONSTRAINT sources_slug_unique UNIQUE (slug);


--
-- Name: stories stories_pkey; Type: CONSTRAINT; Schema: news; Owner: -
--

ALTER TABLE ONLY news.stories
    ADD CONSTRAINT stories_pkey PRIMARY KEY (id);


--
-- Name: story_articles story_articles_story_id_article_id_pk; Type: CONSTRAINT; Schema: news; Owner: -
--

ALTER TABLE ONLY news.story_articles
    ADD CONSTRAINT story_articles_story_id_article_id_pk PRIMARY KEY (story_id, article_id);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: bug_report_comments bug_report_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bug_report_comments
    ADD CONSTRAINT bug_report_comments_pkey PRIMARY KEY (id);


--
-- Name: bug_reports bug_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bug_reports
    ADD CONSTRAINT bug_reports_pkey PRIMARY KEY (id);


--
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- Name: candidate_activity candidate_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_activity
    ADD CONSTRAINT candidate_activity_pkey PRIMARY KEY (id);


--
-- Name: candidate_comments candidate_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_comments
    ADD CONSTRAINT candidate_comments_pkey PRIMARY KEY (id);


--
-- Name: candidate_files candidate_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_files
    ADD CONSTRAINT candidate_files_pkey PRIMARY KEY (id);


--
-- Name: candidate_stage_history candidate_stage_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_stage_history
    ADD CONSTRAINT candidate_stage_history_pkey PRIMARY KEY (id);


--
-- Name: candidates candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_pkey PRIMARY KEY (id);


--
-- Name: cc_snapshots cc_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cc_snapshots
    ADD CONSTRAINT cc_snapshots_pkey PRIMARY KEY (id);


--
-- Name: cc_snapshots cc_snapshots_snapshot_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cc_snapshots
    ADD CONSTRAINT cc_snapshots_snapshot_date_key UNIQUE (snapshot_date);


--
-- Name: client_activity_log client_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_activity_log
    ADD CONSTRAINT client_activity_log_pkey PRIMARY KEY (id);


--
-- Name: client_nbi_contacts client_nbi_contacts_client_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_nbi_contacts
    ADD CONSTRAINT client_nbi_contacts_client_id_user_id_key UNIQUE (client_id, user_id);


--
-- Name: client_nbi_contacts client_nbi_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_nbi_contacts
    ADD CONSTRAINT client_nbi_contacts_pkey PRIMARY KEY (id);


--
-- Name: client_notes client_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_notes
    ADD CONSTRAINT client_notes_pkey PRIMARY KEY (id);


--
-- Name: client_reports client_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_reports
    ADD CONSTRAINT client_reports_pkey PRIMARY KEY (id);


--
-- Name: client_reports client_reports_share_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_reports
    ADD CONSTRAINT client_reports_share_token_key UNIQUE (share_token);


--
-- Name: clients clients_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_name_key UNIQUE (name);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: dashboard_snapshots dashboard_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_snapshots
    ADD CONSTRAINT dashboard_snapshots_pkey PRIMARY KEY (id);


--
-- Name: dashboard_snapshots dashboard_snapshots_snapshot_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_snapshots
    ADD CONSTRAINT dashboard_snapshots_snapshot_date_key UNIQUE (snapshot_date);


--
-- Name: document_attachments document_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_attachments
    ADD CONSTRAINT document_attachments_pkey PRIMARY KEY (id);


--
-- Name: document_attachments document_attachments_stored_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_attachments
    ADD CONSTRAINT document_attachments_stored_name_key UNIQUE (stored_name);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_name_key UNIQUE (name);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: expense_receipts expense_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_receipts
    ADD CONSTRAINT expense_receipts_pkey PRIMARY KEY (id);


--
-- Name: expense_reports expense_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_reports
    ADD CONSTRAINT expense_reports_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: finance_data finance_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_data
    ADD CONSTRAINT finance_data_pkey PRIMARY KEY (id);


--
-- Name: finance_entries finance_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_entries
    ADD CONSTRAINT finance_entries_pkey PRIMARY KEY (id);


--
-- Name: hiring_decisions hiring_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hiring_decisions
    ADD CONSTRAINT hiring_decisions_pkey PRIMARY KEY (id);


--
-- Name: hiring_email_templates hiring_email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hiring_email_templates
    ADD CONSTRAINT hiring_email_templates_pkey PRIMARY KEY (id);


--
-- Name: hiring_positions hiring_positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hiring_positions
    ADD CONSTRAINT hiring_positions_pkey PRIMARY KEY (id);


--
-- Name: interview_config_questions interview_config_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_config_questions
    ADD CONSTRAINT interview_config_questions_pkey PRIMARY KEY (id);


--
-- Name: interview_configs interview_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_configs
    ADD CONSTRAINT interview_configs_pkey PRIMARY KEY (id);


--
-- Name: interview_decisions interview_decisions_config_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_decisions
    ADD CONSTRAINT interview_decisions_config_id_key UNIQUE (config_id);


--
-- Name: interview_decisions interview_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_decisions
    ADD CONSTRAINT interview_decisions_pkey PRIMARY KEY (id);


--
-- Name: interview_question_bank interview_question_bank_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_question_bank
    ADD CONSTRAINT interview_question_bank_pkey PRIMARY KEY (id);


--
-- Name: interview_rounds interview_rounds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_rounds
    ADD CONSTRAINT interview_rounds_pkey PRIMARY KEY (id);


--
-- Name: interview_scorecards interview_scorecards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_scorecards
    ADD CONSTRAINT interview_scorecards_pkey PRIMARY KEY (id);


--
-- Name: interview_scores interview_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_scores
    ADD CONSTRAINT interview_scores_pkey PRIMARY KEY (id);


--
-- Name: interview_scores interview_scores_session_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_scores
    ADD CONSTRAINT interview_scores_session_id_question_id_key UNIQUE (session_id, question_id);


--
-- Name: interview_sessions interview_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_sessions
    ADD CONSTRAINT interview_sessions_pkey PRIMARY KEY (id);


--
-- Name: lead_activities lead_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_activities
    ADD CONSTRAINT lead_activities_pkey PRIMARY KEY (id);


--
-- Name: lead_field_options lead_field_options_field_name_value_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_field_options
    ADD CONSTRAINT lead_field_options_field_name_value_key UNIQUE (field_name, value);


--
-- Name: lead_field_options lead_field_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_field_options
    ADD CONSTRAINT lead_field_options_pkey PRIMARY KEY (id);


--
-- Name: lead_pipeline_stages lead_pipeline_stages_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_pipeline_stages
    ADD CONSTRAINT lead_pipeline_stages_name_key UNIQUE (name);


--
-- Name: lead_pipeline_stages lead_pipeline_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_pipeline_stages
    ADD CONSTRAINT lead_pipeline_stages_pkey PRIMARY KEY (id);


--
-- Name: lead_resource_types lead_resource_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_resource_types
    ADD CONSTRAINT lead_resource_types_name_key UNIQUE (name);


--
-- Name: lead_resource_types lead_resource_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_resource_types
    ADD CONSTRAINT lead_resource_types_pkey PRIMARY KEY (id);


--
-- Name: lead_resources lead_resources_lead_id_resource_type_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_resources
    ADD CONSTRAINT lead_resources_lead_id_resource_type_id_key UNIQUE (lead_id, resource_type_id);


--
-- Name: lead_resources lead_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_resources
    ADD CONSTRAINT lead_resources_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (username);


--
-- Name: meeting_items meeting_items_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_items
    ADD CONSTRAINT meeting_items_item_id_key UNIQUE (item_id);


--
-- Name: meeting_items meeting_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_items
    ADD CONSTRAINT meeting_items_pkey PRIMARY KEY (id);


--
-- Name: meeting_metadata meeting_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_metadata
    ADD CONSTRAINT meeting_metadata_pkey PRIMARY KEY (id);


--
-- Name: milestone_items milestone_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_items
    ADD CONSTRAINT milestone_items_pkey PRIMARY KEY (milestone_id, task_id);


--
-- Name: milestones milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: onboarding_checklist_items onboarding_checklist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_checklist_items
    ADD CONSTRAINT onboarding_checklist_items_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: position_question_templates position_question_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.position_question_templates
    ADD CONSTRAINT position_question_templates_pkey PRIMARY KEY (position_id, question_id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_key UNIQUE (token);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: sows sows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sows
    ADD CONSTRAINT sows_pkey PRIMARY KEY (id);


--
-- Name: task_attachments task_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_pkey PRIMARY KEY (id);


--
-- Name: task_comments task_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_pkey PRIMARY KEY (id);


--
-- Name: task_notes task_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_notes
    ADD CONSTRAINT task_notes_pkey PRIMARY KEY (id);


--
-- Name: task_queue task_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_queue
    ADD CONSTRAINT task_queue_pkey PRIMARY KEY (id);


--
-- Name: task_templates task_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_templates
    ADD CONSTRAINT task_templates_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_team_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_user_id_key UNIQUE (team_id, user_id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: time_entries time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_pkey PRIMARY KEY (id);


--
-- Name: time_off time_off_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_off
    ADD CONSTRAINT time_off_pkey PRIMARY KEY (id);


--
-- Name: interview_configs uq_ic_candidate_round; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_configs
    ADD CONSTRAINT uq_ic_candidate_round UNIQUE (candidate_id, round_number);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: articles_search_idx; Type: INDEX; Schema: news; Owner: -
--

CREATE INDEX articles_search_idx ON news.articles USING gin (search_vector);


--
-- Name: articles_source_published_idx; Type: INDEX; Schema: news; Owner: -
--

CREATE INDEX articles_source_published_idx ON news.articles USING btree (source_id, published_at);


--
-- Name: digests_period_start_idx; Type: INDEX; Schema: news; Owner: -
--

CREATE INDEX digests_period_start_idx ON news.digests USING btree (period_start);


--
-- Name: feed_health_source_attempted_idx; Type: INDEX; Schema: news; Owner: -
--

CREATE INDEX feed_health_source_attempted_idx ON news.feed_health USING btree (source_id, attempted_at);


--
-- Name: generation_runs_started_at_idx; Type: INDEX; Schema: news; Owner: -
--

CREATE INDEX generation_runs_started_at_idx ON news.generation_runs USING btree (started_at);


--
-- Name: monthly_summaries_month_idx; Type: INDEX; Schema: news; Owner: -
--

CREATE INDEX monthly_summaries_month_idx ON news.monthly_summaries USING btree (month);


--
-- Name: stories_digest_category_rank_idx; Type: INDEX; Schema: news; Owner: -
--

CREATE INDEX stories_digest_category_rank_idx ON news.stories USING btree (digest_id, category, rank);


--
-- Name: stories_search_idx; Type: INDEX; Schema: news; Owner: -
--

CREATE INDEX stories_search_idx ON news.stories USING gin (search_vector);


--
-- Name: idx_attachments_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attachments_entity ON public.attachments USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: idx_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_created ON public.audit_log USING btree (created_at DESC);


--
-- Name: idx_audit_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_entity ON public.audit_log USING btree (entity_type, entity_id);


--
-- Name: idx_audit_log_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_entity ON public.audit_log USING btree (entity_type, entity_id);


--
-- Name: idx_audit_log_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_time ON public.audit_log USING btree (created_at DESC);


--
-- Name: idx_bug_report_comments_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bug_report_comments_report ON public.bug_report_comments USING btree (report_id);


--
-- Name: idx_bug_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bug_reports_status ON public.bug_reports USING btree (status);


--
-- Name: idx_bug_reports_status_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bug_reports_status_position ON public.bug_reports USING btree (status, "position");


--
-- Name: idx_bug_reports_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bug_reports_user ON public.bug_reports USING btree (user_id);


--
-- Name: idx_calendar_events_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_events_client ON public.calendar_events USING btree (client_id);


--
-- Name: idx_calendar_events_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_events_dates ON public.calendar_events USING btree (start_date, end_date);


--
-- Name: idx_calendar_events_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_events_team ON public.calendar_events USING btree (team_id);


--
-- Name: idx_calendar_events_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_events_user ON public.calendar_events USING btree (user_id);


--
-- Name: idx_candidate_activity_candidate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_activity_candidate ON public.candidate_activity USING btree (candidate_id);


--
-- Name: idx_candidate_activity_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_activity_created ON public.candidate_activity USING btree (created_at);


--
-- Name: idx_candidate_files_candidate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_files_candidate ON public.candidate_files USING btree (candidate_id);


--
-- Name: idx_candidates_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidates_client_id ON public.candidates USING btree (client_id);


--
-- Name: idx_candidates_position_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidates_position_id ON public.candidates USING btree (position_id);


--
-- Name: idx_candidates_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidates_stage ON public.candidates USING btree (stage);


--
-- Name: idx_candidates_stage_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidates_stage_position ON public.candidates USING btree (stage, "position");


--
-- Name: idx_cc_candidate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cc_candidate ON public.candidate_comments USING btree (candidate_id);


--
-- Name: idx_cc_snapshots_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cc_snapshots_date ON public.cc_snapshots USING btree (snapshot_date DESC);


--
-- Name: idx_client_activity_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_activity_client ON public.client_activity_log USING btree (client_id);


--
-- Name: idx_client_activity_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_activity_created ON public.client_activity_log USING btree (created_at);


--
-- Name: idx_client_activity_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_activity_user ON public.client_activity_log USING btree (user_id);


--
-- Name: idx_client_nbi_contacts_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_nbi_contacts_client ON public.client_nbi_contacts USING btree (client_id);


--
-- Name: idx_client_notes_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_notes_client ON public.client_notes USING btree (client_id);


--
-- Name: idx_client_notes_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_notes_date ON public.client_notes USING btree (meeting_date DESC);


--
-- Name: idx_client_reports_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_reports_client ON public.client_reports USING btree (client_id, created_at DESC);


--
-- Name: idx_client_reports_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_reports_token ON public.client_reports USING btree (share_token);


--
-- Name: idx_clients_practice_area; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_practice_area ON public.clients USING btree (practice_area) WHERE (practice_area IS NOT NULL);


--
-- Name: idx_contacts_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_client ON public.contacts USING btree (client_id);


--
-- Name: idx_contacts_client_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_client_sort ON public.contacts USING btree (client_id, sort_order);


--
-- Name: idx_csh_candidate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_csh_candidate ON public.candidate_stage_history USING btree (candidate_id);


--
-- Name: idx_csh_moved_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_csh_moved_at ON public.candidate_stage_history USING btree (moved_at);


--
-- Name: idx_dashboard_snapshots_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dashboard_snapshots_date ON public.dashboard_snapshots USING btree (snapshot_date DESC);


--
-- Name: idx_document_attachments_doc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_attachments_doc ON public.document_attachments USING btree (document_id);


--
-- Name: idx_document_attachments_orphaned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_attachments_orphaned ON public.document_attachments USING btree (orphaned_at) WHERE (orphaned_at IS NOT NULL);


--
-- Name: idx_documents_body_text_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_body_text_trgm ON public.documents USING gin (body_text public.gin_trgm_ops);


--
-- Name: idx_documents_candidate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_candidate ON public.documents USING btree (candidate_id) WHERE (candidate_id IS NOT NULL);


--
-- Name: idx_documents_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_client ON public.documents USING btree (client_id);


--
-- Name: idx_documents_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_parent ON public.documents USING btree (parent_id);


--
-- Name: idx_documents_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_task ON public.documents USING btree (task_id) WHERE (task_id IS NOT NULL);


--
-- Name: idx_documents_visibility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_visibility ON public.documents USING btree (visibility);


--
-- Name: idx_expense_receipts_expense; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_receipts_expense ON public.expense_receipts USING btree (expense_id);


--
-- Name: idx_expense_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_reports_status ON public.expense_reports USING btree (status);


--
-- Name: idx_expense_reports_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_reports_user ON public.expense_reports USING btree (user_id);


--
-- Name: idx_expenses_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_category ON public.expenses USING btree (category_id);


--
-- Name: idx_expenses_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_date ON public.expenses USING btree (date DESC);


--
-- Name: idx_expenses_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_report ON public.expenses USING btree (report_id);


--
-- Name: idx_expenses_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_status ON public.expenses USING btree (status);


--
-- Name: idx_expenses_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_user ON public.expenses USING btree (user_id);


--
-- Name: idx_expenses_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_user_date ON public.expenses USING btree (user_id, date DESC);


--
-- Name: idx_finance_entries_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_finance_entries_category ON public.finance_entries USING btree (category);


--
-- Name: idx_finance_entries_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_finance_entries_date ON public.finance_entries USING btree (entry_date);


--
-- Name: idx_hd_candidate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hd_candidate ON public.hiring_decisions USING btree (candidate_id);


--
-- Name: idx_het_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_het_client ON public.hiring_email_templates USING btree (client_id);


--
-- Name: idx_hiring_positions_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hiring_positions_client ON public.hiring_positions USING btree (client_id);


--
-- Name: idx_ic_candidate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ic_candidate ON public.interview_configs USING btree (candidate_id);


--
-- Name: idx_ic_scheduled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ic_scheduled_at ON public.interview_configs USING btree (scheduled_at) WHERE (scheduled_at IS NOT NULL);


--
-- Name: idx_icq_config_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_icq_config_sort ON public.interview_config_questions USING btree (config_id, sort_order);


--
-- Name: idx_iqb_client_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iqb_client_category ON public.interview_question_bank USING btree (client_id, category);


--
-- Name: idx_iqb_client_discipline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iqb_client_discipline ON public.interview_question_bank USING btree (client_id, discipline);


--
-- Name: idx_iqb_position_titles; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iqb_position_titles ON public.interview_question_bank USING gin (position_titles);


--
-- Name: idx_ir_candidate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ir_candidate ON public.interview_rounds USING btree (candidate_id);


--
-- Name: idx_is_config; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_is_config ON public.interview_sessions USING btree (config_id);


--
-- Name: idx_is_interviewer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_is_interviewer ON public.interview_sessions USING btree (interviewer_id);


--
-- Name: idx_isc_interviewer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_isc_interviewer ON public.interview_scorecards USING btree (interviewer_user_id);


--
-- Name: idx_isc_round_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_isc_round_user ON public.interview_scorecards USING btree (round_id, interviewer_user_id);


--
-- Name: idx_isc_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_isc_session ON public.interview_scores USING btree (session_id);


--
-- Name: idx_lead_activities_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_activities_date ON public.lead_activities USING btree (created_at DESC);


--
-- Name: idx_lead_activities_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_activities_lead ON public.lead_activities USING btree (lead_id);


--
-- Name: idx_lead_resources_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_resources_lead ON public.lead_resources USING btree (lead_id);


--
-- Name: idx_leads_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_client ON public.leads USING btree (client_id);


--
-- Name: idx_leads_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_client_id ON public.leads USING btree (client_id);


--
-- Name: idx_leads_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_created ON public.leads USING btree (created_at DESC);


--
-- Name: idx_leads_followup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_followup ON public.leads USING btree (next_followup_date);


--
-- Name: idx_leads_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_owner ON public.leads USING btree (deal_owner);


--
-- Name: idx_leads_practice_area; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_practice_area ON public.leads USING btree (practice_area) WHERE (practice_area IS NOT NULL);


--
-- Name: idx_leads_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_priority ON public.leads USING btree (priority);


--
-- Name: idx_leads_sow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_sow_id ON public.leads USING btree (sow_id);


--
-- Name: idx_leads_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_stage ON public.leads USING btree (stage_id);


--
-- Name: idx_leads_stage_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_stage_id ON public.leads USING btree (stage_id);


--
-- Name: idx_leads_stage_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_stage_position ON public.leads USING btree (stage_id, "position");


--
-- Name: idx_meeting_items_section; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_items_section ON public.meeting_items USING btree (section);


--
-- Name: idx_meeting_items_source_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_meeting_items_source_id ON public.meeting_items USING btree (((data ->> 'source_id'::text))) WHERE ((section = 'meetings'::text) AND ((data ->> 'source_id'::text) IS NOT NULL));


--
-- Name: idx_milestone_items_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_milestone_items_task ON public.milestone_items USING btree (task_id);


--
-- Name: idx_milestones_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_milestones_client ON public.milestones USING btree (client_id);


--
-- Name: idx_milestones_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_milestones_target ON public.milestones USING btree (target_date);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (username, is_read);


--
-- Name: idx_notifications_user_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_read ON public.notifications USING btree (username, is_read, created_at DESC);


--
-- Name: idx_oci_candidate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oci_candidate ON public.onboarding_checklist_items USING btree (candidate_id);


--
-- Name: idx_pqt_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pqt_position ON public.position_question_templates USING btree (position_id);


--
-- Name: idx_reset_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reset_tokens_token ON public.password_reset_tokens USING btree (token);


--
-- Name: idx_reset_tokens_user_used; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reset_tokens_user_used ON public.password_reset_tokens USING btree (user_id, used);


--
-- Name: idx_sessions_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_expires ON public.sessions USING btree (expires_at);


--
-- Name: idx_sessions_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_token ON public.sessions USING btree (token);


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);


--
-- Name: idx_sows_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sows_client_id ON public.sows USING btree (client_id);


--
-- Name: idx_task_attachments_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_attachments_task ON public.task_attachments USING btree (task_id, created_at);


--
-- Name: idx_task_comments_task_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_comments_task_created ON public.task_comments USING btree (task_id, created_at);


--
-- Name: idx_task_notes_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_notes_task ON public.task_notes USING btree (task_id);


--
-- Name: idx_task_notes_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_notes_task_id ON public.task_notes USING btree (task_id);


--
-- Name: idx_task_queue_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_queue_created ON public.task_queue USING btree (created_at DESC);


--
-- Name: idx_task_queue_submitted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_queue_submitted_by ON public.task_queue USING btree (submitted_by);


--
-- Name: idx_tasks_assignees; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_assignees ON public.tasks USING gin (assignees);


--
-- Name: idx_tasks_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_client ON public.tasks USING btree (client_id);


--
-- Name: idx_tasks_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_client_id ON public.tasks USING btree (client_id);


--
-- Name: idx_tasks_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_created_at ON public.tasks USING btree (created_at);


--
-- Name: idx_tasks_dependencies; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_dependencies ON public.tasks USING gin (dependencies);


--
-- Name: idx_tasks_dependencies_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_dependencies_gin ON public.tasks USING gin (dependencies);


--
-- Name: idx_tasks_item_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_item_type ON public.tasks USING btree (item_type);


--
-- Name: idx_tasks_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_parent ON public.tasks USING btree (parent_id);


--
-- Name: idx_tasks_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_parent_id ON public.tasks USING btree (parent_id);


--
-- Name: idx_tasks_parent_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_parent_sort ON public.tasks USING btree (parent_id, sort_order);


--
-- Name: idx_tasks_practice_area; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_practice_area ON public.tasks USING btree (practice_area) WHERE (practice_area IS NOT NULL);


--
-- Name: idx_tasks_sow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_sow_id ON public.tasks USING btree (sow_id);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- Name: idx_tasks_status_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_status_position ON public.tasks USING btree (status, "position");


--
-- Name: idx_tasks_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_updated_at ON public.tasks USING btree (updated_at DESC);


--
-- Name: idx_team_members_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_team_id ON public.team_members USING btree (team_id);


--
-- Name: idx_team_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_user_id ON public.team_members USING btree (user_id);


--
-- Name: idx_teams_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_client_id ON public.teams USING btree (client_id);


--
-- Name: idx_teams_sow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_sow_id ON public.teams USING btree (sow_id);


--
-- Name: idx_time_entries_task_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_entries_task_date ON public.time_entries USING btree (task_id, date DESC, created_at DESC);


--
-- Name: idx_time_entries_user_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_entries_user_name ON public.time_entries USING btree (user_name);


--
-- Name: idx_time_off_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_off_dates ON public.time_off USING btree (start_date, end_date);


--
-- Name: idx_time_off_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_off_user ON public.time_off USING btree (user_id);


--
-- Name: idx_users_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_client_id ON public.users USING btree (client_id) WHERE (client_id IS NOT NULL);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: articles articles_source_id_sources_id_fk; Type: FK CONSTRAINT; Schema: news; Owner: -
--

ALTER TABLE ONLY news.articles
    ADD CONSTRAINT articles_source_id_sources_id_fk FOREIGN KEY (source_id) REFERENCES news.sources(id);


--
-- Name: digests digests_generation_run_id_generation_runs_id_fk; Type: FK CONSTRAINT; Schema: news; Owner: -
--

ALTER TABLE ONLY news.digests
    ADD CONSTRAINT digests_generation_run_id_generation_runs_id_fk FOREIGN KEY (generation_run_id) REFERENCES news.generation_runs(id);


--
-- Name: feed_health feed_health_source_id_sources_id_fk; Type: FK CONSTRAINT; Schema: news; Owner: -
--

ALTER TABLE ONLY news.feed_health
    ADD CONSTRAINT feed_health_source_id_sources_id_fk FOREIGN KEY (source_id) REFERENCES news.sources(id);


--
-- Name: monthly_summaries monthly_summaries_generation_run_id_generation_runs_id_fk; Type: FK CONSTRAINT; Schema: news; Owner: -
--

ALTER TABLE ONLY news.monthly_summaries
    ADD CONSTRAINT monthly_summaries_generation_run_id_generation_runs_id_fk FOREIGN KEY (generation_run_id) REFERENCES news.generation_runs(id);


--
-- Name: stories stories_digest_id_digests_id_fk; Type: FK CONSTRAINT; Schema: news; Owner: -
--

ALTER TABLE ONLY news.stories
    ADD CONSTRAINT stories_digest_id_digests_id_fk FOREIGN KEY (digest_id) REFERENCES news.digests(id);


--
-- Name: stories stories_hero_asset_id_media_assets_id_fk; Type: FK CONSTRAINT; Schema: news; Owner: -
--

ALTER TABLE ONLY news.stories
    ADD CONSTRAINT stories_hero_asset_id_media_assets_id_fk FOREIGN KEY (hero_asset_id) REFERENCES news.media_assets(id);


--
-- Name: story_articles story_articles_article_id_articles_id_fk; Type: FK CONSTRAINT; Schema: news; Owner: -
--

ALTER TABLE ONLY news.story_articles
    ADD CONSTRAINT story_articles_article_id_articles_id_fk FOREIGN KEY (article_id) REFERENCES news.articles(id);


--
-- Name: story_articles story_articles_story_id_stories_id_fk; Type: FK CONSTRAINT; Schema: news; Owner: -
--

ALTER TABLE ONLY news.story_articles
    ADD CONSTRAINT story_articles_story_id_stories_id_fk FOREIGN KEY (story_id) REFERENCES news.stories(id);


--
-- Name: bug_report_comments bug_report_comments_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bug_report_comments
    ADD CONSTRAINT bug_report_comments_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.bug_reports(id) ON DELETE CASCADE;


--
-- Name: bug_reports bug_reports_reporter_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bug_reports
    ADD CONSTRAINT bug_reports_reporter_client_id_fkey FOREIGN KEY (reporter_client_id) REFERENCES public.clients(id);


--
-- Name: bug_reports bug_reports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bug_reports
    ADD CONSTRAINT bug_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: calendar_events calendar_events_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: calendar_events calendar_events_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: calendar_events calendar_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: candidate_activity candidate_activity_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_activity
    ADD CONSTRAINT candidate_activity_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- Name: candidate_comments candidate_comments_author_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_comments
    ADD CONSTRAINT candidate_comments_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: candidate_comments candidate_comments_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_comments
    ADD CONSTRAINT candidate_comments_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- Name: candidate_files candidate_files_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_files
    ADD CONSTRAINT candidate_files_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- Name: candidate_stage_history candidate_stage_history_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_stage_history
    ADD CONSTRAINT candidate_stage_history_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- Name: candidates candidates_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: candidates candidates_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.hiring_positions(id) ON DELETE SET NULL;


--
-- Name: client_activity_log client_activity_log_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_activity_log
    ADD CONSTRAINT client_activity_log_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: client_activity_log client_activity_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_activity_log
    ADD CONSTRAINT client_activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: client_nbi_contacts client_nbi_contacts_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_nbi_contacts
    ADD CONSTRAINT client_nbi_contacts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_nbi_contacts client_nbi_contacts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_nbi_contacts
    ADD CONSTRAINT client_nbi_contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: client_notes client_notes_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_notes
    ADD CONSTRAINT client_notes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_reports client_reports_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_reports
    ADD CONSTRAINT client_reports_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: contacts contacts_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: document_attachments document_attachments_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_attachments
    ADD CONSTRAINT document_attachments_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: documents documents_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE SET NULL;


--
-- Name: documents documents_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: documents documents_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: documents documents_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;


--
-- Name: expense_receipts expense_receipts_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_receipts
    ADD CONSTRAINT expense_receipts_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE;


--
-- Name: expense_reports expense_reports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_reports
    ADD CONSTRAINT expense_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.expense_reports(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: bug_report_comments fk_bug_report_comments_report; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bug_report_comments
    ADD CONSTRAINT fk_bug_report_comments_report FOREIGN KEY (report_id) REFERENCES public.bug_reports(id) ON DELETE CASCADE;


--
-- Name: hiring_decisions hiring_decisions_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hiring_decisions
    ADD CONSTRAINT hiring_decisions_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- Name: hiring_decisions hiring_decisions_decided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hiring_decisions
    ADD CONSTRAINT hiring_decisions_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: hiring_email_templates hiring_email_templates_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hiring_email_templates
    ADD CONSTRAINT hiring_email_templates_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: hiring_positions hiring_positions_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hiring_positions
    ADD CONSTRAINT hiring_positions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: hiring_positions hiring_positions_filled_by_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hiring_positions
    ADD CONSTRAINT hiring_positions_filled_by_candidate_id_fkey FOREIGN KEY (filled_by_candidate_id) REFERENCES public.candidates(id) ON DELETE SET NULL;


--
-- Name: hiring_positions hiring_positions_sow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hiring_positions
    ADD CONSTRAINT hiring_positions_sow_id_fkey FOREIGN KEY (sow_id) REFERENCES public.sows(id) ON DELETE SET NULL;


--
-- Name: interview_config_questions interview_config_questions_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_config_questions
    ADD CONSTRAINT interview_config_questions_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.interview_configs(id) ON DELETE CASCADE;


--
-- Name: interview_config_questions interview_config_questions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_config_questions
    ADD CONSTRAINT interview_config_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.interview_question_bank(id) ON DELETE SET NULL;


--
-- Name: interview_configs interview_configs_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_configs
    ADD CONSTRAINT interview_configs_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- Name: interview_configs interview_configs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_configs
    ADD CONSTRAINT interview_configs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: interview_configs interview_configs_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_configs
    ADD CONSTRAINT interview_configs_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.hiring_positions(id) ON DELETE SET NULL;


--
-- Name: interview_decisions interview_decisions_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_decisions
    ADD CONSTRAINT interview_decisions_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.interview_configs(id) ON DELETE CASCADE;


--
-- Name: interview_decisions interview_decisions_decided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_decisions
    ADD CONSTRAINT interview_decisions_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: interview_question_bank interview_question_bank_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_question_bank
    ADD CONSTRAINT interview_question_bank_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: interview_question_bank interview_question_bank_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_question_bank
    ADD CONSTRAINT interview_question_bank_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: interview_rounds interview_rounds_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_rounds
    ADD CONSTRAINT interview_rounds_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- Name: interview_scorecards interview_scorecards_interviewer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_scorecards
    ADD CONSTRAINT interview_scorecards_interviewer_user_id_fkey FOREIGN KEY (interviewer_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: interview_scorecards interview_scorecards_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_scorecards
    ADD CONSTRAINT interview_scorecards_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.interview_rounds(id) ON DELETE CASCADE;


--
-- Name: interview_scores interview_scores_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_scores
    ADD CONSTRAINT interview_scores_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.interview_question_bank(id) ON DELETE SET NULL;


--
-- Name: interview_scores interview_scores_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_scores
    ADD CONSTRAINT interview_scores_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.interview_sessions(id) ON DELETE CASCADE;


--
-- Name: interview_sessions interview_sessions_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_sessions
    ADD CONSTRAINT interview_sessions_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.interview_configs(id) ON DELETE CASCADE;


--
-- Name: interview_sessions interview_sessions_interviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_sessions
    ADD CONSTRAINT interview_sessions_interviewer_id_fkey FOREIGN KEY (interviewer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: lead_activities lead_activities_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_activities
    ADD CONSTRAINT lead_activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_resources lead_resources_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_resources
    ADD CONSTRAINT lead_resources_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_resources lead_resources_resource_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_resources
    ADD CONSTRAINT lead_resources_resource_type_id_fkey FOREIGN KEY (resource_type_id) REFERENCES public.lead_resource_types(id);


--
-- Name: leads leads_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: leads leads_primary_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_primary_contact_id_fkey FOREIGN KEY (primary_contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;


--
-- Name: leads leads_sow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_sow_id_fkey FOREIGN KEY (sow_id) REFERENCES public.sows(id) ON DELETE SET NULL;


--
-- Name: leads leads_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.lead_pipeline_stages(id);


--
-- Name: milestone_items milestone_items_milestone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_items
    ADD CONSTRAINT milestone_items_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES public.milestones(id) ON DELETE CASCADE;


--
-- Name: milestone_items milestone_items_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_items
    ADD CONSTRAINT milestone_items_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: milestones milestones_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: onboarding_checklist_items onboarding_checklist_items_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_checklist_items
    ADD CONSTRAINT onboarding_checklist_items_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: position_question_templates position_question_templates_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.position_question_templates
    ADD CONSTRAINT position_question_templates_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: position_question_templates position_question_templates_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.position_question_templates
    ADD CONSTRAINT position_question_templates_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.hiring_positions(id) ON DELETE CASCADE;


--
-- Name: position_question_templates position_question_templates_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.position_question_templates
    ADD CONSTRAINT position_question_templates_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.interview_question_bank(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sows sows_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sows
    ADD CONSTRAINT sows_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: task_attachments task_attachments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_comments task_comments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_notes task_notes_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_notes
    ADD CONSTRAINT task_notes_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_queue task_queue_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_queue
    ADD CONSTRAINT task_queue_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: tasks tasks_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.tasks(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_sow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_sow_id_fkey FOREIGN KEY (sow_id) REFERENCES public.sows(id) ON DELETE SET NULL;


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: teams teams_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: teams teams_sow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_sow_id_fkey FOREIGN KEY (sow_id) REFERENCES public.sows(id) ON DELETE SET NULL;


--
-- Name: time_entries time_entries_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: time_off time_off_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_off
    ADD CONSTRAINT time_off_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict hVnOuf0ANNpaPi96cccQNz7FeDlTbBZFvB0BEOD4W7LfXzyDU9I13zdDK29Ea9s

INSERT INTO public.schema_migrations VALUES (1, '001_initial_schema.sql', '2026-04-08 23:35:39.676764+01');
INSERT INTO public.schema_migrations VALUES (2, '002_contacts_columns.sql', '2026-04-08 23:35:39.678175+01');
INSERT INTO public.schema_migrations VALUES (3, '003_expense_reports.sql', '2026-04-08 23:35:39.67894+01');
INSERT INTO public.schema_migrations VALUES (4, '004_bug_reports.sql', '2026-04-08 23:35:39.679728+01');
INSERT INTO public.schema_migrations VALUES (5, '005_performance_indexes.sql', '2026-04-08 23:35:39.680347+01');
INSERT INTO public.schema_migrations VALUES (6, '006_expense_approver_setting.sql', '2026-04-08 23:35:39.680984+01');
INSERT INTO public.schema_migrations VALUES (7, '007_notifications_index.sql', '2026-04-08 23:35:39.681554+01');
INSERT INTO public.schema_migrations VALUES (8, '008_item_type_hierarchy.sql', '2026-04-11 12:55:08.981205+01');
INSERT INTO public.schema_migrations VALUES (9, '009_client_studio_contract.sql', '2026-04-13 04:11:52.287656+01');
INSERT INTO public.schema_migrations VALUES (10, '010_bug_tracker_upgrade.sql', '2026-04-13 22:52:30.61454+01');
INSERT INTO public.schema_migrations VALUES (11, '011_client_page_fields.sql', '2026-04-14 03:22:27.268189+01');
INSERT INTO public.schema_migrations VALUES (12, '012_sow_layer.sql', '2026-04-14 03:36:20.243047+01');
INSERT INTO public.schema_migrations VALUES (13, '013_phase4_features.sql', '2026-04-14 03:50:41.257986+01');
INSERT INTO public.schema_migrations VALUES (14, '014_calendar_events.sql', '2026-04-14 04:07:18.986891+01');
INSERT INTO public.schema_migrations VALUES (15, '015_attachment_links.sql', '2026-04-14 04:07:19.013671+01');
INSERT INTO public.schema_migrations VALUES (16, '016_teams.sql', '2026-04-14 04:25:56.174425+01');
INSERT INTO public.schema_migrations VALUES (17, '017_hiring.sql', '2026-04-14 04:39:33.767842+01');
INSERT INTO public.schema_migrations VALUES (18, '018_practice_areas.sql', '2026-04-14 04:54:52.827505+01');
INSERT INTO public.schema_migrations VALUES (19, '019_client_abbreviation.sql', '2026-04-15 00:08:51.787293+01');
INSERT INTO public.schema_migrations VALUES (20, '020_decode_double_escape.sql', '2026-04-15 03:25:25.210274+01');
INSERT INTO public.schema_migrations VALUES (21, '021_kanban_position.sql', '2026-04-15 11:34:55.867741+01');
INSERT INTO public.schema_migrations VALUES (22, '022_practice_rename_and_backfill.sql', '2026-04-15 12:32:53.433468+01');
INSERT INTO public.schema_migrations VALUES (23, '023_calendar_team_events.sql', '2026-04-15 22:42:17.246844+01');
INSERT INTO public.schema_migrations VALUES (24, '024_hiring_rewrite.sql', '2026-04-16 00:05:39.637471+01');
INSERT INTO public.schema_migrations VALUES (25, '025_rename_practice_to_organisational_performance.sql', '2026-04-16 01:51:37.78965+01');
INSERT INTO public.schema_migrations VALUES (26, '026_client_scoped_users.sql', '2026-04-16 17:19:44.078023+01');
INSERT INTO public.schema_migrations VALUES (27, '027_audit_fixes', '2026-04-18 16:08:34.84713+01');
INSERT INTO public.schema_migrations VALUES (28, '028_dashboard_snapshots.sql', '2026-04-19 00:46:59.26154+01');
INSERT INTO public.schema_migrations VALUES (29, '029_work_type.sql', '2026-04-19 15:47:43.103721+01');
INSERT INTO public.schema_migrations VALUES (30, '030_hiring_stage_streamline.sql', '2026-04-20 00:50:20.415785+01');
INSERT INTO public.schema_migrations VALUES (31, '031_client_portal.sql', '2026-04-20 01:09:43.833329+01');
INSERT INTO public.schema_migrations VALUES (32, '032_reporting_fields.sql', '2026-05-02 17:14:54.207985+01');
INSERT INTO public.schema_migrations VALUES (33, '033_documents.sql', '2026-05-03 14:59:43.886051+01');
INSERT INTO public.schema_migrations VALUES (34, '034_document_attachments.sql', '2026-05-03 14:59:43.886051+01');
INSERT INTO public.schema_migrations VALUES (35, '035_documentation_perms.sql', '2026-05-03 14:59:43.886051+01');
INSERT INTO public.schema_migrations VALUES (36, '036_document_hidden.sql', '2026-05-03 23:35:41.281857+01');
INSERT INTO public.schema_migrations VALUES (37, '037_task_queue.sql', '2026-05-04 05:29:15.763912+01');
INSERT INTO public.schema_migrations VALUES (38, '038_milestones.sql', '2026-05-05 05:21:25.647857+01');
INSERT INTO public.schema_migrations VALUES (39, '039_add_indexes.sql', '2026-05-05 22:33:50.446672+01');
INSERT INTO public.schema_migrations VALUES (40, '040_scalability_indexes.sql', '2026-05-05 22:33:50.626671+01');
INSERT INTO public.schema_migrations VALUES (41, '041_tier2_fixes.sql', '2026-05-06 05:14:43.8641+01');
INSERT INTO public.schema_migrations VALUES (42, '042_leads_sow_id.sql', '2026-05-09 02:27:42.11914+01');
INSERT INTO public.schema_migrations VALUES (43, '043_user_time_off.sql', '2026-05-09 02:31:38.093906+01');
INSERT INTO public.schema_migrations VALUES (44, '044_command_centre.sql', '2026-05-11 13:58:55.951949+01');
INSERT INTO public.schema_migrations VALUES (45, '045_tree_sort_order.sql', '2026-05-14 02:20:22.990472+01');
INSERT INTO public.schema_migrations VALUES (46, '046_ats_data_foundation.sql', '2026-05-20 05:10:44.354493+01');
INSERT INTO public.schema_migrations VALUES (47, '047_jd_attachment.sql', '2026-05-20 13:27:03.401145+01');
INSERT INTO public.schema_migrations VALUES (48, '048_interview_management.sql', '2026-05-20 16:50:24.957039+01');
INSERT INTO public.schema_migrations VALUES (49, '049_intelligence_layer.sql', '2026-05-20 17:42:36.48649+01');
INSERT INTO public.schema_migrations VALUES (50, '050_per_client_stages.sql', '2026-05-20 18:48:31.934883+01');
INSERT INTO public.schema_migrations VALUES (51, '051_stage_changed_at.sql', '2026-05-21 15:33:12.493284+01');
INSERT INTO public.schema_migrations VALUES (52, '052_candidate_activity.sql', '2026-05-21 15:34:11.52324+01');
INSERT INTO public.schema_migrations VALUES (53, '053_contract_status.sql', '2026-05-22 17:10:01.34238+01');
INSERT INTO public.schema_migrations VALUES (54, '054_finance_entries.sql', '2026-05-23 12:24:32.568419+01');
INSERT INTO public.schema_migrations VALUES (55, '055_task_version.sql', '2026-05-23 12:24:32.653643+01');
INSERT INTO public.schema_migrations VALUES (56, '056_client_nbi_contacts.sql', '2026-05-25 02:59:20.034023+01');
INSERT INTO public.schema_migrations VALUES (57, '057_seed_client_nbi_contacts.sql', '2026-05-25 02:59:20.112605+01');
INSERT INTO public.schema_migrations VALUES (58, '058_interview_tool.sql', '2026-06-01 19:58:14.151092+01');
INSERT INTO public.schema_migrations VALUES (59, '059_meeting_action_status.sql', '2026-06-02 00:04:45.193578+01');
INSERT INTO public.schema_migrations VALUES (60, '060_hiring_position_discipline.sql', '2026-06-02 00:23:34.243302+01');
INSERT INTO public.schema_migrations VALUES (61, '061_meeting_items.sql', '2026-06-02 01:12:02.476392+01');
INSERT INTO public.schema_migrations VALUES (62, '062_interview_redesign.sql', '2026-06-03 01:45:48.783312+01');
INSERT INTO public.schema_migrations VALUES (63, '063_meetings_section.sql', '2026-06-03 01:45:48.793835+01');
INSERT INTO public.schema_migrations VALUES (64, '064_queue_metadata.sql', '2026-06-03 10:39:10.293595+01');
INSERT INTO public.schema_migrations VALUES (65, '065_question_position_titles.sql', '2026-06-03 23:25:22.685563+01');
INSERT INTO public.schema_migrations VALUES (66, '066_leads_win_probability_check.sql', '2026-06-04 05:19:49.310722+01');
INSERT INTO public.schema_migrations VALUES (67, '067_position_question_templates.sql', '2026-06-04 22:46:37.384098+01');
INSERT INTO public.schema_migrations VALUES (68, '068_document_candidate_link.sql', '2026-06-08 16:00:03.627139+01');
INSERT INTO public.schema_migrations VALUES (69, '069_candidate_files.sql', '2026-06-18 14:37:42.075659+01');
INSERT INTO public.schema_migrations VALUES (70, '070_position_close_workflow.sql', '2026-06-18 22:53:30.108089+01');
INSERT INTO public.schema_migrations VALUES (71, '071_interview_edit_resend.sql', '2026-06-21 13:35:10.869266+01');
INSERT INTO public.schema_migrations VALUES (72, '072_seed_interview_questions.sql', '2026-06-21 14:50:58.327914+01');
