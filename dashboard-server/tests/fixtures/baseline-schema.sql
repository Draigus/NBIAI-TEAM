--
-- PostgreSQL database dump
--

\restrict WQkCKuBH27OHbzdINniOjXHEAWxChzPvi457dFGfapDdA7G8y7xLvtVqcTDxeRV

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


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
    archived_at timestamp with time zone
);


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
    abbreviation text
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
    updated_at timestamp with time zone DEFAULT now()
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
    "position" integer DEFAULT 0 NOT NULL
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
    work_type text
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
    CONSTRAINT chk_client_role_requires_client CHECK (((client_role IS NULL) OR (client_id IS NOT NULL)))
);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


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
-- Name: candidates candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_pkey PRIMARY KEY (id);


--
-- Name: client_activity_log client_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_activity_log
    ADD CONSTRAINT client_activity_log_pkey PRIMARY KEY (id);


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
-- Name: hiring_positions hiring_positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hiring_positions
    ADD CONSTRAINT hiring_positions_pkey PRIMARY KEY (id);


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
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


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
-- Name: idx_attachments_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attachments_entity ON public.attachments USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: idx_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_created ON public.audit_log USING btree (created_at DESC);


--
-- Name: idx_audit_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_created ON public.audit_log USING btree (created_at);


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
-- Name: idx_dashboard_snapshots_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dashboard_snapshots_date ON public.dashboard_snapshots USING btree (snapshot_date DESC);


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
-- Name: idx_hiring_positions_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hiring_positions_client ON public.hiring_positions USING btree (client_id);


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
-- Name: idx_leads_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_stage ON public.leads USING btree (stage_id);


--
-- Name: idx_leads_stage_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_stage_position ON public.leads USING btree (stage_id, "position");


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (username, is_read);


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
-- Name: idx_task_notes_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_notes_task ON public.task_notes USING btree (task_id);


--
-- Name: idx_task_notes_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_notes_task_id ON public.task_notes USING btree (task_id);


--
-- Name: idx_tasks_assignees; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_assignees ON public.tasks USING gin (assignees);


--
-- Name: idx_tasks_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_client ON public.tasks USING btree (client_id);


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
-- Name: hiring_positions hiring_positions_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hiring_positions
    ADD CONSTRAINT hiring_positions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: hiring_positions hiring_positions_sow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hiring_positions
    ADD CONSTRAINT hiring_positions_sow_id_fkey FOREIGN KEY (sow_id) REFERENCES public.sows(id) ON DELETE SET NULL;


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
-- Name: leads leads_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.lead_pipeline_stages(id);


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


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
-- Name: users users_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict WQkCKuBH27OHbzdINniOjXHEAWxChzPvi457dFGfapDdA7G8y7xLvtVqcTDxeRV

--
-- PostgreSQL database dump
--

\restrict qa1F4qpQjiwJ8EydhRegx4PDnhYxEPgeAHjTqSfYWPEkejGhqIIDXOIZkduUIlk

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
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.schema_migrations (version, name, applied_at) FROM stdin;
1	001_initial_schema.sql	2026-04-20 01:10:48.161566+01
2	002_contacts_columns.sql	2026-04-20 01:10:48.163303+01
3	003_expense_reports.sql	2026-04-20 01:10:48.163993+01
4	004_bug_reports.sql	2026-04-20 01:10:48.164555+01
5	005_performance_indexes.sql	2026-04-20 01:10:48.165056+01
6	006_expense_approver_setting.sql	2026-04-20 01:10:48.165665+01
7	007_notifications_index.sql	2026-04-20 01:10:48.166217+01
8	008_item_type_hierarchy.sql	2026-04-20 01:10:48.166861+01
9	009_client_studio_contract.sql	2026-04-20 01:10:48.174806+01
10	010_bug_tracker_upgrade.sql	2026-04-20 01:10:48.176553+01
11	011_client_page_fields.sql	2026-04-20 01:10:48.179868+01
12	012_sow_layer.sql	2026-04-20 01:10:48.181096+01
13	013_phase4_features.sql	2026-04-20 01:10:48.184661+01
14	014_calendar_events.sql	2026-04-20 01:10:48.18633+01
15	015_attachment_links.sql	2026-04-20 01:10:48.188151+01
16	016_teams.sql	2026-04-20 01:10:48.189483+01
17	017_hiring.sql	2026-04-20 01:10:48.191121+01
18	018_practice_areas.sql	2026-04-20 01:10:48.193226+01
19	019_client_abbreviation.sql	2026-04-20 01:10:48.198357+01
20	020_decode_double_escape.sql	2026-04-20 01:10:48.200121+01
21	021_kanban_position.sql	2026-04-20 01:10:48.222383+01
22	022_practice_rename_and_backfill.sql	2026-04-20 01:10:48.226671+01
23	023_calendar_team_events.sql	2026-04-20 01:10:48.229418+01
24	024_hiring_rewrite.sql	2026-04-20 01:10:48.23374+01
25	025_rename_practice_to_organisational_performance.sql	2026-04-20 01:10:48.235782+01
26	026_client_scoped_users.sql	2026-04-20 01:10:48.237698+01
27	027_audit_fixes.sql	2026-04-20 01:10:48.239131+01
28	028_dashboard_snapshots.sql	2026-04-20 01:10:48.240611+01
29	029_work_type.sql	2026-04-20 01:10:48.241877+01
30	030_hiring_stage_streamline.sql	2026-04-20 01:10:48.243108+01
31	031_client_portal.sql	2026-04-20 01:12:26.711215+01
\.


--
-- PostgreSQL database dump complete
--

\unrestrict qa1F4qpQjiwJ8EydhRegx4PDnhYxEPgeAHjTqSfYWPEkejGhqIIDXOIZkduUIlk

