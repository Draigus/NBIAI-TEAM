# UX Competitive Research Report — NBIAI App

**Author:** UI/UX Designer
**Date:** 2026-03-28
**Version:** 1.0
**Scope:** Competitor analysis and usability research to inform NBIAI app design decisions
**For review by:** UI/UX Lead

---

## Contents

1. [Competitor Analysis](#1-competitor-analysis)
   - 1.1 Linear
   - 1.2 Vercel Dashboard
   - 1.3 Retool
   - 1.4 Dagster
   - 1.5 Windmill
   - 1.6 Airplane.dev
   - 1.7 Anthropic Console
   - 1.8 Paperclip
2. [Usability Best Practices](#2-usability-best-practices)
   - 2.1 Real-Time Agent/Process Monitoring
   - 2.2 Information Hierarchy in Data-Dense Dark Dashboards
   - 2.3 Status Badge and Colour Semantics
   - 2.4 Navigation Patterns for Multi-Section Internal Tools
   - 2.5 Approval Workflow UX
   - 2.6 Kanban vs Table View for Pipeline Management
   - 2.7 Cost and Token Display in AI Tooling
3. [Synthesis: 10 Most Important UI/UX Decisions](#3-synthesis-10-most-important-uiux-decisions)

---

## 1. Competitor Analysis

---

### 1.1 Linear

**What it does**

Linear is a project and issue tracking tool built for software engineering teams. It is widely regarded as the reference point for high-quality, data-dense dark UI design in the project management category. It manages issues, projects, cycles, and roadmaps with a strong emphasis on keyboard-first interaction and information density.

**Key UI Patterns Relevant to NBIAI**

- **Active item indicator:** The currently selected item in any list uses a left border accent (2px, blue) rather than a background fill alone. This creates a directional reading cue — the eye is drawn to the left edge, then reads across. It works at high density without requiring large click targets.
- **Reduced chromatic palette:** Linear's most recent redesign deliberately reduced the amount of colour used, moving from multiple blue accents to an almost monochrome base with very few bold accent moments. Colour is reserved for status signals and primary CTAs only.
- **LCH colour space:** Linear migrated from HSL to LCH for theme generation. LCH is perceptually uniform — equal lightness values appear equally bright across hues. This prevents the visual inconsistency where a green badge looks brighter or heavier than a blue badge at the same lightness value.
- **Status and priority as compact chips:** Priority and status are displayed as small coloured chips (not full-width badges) containing an icon and a short label. They take up minimal horizontal space and read at a glance. Icons carry the semantic meaning; the label confirms it.
- **Keyboard shortcut discoverability:** Hovering over almost any UI element for a moment reveals a tooltip showing the keyboard shortcut for that action. This teaches muscle memory passively rather than requiring the user to find a shortcut reference. Core shortcuts: `C` to create an issue from anywhere, `Cmd+K` to open the command palette, `X` to select.
- **Command palette (`Cmd+K`):** The universal entry point for any action. Finding something, creating something, transitioning a status — all accessible from the keyboard without navigation. This is the pattern that enables the tool to feel fast regardless of where you are.
- **Information hierarchy in list rows:** Each row in Linear contains three tiers of information. Primary (task title) is full opacity and full weight. Secondary (assignee, project) is at reduced opacity. Tertiary (dates, IDs) is even more muted. This is achieved through `text-primary`, `text-secondary`, and `text-muted` — precisely the token system the NBIAI design spec already defines.
- **Contextual hover actions:** Hovering a row surfaces 2–4 action buttons on the right side of the row. The row does not reflow — the actions appear over the right metadata. This avoids layout shift and keeps the list stable.
- **Collapsible sidebar:** The sidebar collapses to icon-only. The collapse toggle is a small button on the sidebar edge, not buried in a menu. State persists.

**What they do well**

- The density of information is high but the visual noise is low. This is the result of strict weight and opacity discipline rather than hiding information.
- The keyboard shortcut system is the best in class for internal tooling. It is discoverable (hover tooltips), learnable (consistent patterns), and comprehensive.
- The LCH-based colour system prevents the subtle perceptual inconsistencies that plague status badges built on HSL.
- The left border active state indicator is more spatial than a background fill — it communicates position within a hierarchy, not just selection.

**What they do poorly / where NBIAI can differentiate**

- Linear is optimised for software teams. Its conceptual model (issues, cycles, sprints) does not map to agent orchestration. NBIAI needs agent-native concepts: execution logs, model tier, budget spend, approval queues.
- The org chart concept does not exist in Linear. NBIAI's tree visualisation of agent hierarchy is a differentiated feature with no reference point in Linear.
- Linear does not surface financial data, approval workflows, or external-action gating. These are core to NBIAI.

**Patterns to adopt**

- Left border indicator for active/selected items in lists and the sidebar
- Three-tier opacity system for row content (primary / secondary / muted)
- Hover-to-reveal contextual row actions without layout reflow
- `Cmd+K` command palette for global navigation and actions
- Keyboard shortcut tooltips on hover
- Compact status chips with icon + short label, not large badge blocks
- LCH-aware colour approach for status badge consistency (relevant when building the design token system)

**Patterns to avoid**

- Linear's sprint/cycle model language — NBIAI operates on goals and tasks, not sprints
- Linear's emphasis on git integration as a primary feature signal

---

### 1.2 Vercel Dashboard

**What it does**

Vercel is a deployment and hosting platform for frontend applications. Its dashboard is the primary control plane for developers monitoring deployments, checking build status, reviewing logs, and managing projects. It is a widely referenced example of a clean, functional dark-theme operational dashboard.

**Key UI Patterns Relevant to NBIAI**

- **Deployment status in browser tab:** Vercel reflects deployment status (queued, building, error, ready) in the favicon of the browser tab. For an app where Glen may have NBIAI open alongside other tools, status-in-tab is a low-friction ambient awareness mechanism.
- **SWR (stale-while-revalidate) for real-time data:** Rather than polling on a timer or using WebSockets for all data, Vercel uses SWR to keep dashboard data fresh with minimal API load. The UI shows data immediately (from cache) and updates silently in the background.
- **Tiered information surface:** The dashboard prioritises three things above all else — production deployment status, latest preview deployment, and the git repo link. Everything else is secondary. This discipline — deciding the top three things — prevents dashboard sprawl.
- **Deployment inspector with integrated log filtering:** The log viewer within a deployment allows filtering by specific function or build output with a single click. Logs are not a wall of text — they have structure, filtering, and copy shortcuts. This is directly relevant to NBIAI's execution log display.
- **Performance-first design:** Vercel reduced their First Meaningful Paint by 1.2 seconds through preconnection optimisation and aggressive memoisation. For NBIAI, the Command Centre dashboard must load fast — skeleton states should match the actual layout precisely so the transition is seamless.
- **Separate production vs preview status:** Vercel clearly distinguishes production (the live thing) from preview (the thing being tested). NBIAI has an analogous distinction: active agents vs paused/idle agents. The visual treatment of these should be as distinct as Vercel's production/preview split.

**What they do well**

- The discipline of picking three primary information pieces and making them impossible to miss is a design decision, not a default. Most dashboards let everything compete equally.
- The log viewer is functional and unobtrusive — it does not try to be more than it needs to be.
- SWR as a data freshness strategy means users never see a "Loading..." state for data they've already seen.

**What they do poorly / where NBIAI can differentiate**

- Vercel's dashboard is primarily read-only for most users — you observe deployments, you do not direct them from the dashboard. NBIAI is an action surface: Glen approves, directs, pauses, and terminates from the dashboard. The interaction model is fundamentally different.
- Vercel does not need to surface human approval gates. NBIAI's Approvals Page has no parallel in Vercel.
- Vercel has no concept of budget per agent, organisational hierarchy, or knowledge context.

**Patterns to adopt**

- The "pick three primary signals" discipline for the Command Centre — the three things Glen must see immediately upon opening the app
- Skeleton loading states that precisely match the layout of the incoming content
- Integrated log filtering within the execution log viewer on the Role Detail page
- Status-in-tab (favicon) for active approval counts or blocked agent status — low effort, high ambient value
- SWR for dashboard data freshness rather than timer-based polling where WebSockets are not needed

**Patterns to avoid**

- Treating NBIAI as primarily a read-only observation tool — the distinction between viewing and acting must be architecturally clear in the UI

---

### 1.3 Retool

**What it does**

Retool is a low-code internal tooling platform. Companies use it to build admin panels, data dashboards, approval queues, and operations tools without building custom UIs from scratch. Its own UI — the Retool app builder and dashboard — is a reference for how internal operators interact with data-dense tables, forms, and status indicators.

**Key UI Patterns Relevant to NBIAI**

- **Primary / secondary / tertiary data hierarchy in tables:** Retool's design guidance explicitly groups table column data into three tiers. Primary data (the thing you scan for) is full weight and full colour. Secondary data (context, detail) is lighter. Tertiary data is hidden in tooltips behind an info icon. NBIAI's tables — agent list, task list, finance tables — should use this exact model.
- **Left-align text, right-align numbers:** Retool enforces this as a default. Text columns read naturally left-to-right. Number columns align to the right so decimal points and figures line up vertically for comparison. NBIAI's finance screens (cost figures, token counts, budget percentages) must follow this.
- **Status indicators with icons, not text alone:** Retool replaces text status labels with coloured icons or small coloured dots in tables wherever the column is narrow. Text confirmation is preserved in a tooltip. This keeps tables dense without sacrificing legibility.
- **Filter placement and progressive disclosure:** Primary filters sit above the table (always visible). Secondary filters are in a collapsible panel. A tag system shows which filters are currently active. When no filter is active, the filter bar is minimal; when filters are applied, the bar shows what is applied clearly.
- **Segmented controls for single-option selection:** For view toggles (e.g. Kanban / Table), segmented controls are preferred over dropdowns because they show all options simultaneously without requiring a click to open. The NBIAI pipeline view toggle already uses this pattern — it is the right choice.
- **Expandable rows for nested detail:** Rather than navigating away to a detail page for every record, Retool uses expandable rows to show secondary content inline. For NBIAI's execution log runs (collapsed row → expand → full log), this is the correct model.
- **Form layout by complexity:** Retool recommends three form layouts: individual editable (few fields, non-destructive), group editable (many fields, complex validation), and modal editable (requires full attention, blocking). NBIAI's "Hire Agent" dialog is a complex form — the group editable pattern applies.
- **Sidebar filters for full-screen dashboards:** On full-screen views, Retool moves filters to a hideable sidebar rather than a top bar. For NBIAI's Approvals Page, the left column already functions this way — it is a filter/list panel, not a form.

**What they do well**

- The table design guidance is the most actionable of any product reviewed. The three-tier data hierarchy is applicable directly to every NBIAI table.
- The filter visibility model (active filters always shown, inactive filters minimal) reduces cognitive load without hiding state.
- The segmented control preference over dropdowns for view toggles is a small but high-impact pattern.

**What they do poorly / where NBIAI can differentiate**

- Retool's own UI is cluttered with configuration chrome (component library panels, property editors, canvas grids). This is unavoidable for a builder tool but should not inform NBIAI's consumer-side design.
- Retool does not have an approval workflow model. Its closest equivalent is a form submission — not the deliberate, consequential approval decision that NBIAI requires.
- Retool tables are generic. NBIAI tables can be purpose-built with agent-specific context (model tier badges, budget spend bars, status indicators) that Retool cannot natively support.

**Patterns to adopt**

- Three-tier data hierarchy in all NBIAI tables
- Left-align text, right-align numbers as a hard rule across all financial data
- Status indicators using icon + colour, with text label in tooltip for narrow columns
- Filter tag indicators showing active filter state
- Expandable rows for execution log entries
- Segmented controls for view toggles (already correct in the spec)
- Modal form pattern for complex multi-field dialogs like Hire Agent

**Patterns to avoid**

- Generic "add any column" table flexibility — NBIAI tables have defined schemas; column choice should be purposeful, not configurable by end users

---

### 1.4 Dagster

**What it does**

Dagster is a data orchestration platform. It manages and monitors pipelines, assets, and jobs — collections of automated tasks that must execute in defined sequences. Its UI is purpose-built for ops teams monitoring job execution, catching failures, and understanding data lineage. It is the closest structural analogue to NBIAI's agent orchestration model.

**Key UI Patterns Relevant to NBIAI**

- **Unified command centre homepage:** Dagster's new homepage aggregates the most important signals in one place so operators can "quickly identify failing assets and jobs" without drilling into individual pipelines. The design principle is immediate triage — the homepage answers "what needs my attention right now?" before anything else. This maps directly to NBIAI's Command Centre purpose.
- **Health indicators as primary status markers:** Each asset/job in Dagster displays a health indicator that "doubles as a quick report card." Hovering reveals a detailed diagnostic breakdown. The indicator is not just a colour dot — it encodes multiple conditions (failing, degraded, stale, healthy) in a compact space.
- **Faceted lineage views with toggleable density:** Dagster lets users toggle between a minimal asset graph (names only) and an enriched view (owners, automation conditions, materialisations, health). This progressive disclosure model prevents the full-detail view from being overwhelming. NBIAI's Org Chart could benefit from this: a minimal view (role name + status only) and a detailed view (model tier, current task, reports-to).
- **Time-series trending with week-over-week comparison:** Dagster surfaces trend data at both the asset and job level, enabling "spot outliers before they become real problems." For NBIAI's agent performance metrics, a simple sparkline showing task completion trend over the last 7 days would follow this pattern.
- **Side-by-side comparison dashboards:** Dagster supports comparing up to five pipelines side by side. For NBIAI, this is less applicable to v1 but suggests that comparative agent performance (e.g. comparing task throughput across agents) is a high-value future feature.
- **Scoped visibility (pinned views):** Users can pin the assets and jobs they care about most. For NBIAI, Glen's frequent agents (CEO, CFO, CMO) are likely candidates for a pinned / favourited status on the Agent Status widget.
- **Status freshness as a time dimension:** Dagster evaluates assets against "freshness policies" — a deadline condition (e.g. "should have been updated by 10:00 AM"). If stale, the asset is flagged. For NBIAI's agents, the `last_heartbeat_at` field could surface as a staleness indicator: an agent whose last heartbeat was > 30 minutes ago should display a freshness warning even if its status shows "Idle."

**What they do well**

- The health indicator model (single compact element encoding multiple conditions) is more informative than a simple green/red dot.
- The progressive disclosure on lineage/detail views is the right answer for a 18-node org chart that can become visually overwhelming if all detail is shown simultaneously.
- The "what needs my attention right now" framing for the homepage is the correct question to answer first.

**What they do poorly / where NBIAI can differentiate**

- Dagster's UI is technically complex. The concept of assets, partitions, software-defined assets, and materialisation events creates a steep learning curve. NBIAI's user base is Glen and a small team — the conceptual model should be simpler.
- Dagster does not have approval workflows. It is a monitoring tool, not an action surface.
- The visual design is functional but not refined. NBIAI can achieve the same information density with significantly higher visual quality.

**Patterns to adopt**

- Homepage as an "immediate triage" surface answering "what needs attention"
- Health indicators encoding multiple conditions in a compact element beyond a simple status dot
- Progressive disclosure on the Org Chart (minimal view default; detail view on hover or toggle)
- Staleness indicators for agents based on `last_heartbeat_at` — not just operational status but temporal freshness
- Sparkline trend displays for agent performance metrics on the Role Detail page

**Patterns to avoid**

- Technical complexity in the conceptual model — NBIAI's operators are not data engineers
- Dense graph visualisations without progressive disclosure toggle

---

### 1.5 Windmill

**What it does**

Windmill is an open-source developer platform for building, deploying, and monitoring internal automation scripts and workflows. It is an alternative to Retool for building internal tools and an alternative to Airflow/Temporal for workflow orchestration. It supports AI agent steps within workflows.

**Key UI Patterns Relevant to NBIAI**

- **Metrics and observability integration:** Windmill provides real-time dashboards showing execution rates, success ratios, performance distributions, and resource utilisation. These metrics are exportable to Prometheus. For NBIAI, the agent performance metrics (task throughput, average completion time, escalation rate) follow the same monitoring model — operational metrics that need to trend over time, not just show a point-in-time value.
- **Workflow DAG visualisation:** Windmill auto-generates dependency DAGs (Directed Acyclic Graphs) showing execution flow. For NBIAI's org chart, the hierarchical tree is a simpler version of this — parent-child relationships shown as a connected graph. Windmill's approach of using SVG paths with smooth bezier curves for connections is the same approach the NBIAI design spec defines.
- **Agent memory and conversation context display:** Windmill's AI agent steps maintain conversation memory across interactions. The UI surfaces this as a contextual thread. For NBIAI's execution log, showing the agent's "conversation" (tool calls, reasoning steps, outputs) as a threaded log rather than flat text is a pattern Windmill validates.
- **Alert configuration on performance thresholds:** Windmill allows setting alerts on failure rates or performance degradation. For NBIAI, this maps to the notification bell — alerts when an agent is blocked, a budget is approaching its cap, or an approval request has aged beyond a threshold.
- **Chat mode for workflows:** Windmill's "Chat Mode" transforms a workflow into a conversational experience with a maintained context panel alongside the execution view. For NBIAI's Task Detail, the activity log (threaded comments and status changes) follows this conversational thread model.

**What they do well**

- The metrics and observability model is mature — Windmill treats monitoring as a first-class concern, not an afterthought.
- The alert configuration on thresholds (not just on binary failure) is more nuanced than most tools.
- The conversational thread model for agent execution context validates NBIAI's task activity log approach.

**What they do poorly / where NBIAI can differentiate**

- Windmill's UI is functional but aesthetically unrefined — it prioritises feature coverage over design quality. NBIAI has the opportunity to deliver the same functional depth with a substantially higher standard of visual design.
- Windmill does not have an approval gate model for human-in-the-loop decisions. Its closest equivalent is waiting on an external event.
- Windmill's conceptual model (scripts, flows, apps) does not map to an org chart of human-like roles.

**Patterns to adopt**

- Threshold-based alerts, not just binary failure alerts (relevant to budget cap warnings and approval age warnings)
- Prometheus-style metric collection as a model for agent performance data shape
- Threaded conversation model for execution logs (tool calls, reasoning, outputs as a sequence)

**Patterns to avoid**

- The Windmill UI aesthetic of dense grey panels with many small controls — this creates visual fatigue in an application used for hours at a time

---

### 1.6 Airplane.dev

**What it does**

Airplane (acquired by Airtable, but its design patterns remain relevant) was a developer platform for building internal tools — approval flows, admin panels, operations runbooks, and data workflows. It is notable for its explicit support for approval workflows as a first-class feature within automated task execution.

**Key UI Patterns Relevant to NBIAI**

- **Approval flows as a first-class workflow primitive:** Airplane built approval gates directly into the task execution model. An agent (or script) could reach a checkpoint, emit a request for approval with context, pause execution, and resume only when a human approved. This is exactly the NBIAI approval model. The UX implication: the approval request must carry complete context (what is being proposed, why, what the agent intends to do after approval) without requiring the reviewer to drill elsewhere.
- **Long-running workflow support (up to 60 days):** Airplane tasks could pause and wait indefinitely for external approval before resuming. This validates NBIAI's Approvals Page design — approvals are not transient notifications but persistent records of a paused execution state. The age indicator on pending approvals (2h ago, 24h ago, 3 days ago) reflects real operational reality.
- **Displays as structured output:** Airplane introduced "displays" — formatted output panels within a run UI that render markdown, tables, JSON, or file content. For NBIAI's Approvals Page, the "Full Content" block for an email approval mirrors this pattern: structured presentation of the agent's proposed output, not raw JSON.
- **Role-scoped approval permissions:** Airplane implemented granular role permissions for approvals — only members of the `eng-managers` group could approve production deployments. For NBIAI, only the Board user can approve, but the same permission scoping principle applies: approvals are not visible to Viewers, and the Approvals nav item is hidden for non-Board users.
- **Prompt (gather input) as a workflow step:** Airplane's "prompts" allowed a workflow to pause and gather structured input from a human before continuing. This is distinct from approval (binary yes/no) — it is a request for information. NBIAI's "Request Changes" action on an approval maps to this: not a rejection, but a structured request for the agent to revise.

**What they do well**

- The clean separation between "approve" (binary, proceed), "request changes" (revise and resubmit), and "reject" (terminate) as three distinct action states with different downstream behaviours is the correct model for NBIAI.
- Contextual completeness on approval requests — the reviewer should never need to open another tab to understand what they are approving.
- The age indicator as an escalation signal: approvals that have been waiting for days require different urgency treatment than approvals that arrived an hour ago.

**What they do poorly / where NBIAI can differentiate**

- Airplane did not have an agent persona model — it was scripts, not roles. NBIAI's approvals carry the full context of which agent (with a persona, role, and organisational position) is requesting approval, which adds trust and interpretability.
- Airplane lacked the "why now" explanatory context that NBIAI's Context block provides.

**Patterns to adopt**

- Three distinct approval outcomes with different visual and semantic treatment: Approve (green), Request Changes (amber), Reject (red)
- Age as an escalation signal on pending approvals — amber at >24h, red at >72h
- Complete contextual package on every approval request (what, why, full content) with zero external navigation required
- Approval records as persistent paused execution states, not transient notifications
- Structured output display (email as email, financial data as structured fields) not raw JSON

**Patterns to avoid**

- Approval flows that look like a notification inbox — approvals are consequential decisions, not dismissable alerts

---

### 1.7 Anthropic Console

**What it does**

The Anthropic Console is the control plane for Anthropic API users — organisations managing API keys, monitoring token usage, tracking costs, and managing workspace members. It is the direct reference point for how NBIAI should display agent costs, token consumption, and API key configuration.

**Key UI Patterns Relevant to NBIAI**

- **Bar charts as the primary cost visualisation:** The Console uses bar charts (not line charts) to display daily token usage and daily cost. Bar charts are better for daily granularity because each bar is a discrete time unit — users immediately understand "Thursday cost more than Wednesday." Line charts imply continuity between points; cost data is not continuous.
- **Multi-level filter system for cost data:** The Console filters cost data by workspace, model, time period, and API key — four independent filter dimensions. For NBIAI's Finance screen, filtering agent costs by model tier, time period, and specific agent follows this exact model.
- **Input/output token split as the primary breakdown:** The Console always shows input and output tokens separately, never just a total. This is because input tokens (often dominated by system prompt and context) behave differently from output tokens (generated by the model). NBIAI's execution log cost display should show input/output/cached breakdown, not just a dollar total.
- **Rate limit visualisation:** The Console shows rate limit utilisation (tokens per minute vs limit) as a separate monitoring view. For NBIAI, this maps to budget cap utilisation — the `ProgressBar` on the Role Detail budget stat is the compact equivalent.
- **Workspace-scoped cost tracking:** API costs are scoped by workspace (organisation unit) as well as API key. For NBIAI, agent-level budget tracking (already in the data model as `monthly_budget_cap_usd`) follows the same scoping principle.
- **Model-specific cost display:** The Console shows costs by model separately because Opus costs more per token than Sonnet. For NBIAI's Finance screen, cost data should be attributable to specific model tiers, not aggregated. A single total is not sufficient for a multi-model system.
- **CSV export for external analysis:** The Console offers CSV export for all cost and usage data. NBIAI's Finance tab should offer the same — Glen may want to run cost analysis outside the app.

**What they do well**

- The input/output token split is the correct presentation for cost data in a multi-model system.
- The bar chart choice for time-series cost data (discrete daily units) is correct and should be adopted for NBIAI.
- The multi-level filter system gives users fine-grained visibility without burying them in noise.

**What they do poorly / where NBIAI can differentiate**

- The Anthropic Console is a management UI, not an agent orchestration UI. It does not show agent status, org charts, approval flows, or task management.
- The Console's visual design is functional but not distinctive — NBIAI can deliver the same cost data transparency with a significantly more refined visual presentation.
- The Console shows only Anthropic-sourced costs. NBIAI's cost model includes human payroll, operating costs, and projected revenue — a substantially richer financial picture.

**Patterns to adopt**

- Bar charts (not line charts) for daily/weekly cost and token usage data
- Input/output/cached token breakdown in every execution cost display
- Multi-level filter system for the Finance screen (by agent, by model tier, by time period)
- Model-tier-specific cost attribution (not just total)
- CSV export for financial and usage data

**Patterns to avoid**

- Showing only a single cost total without model-tier breakdown
- Line charts for discrete-time cost data
- Aggregating input and output tokens into a single "tokens used" figure

---

### 1.8 Paperclip

**What it does**

Paperclip (github.com/paperclipai/paperclip) is the direct architectural reference for the NBIAI app. It is an open-source Node.js + React platform that orchestrates a team of AI agents to run a business. It provides an org chart, goal management, task tracking, cost monitoring, and a governance model where the human operator (the board) approves agent actions. It is the closest functional analogue to the NBIAI app in existence.

**Key UI Patterns Relevant to NBIAI**

- **Task-manager appearance with agent-company underlying model:** Paperclip intentionally looks like a task manager (familiar, navigable) but carries agent-company concepts underneath (org charts, budgets, governance, goal alignment). This is the right design tension for NBIAI — the interface should feel familiar to someone who has used Linear or Jira, but the mental model should be organisational, not project-based.
- **Org chart with roles, titles, and reporting lines:** Paperclip gives every agent a role, a title, and a reporting line as primary identity. Visual representation in the org chart is the central navigation pattern for understanding the company structure. Agents are not items in a list — they are nodes in a hierarchy.
- **Ticket-based task model with threaded conversations:** Paperclip uses tickets (tasks) as the atomic unit of work. Conversations are threaded within tickets. This maps exactly to NBIAI's Task Detail page with an activity log.
- **Per-agent budget caps with throttling:** Monthly budget caps per agent with automatic throttling when limits are reached. The budget cap is a governance control, not just a reporting metric. NBIAI's `monthly_budget_cap_usd` field and the ProgressBar on the Role Detail budget stat implement this correctly.
- **Immutable audit log:** Every tool call, decision, and agent response is logged immutably. This is not just a debugging tool — it is a governance record. For NBIAI, the execution log on the Role Detail page and the task activity log serve this function. They should be clearly framed as audit records, not just history.
- **Board governance model:** The human operator is positioned above the CEO agent, as a board chair. Approval gates exist for hires, strategic decisions, and external actions. NBIAI's Approvals Page is the implementation of this governance model.
- **Goal ancestry on tasks:** Paperclip propagates full goal ancestry to tasks so agents know why they are doing what they are doing. For NBIAI, the task description and the project context it belongs to carry this information.
- **Company-scoped architecture:** All entities (agents, tasks, costs, approvals) are scoped to a single company. NBIAI's singleton Company model follows this directly.

**What they do well**

- The governance model architecture is well thought through — the distinction between proposing (pausing for approval) and committing (executing after approval) is exactly right.
- Per-agent budget caps as a governance control (not just a reporting feature) is a design insight: budget limits are a form of human oversight, not just financial management.
- The audit trail framing (immutable, traceable, every decision recorded) gives operators confidence that nothing happens without a record.

**What they do poorly / where NBIAI can differentiate**

- Paperclip's UI is described as functional but not visually refined. Its design priority was correctness of model over visual quality.
- The NBIAI design spec, with its complete design system, LCH-aware colour approach, and pixel-level component definitions, is materially ahead of Paperclip's design quality. This is the primary differentiator.
- Paperclip does not have a Finance tab with revenue tracking, payroll, cash flow modelling, or NSI scenario analysis. These are NBIAI-specific features that Glen's particular business situation requires.
- Paperclip does not have a Leads & Clients CRM tab. NBIAI's CMO-managed pipeline is a significant functional extension.

**Patterns to adopt**

- The board-as-human-operator governance framing as an explicit UI concept (the Glen Pryer root node in the org chart, the approvals model)
- Per-agent budget caps displayed as progress bars relative to monthly caps, not just raw numbers
- Immutable audit trail framing for the execution log and task activity log
- Task-manager appearance with agent-company model underneath
- Goal ancestry visible in the task context (project → goal → task hierarchy)

**Patterns to avoid**

- Paperclip's functional-but-unrefined visual approach — NBIAI's design quality is the differentiator

---

## 2. Usability Best Practices

---

### 2.1 Real-Time Agent/Process Monitoring UIs

**Core principle:** Operational monitoring dashboards exist to answer one question: "what needs my attention right now?" All design decisions should serve this question before any other.

**Key findings:**

- **Hierarchy by urgency, not by recency:** Most tools default to reverse-chronological order. Monitoring dashboards should default to urgency order — blocked items first, then in-progress, then idle. The NBIAI Agent Status widget defaults to "All" filter — this should be reconsidered in favour of showing blocked and active agents at the top.
- **Skeleton states that match layout precisely:** Users have been shown that skeleton loaders reduce perceived load time and anxiety. The skeletons must match the actual content layout. Generic grey blocks in the wrong proportions are worse than a spinner. NBIAI's spec defines skeletons per widget — this is correct.
- **Smooth transitions for live data updates:** When an agent's status changes, the row should update in place with a brief transition (80–200ms). Abrupt content replacement is jarring. NBIAI's spec defines an 800ms `bg-accent-muted` flash on agent status change — this is on the longer end; research suggests 200–400ms is more appropriate to avoid the flash feeling like an error state.
- **"Last refreshed" timestamps for data credibility:** Operational tools should show when data was last updated. If a user is watching a dashboard and nothing appears to be changing, "Last updated 2 minutes ago" prevents the assumption that the tool is broken.
- **Limit visible primary elements to five:** Research consistently shows that beyond five primary elements, cognitive processing slows and users begin to scan rather than read. NBIAI's Quick Stats bar at four items is within the limit. Expanding to more than five stat cards in v2 should be carefully considered.
- **Metric trends alongside current values:** A current value without trend context is ambiguous. "3 agents active" is neutral information; "3 agents active (up from 0 an hour ago)" is meaningful. Sparklines or delta indicators on stat cards give current values temporal context.
- **Heartbeat staleness as a distinct status:** An agent that last reported status 2 hours ago but is technically marked "Idle" should be visually distinguishable from an agent that reported 2 minutes ago and is also "Idle." Temporal freshness is a dimension separate from operational status.

---

### 2.2 Information Hierarchy in Data-Dense Dark Dashboards

**Core principle:** Density and clarity are not opposites. High-density UIs fail when everything is rendered at equal visual weight. They succeed when a strict hierarchy of weights, opacities, and sizes creates a clear reading order.

**Key findings:**

- **Three-level opacity system:** The most effective dark dashboards use three distinct text opacity levels — primary (full opacity, ~94%), secondary (~63%), and muted (~37%). The exact values matter less than the consistency of their application. NBIAI's design spec defines `text-primary` (#F1F1F5), `text-secondary` (#A0A0B0), and `text-muted` (#5C5C70) — this is correct and complete.
- **Background as depth signal, not decoration:** Layered backgrounds (each layer slightly lighter) communicate depth without borders. NBIAI's `--bg-base`, `--bg-surface`, `--bg-elevated`, `--bg-highlight` system follows this correctly. The key is maintaining the layering discipline — elevated elements must always be lighter than their container.
- **Borders as primary depth signal over shadows:** In dark UIs, shadows lose effectiveness (dark on dark has insufficient contrast). Borders are more reliable as depth signals. NBIAI's spec explicitly states "Borders are the primary depth signal in this design. Shadows are used sparingly." This is correct.
- **Colour reserved for semantic meaning only:** In high-density dark dashboards, every instance of colour that does not carry semantic meaning increases cognitive load. The accent colour (`#4F6EF7`) should appear only on interactive elements and active states. Status colours (green, amber, red, blue, grey) should appear only on status badges. Any other use of colour is noise.
- **Inverted pyramid layout:** The most critical information sits at the top-left of a dashboard. Secondary information is below and to the right. This matches natural scanning patterns (F-pattern and Z-pattern eye tracking). NBIAI's Command Centre layout (Stats across top, Active Projects top-left of second row, Agent Status top-right) follows this correctly.
- **Progressive disclosure for overwhelming detail:** Sections with high information density (system prompt, execution log) should be collapsed by default with a clear expand affordance. Users who need the detail know to expand; users who do not need it are not burdened by it.

---

### 2.3 Status Badge and Colour Semantics

**Core principle:** The RAG (Red, Amber, Green) system is universally understood and should not be subverted. The challenge is ensuring the colour semantics are consistent and not overloaded.

**Key findings:**

- **RAG is inviolable:** Red = critical/blocked/error/rejected. Amber = caution/in-progress/at-risk/approaching limit. Green = healthy/active/done/on-target. Deviating from this in any direction (e.g. using red for a "CRITICAL" priority label when the item is not actually in a critical state) trains users to distrust the colour system.
- **Blue for "in-flight / pending / informational":** The extension of RAG to include blue (for assigned, in-review, pending states) is well-established in design systems including Atlassian, IBM Carbon, and Adobe Spectrum. NBIAI's `--status-blue` (`#4F6EF7`) for "Assigned" and "In Review" task states is correct.
- **Grey for neutral / inactive / historical:** Grey badges (IDLE, VACANT, PAUSED, COMPLETE) signal "nothing happening, no action required." This is distinct from amber (something happening, monitor) and red (something wrong, act now).
- **Icon + colour redundancy is required:** Approximately 1 in 12 men is colour-blind. A status that relies on colour alone is inaccessible. Every status badge in NBIAI carries a text label. The small dot within the badge provides colour reinforcement. For colour-blind users, the text label is the primary signal — the badge label must be unambiguous.
- **Consistent badge shape:** Pill-shaped badges (rounded-full) are used for status. Rectangular badges (rounded-sm or rounded-md) are used for category labels (model tier, engagement type). This distinction prevents confusion between "what state is this in" and "what category is this."
- **Badge sizing discipline:** Status badges in table rows must be compact enough not to dominate the row height. NBIAI's `text-[11px] font-semibold uppercase tracking-wider` with `px-2 py-0.5` is appropriately compact.
- **Do not create new colours for new states:** Adding a purple badge for a new state is tempting but breaks the semantic system. New states must be expressed using the five defined status colours with appropriate labels.

---

### 2.4 Navigation Patterns for Multi-Section Internal Tools

**Core principle:** Sidebar navigation is correct for applications with 5 or more primary sections. The NBIAI app has 8 primary sections — sidebar is the only appropriate pattern at this scale.

**Key findings:**

- **Sidebar for primary navigation (8+ sections):** Research and design system guidance consistently recommends sidebar navigation for 5+ sections. At 8 sections, a top navigation bar would be cramped on smaller screens and would not support the badge/count pattern needed on the Approvals item.
- **Collapsible sidebar as standard:** Collapsible sidebars (expanded to show icon + label, collapsed to icon only) are now standard for data-heavy internal tools. Users with wide monitors want the space; users with narrow monitors need it. State should persist in localStorage.
- **Tab navigation for sub-sections within a page:** Within a primary section (Finance, Leads & Clients, Settings), tab navigation is appropriate for switching between related views. The pattern: horizontal tab bar below the page header, using an underline active indicator (not a background fill). NBIAI's spec uses this correctly.
- **Vertical tabs for Settings:** Settings pages commonly use a vertical tab list on the left when the settings categories are numerous (6+ categories). NBIAI's Settings spec defines a vertical tab list at `w-[180px]` — this is the right approach at 6 settings sections.
- **Breadcrumbs for deep navigation:** When navigating to a project → task → detail page, breadcrumbs in the page header (`< Projects > NBIAI App > Task #42`) provide orientation and one-click escape. The NBIAI spec uses back-button patterns (e.g. `< Projects` label with chevron) for depth navigation — this is cleaner than full breadcrumbs for the current depth.
- **Active state legibility:** The active nav item must be unambiguous. A left border accent + background tint combination is more legible than background tint alone. NBIAI's spec defines `bg-highlight` + `border-l-2 border-accent` for active state — this is correct.
- **Badge placement on nav items:** Notification badges on nav items (pending count, task count) should use a fixed-size circle (`16px`) positioned absolute top-right of the icon. This follows the established iOS/Android convention that users recognise immediately. NBIAI's spec defines this correctly for the Approvals item.

---

### 2.5 Approval Workflow UX

**Core principle:** Approval interfaces are consequential. The UX must prevent both under-attention (approving without reading) and over-friction (so much friction that approvals are delayed indefinitely).

**Key findings:**

- **Complete context on one screen:** The single most important design rule for approval workflows is that the reviewer must not need to navigate elsewhere to understand what they are approving. If reviewing an email approval requires opening a separate window to understand context, the review will be rushed or the approval will be delayed. NBIAI's Approvals Page provides all context (context block, full content block) in the right pane — this is correct.
- **Clarity over density in the content block:** Research (Airplane, Permit.io, human-in-the-loop UX literature) consistently recommends summarising context rather than exposing raw technical data to reviewers. For NBIAI, the "Full Content" block should render the email as an email (formatted), not as raw text. The agent's reasoning (Context block) should be plain prose, not a JSON trace dump.
- **Three distinct outcomes, not two:** Binary approve/reject systems create pressure to approve rather than escalate. A three-option system (Approve, Request Changes, Reject) gives reviewers a path that is not a full rejection. "Request Changes" is particularly important for NBIAI because it allows iterative refinement without terminating the agent's goal.
- **Required comment for rejection and changes:** Requiring a comment for reject and request-changes actions forces the reviewer to articulate why. This comment is then visible to the agent (and in the audit trail) and creates accountability for decisions in both directions.
- **Age as urgency signal:** Pending approvals that have been waiting for more than 24 hours represent delayed agent execution. The age indicator should escalate visually: neutral below 24h, amber at 24–72h, red beyond 72h. This matches Airplane's pattern and the temporal urgency of paused agent execution.
- **Auto-select the oldest pending item:** On the Approvals Page, auto-selecting the oldest pending item on mount ensures the most-urgent approval is always addressed first. FIFO ordering (oldest at top) matches the natural urgency of paused agent execution.
- **Provisional state language:** Approval requests should present AI-generated content with visual "pending review" framing — not as finished, committed content. The "FULL CONTENT" label over an email draft, presented within a styled email frame, signals "this is proposed, not sent."

---

### 2.6 Kanban vs Table View for Pipeline Management

**Core principle:** Both views have legitimate use cases. The answer for NBIAI is to provide both and let the user choose — defaulting to Kanban for spatial pipeline overview and Table for data-dense comparative analysis.

**Key findings:**

- **Kanban is better for spatial understanding and stage bottleneck identification:** A kanban board makes it immediately visible when one stage has many cards and another is empty — a bottleneck. This is the primary purpose of the BD Pipeline view: understanding where leads are stuck. Table view cannot reveal this at a glance.
- **Table is better for data comparison across leads:** When comparing expected values, probabilities, last contact dates, and owners across multiple leads simultaneously, a table is more efficient than opening individual kanban cards.
- **Drag-and-drop is the right interaction for kanban stage changes:** Moving a card between columns to advance a lead's stage is significantly faster than editing a dropdown field in a form. The kinesthetic feedback of dragging a card "forward" in the pipeline also reinforces the metaphor of progress.
- **Column headers as stage visualisation:** The colour progression from grey (Identification) through blue (Outreach, Discovery) to amber (Proposal) to green (Close) provides a visual progress metaphor. Users read left-to-right — cards in the rightmost columns are the most advanced opportunities. NBIAI's spec already implements this correctly.
- **Card content hierarchy:** A kanban card should show only what is needed to distinguish one card from another and act on it. For NBIAI's KanbanCard: company name (primary), last contact date (urgency signal), next action (what to do). Owner and contact are secondary. The overdue colouring on last contact date (amber >14 days, red >30 days) is critical — it is the primary urgency signal in the pipeline.
- **View toggle should preserve filter state:** When a user switches from Kanban to Table view (or back), any active search or status filter should be preserved. The view is a presentation choice, not a navigation event.

---

### 2.7 Cost and Token Display Patterns in AI Tooling

**Core principle:** AI cost data is multi-dimensional (model tier, input/output split, cached vs uncached, time period). Aggregating it into a single dollar figure destroys the actionable signal. Maintain the breakdown.

**Key findings:**

- **Separate input and output tokens:** Input tokens (dominated by system prompt and context window) and output tokens (generated responses) have different per-token costs and different optimisation levers. Showing only a total token count conceals the actionable split. NBIAI's execution log spec shows `[tokens] tok` as a single figure — this should be expanded to input/output/cached.
- **Bar charts for daily cost data:** Daily cost data is discrete (each day is a unit) — bar charts are appropriate. Line charts imply continuous data and make daily cost spikes harder to read. Anthropic Console uses bar charts; NBIAI's Finance screen uses a flex bar chart for 3-month cash flow — the same pattern should apply to agent cost charts.
- **Cost per execution run as a primary metric:** The most actionable cost display for an operator is not total monthly spend, but cost per individual execution run. "This run cost $0.043 on 14,203 tokens" directly informs decisions about system prompt length, task decomposition, and model tier selection. NBIAI's execution log spec already includes this per-run cost display — this is correct.
- **Budget cap utilisation as a progress bar:** Expressing budget utilisation as a progress bar (with green/amber/red thresholds) is more intuitive than a raw number. "£42.18 of £100.00" is a ratio, not just two numbers. NBIAI's Role Detail budget stat with `ProgressBar` is correct.
- **Model-tier cost attribution:** In a multi-model system (Opus vs Sonnet vs Haiku), costs must be attributable to model tier. A system where Opus agents are significantly more expensive than Sonnet agents requires this breakdown to make good cost management decisions. NBIAI's agent-level budget tracking does this at the agent level (since each agent has a model tier). A model-tier aggregate view at the company level would be a valuable Finance screen addition.
- **Monospace font for financial figures:** Cost and token figures should be displayed in a monospace font (`JetBrains Mono`) so that decimal points align vertically in tables. NBIAI's spec already specifies this via the `Mono Body` and `Mono Small` type levels.

---

## 3. Synthesis: 10 Most Important UI/UX Decisions

These are the ten decisions that will have the greatest impact on the quality and usability of the NBIAI app, based on the research above. Each decision is framed as a specific choice the design must make.

---

### Decision 1: The Command Centre must answer exactly three questions

Based on Vercel's "three primary signals" discipline and Dagster's "immediate triage" homepage philosophy.

The Command Centre must answer: (1) Is anything blocked right now? (2) Is anything waiting for my approval? (3) What is the current activity of the company?

Everything else on the dashboard — the active projects widget, the agent status feed, the activity feed — is supporting context. The Quick Stats bar (specifically the "Tasks Blocked" card with red colouring and "Pending Approvals" with red colouring when non-zero) must make the answer to these three questions scannable in under three seconds.

**Design implication:** The Quick Stats bar is the most important element on the Command Centre. It must load first (skeleton priority), be positioned at the very top, and use strong semantic colour only when action is required. A dashboard with no blocked tasks and no pending approvals should look calm — no red anywhere.

---

### Decision 2: The left-border active indicator is the primary selection signal

Based on Linear's active item indicator pattern and its superiority over background-fill-only selection.

The left border accent (`border-l-2 border-accent`) on active/selected items is not merely decorative. It is a directional reading cue that creates spatial orientation in a dense list. Applied consistently — sidebar active item, selected approval in the list pane, selected row in a table — it trains users to scan the left edge for orientation.

**Design implication:** The current design spec already defines this pattern for the sidebar and the ApprovalListItem. It must also be applied to table row selection states where a row is the "current item" in a master-detail layout (e.g., the Approvals list-detail pane).

---

### Decision 3: Status badges encode five semantic states, not more

Based on the RAG colour semantics research and design system analysis.

The five status colours (green, amber, red, blue, grey) must cover every status state in the application. No new colours should be introduced for new states. The risk is that as NBIAI evolves and new states emerge (e.g. "Reviewing", "Queued", "Archived"), there will be pressure to introduce new colours. Each new colour added to the badge system reduces the legibility of the system as a whole.

**Design implication:** All new status states must be mapped to one of the existing five colours during design review. The label text distinguishes states within a colour (e.g. both "ASSIGNED" and "IN REVIEW" use `--status-blue` but different labels). This is already correct in the spec — it must be enforced during implementation.

---

### Decision 4: Approval requests are read as documents, not forms

Based on Airplane's approval workflow patterns and human-in-the-loop UX research.

The Approvals right pane is not a form. It is a document reading experience followed by a decision action. The visual design must reflect this: generous reading space (not cramped), clear typographic hierarchy (context block as prose, content block as a formatted document), and the action area clearly separated and sticky at the bottom.

**Design implication:** The "FULL CONTENT" block for email approvals must render as a styled email (subject + recipients as metadata, body as readable prose in `Body text-secondary`). The agent's reasoning in the "CONTEXT" block must be prose, not a bullet list of technical metadata. The action buttons must be clearly the decision moment — not crowded with the content above them.

---

### Decision 5: Agent health combines status and temporal freshness

Based on Dagster's freshness policy model and real-time monitoring research.

An agent's operational status (Active, Idle, Blocked) tells you what the agent is doing. An agent's heartbeat freshness tells you whether the status reading is trustworthy. An agent that is marked "Idle" but has not sent a heartbeat in 2 hours may be offline, hung, or experiencing an unreported error.

**Design implication:** A "stale" indicator (distinct from status) should appear on agent nodes when `last_heartbeat_at` exceeds a threshold (e.g. 30 minutes). This is a gap in the current design spec — the AgentAvatar and StatusBadge only reflect operational status, not heartbeat freshness. A small `Clock` icon in amber on a stale agent node would surface this without cluttering the primary status display.

---

### Decision 6: Execution logs show cost at the run level, with input/output breakdown

Based on Anthropic Console patterns and LLM cost display best practices.

The execution log entry in the Role Detail page currently shows a single token count and a single cost figure per run. This should be expanded to show the input/output/cached token split. The reason: system prompt length (input tokens) is within Glen's control. Generated response length (output tokens) is influenced by task decomposition. These are different cost levers.

**Design implication:** The execution log collapsed row should show total tokens and total cost as primary figures. Expanding a row should reveal the input/output/cached breakdown as secondary detail. The expanded state is a natural progressive disclosure moment — users who care about cost optimisation can expand; users who just want to know if the run succeeded can read the collapsed row.

---

### Decision 7: Progressive disclosure is mandatory on the Org Chart

Based on Dagster's faceted lineage view approach and information hierarchy research.

The Org Chart tree currently shows role name, status badge, model tier badge, and current task (if running) simultaneously on every node. At 18 nodes, this creates a visually busy canvas. The node should have two states: default (role name + status badge only) and hover/selected (full detail including model tier, current task, reports-to).

**Design implication:** The `TreeNode` component should default to showing role title + StatusBadge only. On hover: model tier badge and current task (truncated) appear. The node does not grow — the hover state reveals within the same fixed dimensions, using smaller text or by replacing the status badge with more content in a compact layout. Clicking still navigates to the Role Detail page.

---

### Decision 8: The Activity Feed is a threaded audit record, not a news ticker

Based on Paperclip's immutable audit trail framing and Windmill's threaded conversation model.

The Activity Feed on the Command Centre and the Activity Log on the Task Detail page are not just "recent events" — they are audit records of consequential actions taken by agents on behalf of Glen's business. The framing should reflect this: entries are not notifications to dismiss, they are records to read.

**Design implication:** The Activity Feed should not auto-scroll or animate new items in aggressively. New items should appear at the top with a subtle fade-in (150ms, `ease-out`). Items that represent approval requests should be visually distinct from items that represent completed actions — the former require attention, the latter are records. A small "Requires action" accent (left border in `--status-amber`) on feed items that link to a pending approval would surface actionable items within the feed.

---

### Decision 9: The Kanban default with Table as an equal option

Based on kanban vs table view research and pipeline management UX patterns.

The BD Pipeline defaults to Kanban view because the spatial representation of pipeline stage distribution is the primary insight. However, the Table view is not a secondary feature — it is the right tool for comparing lead values, dates, and probabilities. Both views must be feature-complete and equally maintained.

**Design implication:** The view toggle in the current spec (segmented control, icon-only buttons) is correct. The implementation requirement is that: (1) filter state is preserved when switching views, (2) clicking a card/row in either view opens the same Lead Detail slide-over, and (3) the table view includes all fields visible across all kanban cards in columns. The view choice is a presentation preference, not a navigation event.

---

### Decision 10: Monospace data everywhere financial or technical figures appear

Based on Retool alignment guidelines, Anthropic Console patterns, and typographic best practices for data.

Any figure that a user might compare vertically (cost, token count, percentage, date, duration) must be in `JetBrains Mono`. This is not about aesthetics — it is about alignment. When £42.18 and £1,250.00 appear in the same column, the decimal point must align vertically for the values to be immediately comparable. Proportional (Inter) type breaks this alignment.

**Design implication:** All figures in all NBIAI tables must use `font-mono`. The `Mono Body` and `Mono Small` type levels defined in the design spec exist specifically for this. The risk is implementation drift — engineers defaulting to `text-sm` (Inter) for numeric table cells. The design spec already defines this correctly; it requires explicit enforcement in code review and QA.

---

*Sources consulted during research:*

- [How we redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Linear design: The SaaS design trend — LogRocket](https://blog.logrocket.com/ux-design/linear-design/)
- [Vercel Dashboard Redesign](https://vercel.com/blog/dashboard-redesign)
- [Vercel Project Dashboard Docs](https://vercel.com/docs/projects/project-dashboard)
- [Retool Design Documentation](https://docs.retool.com/education/coe/well-architected/design)
- [UI tips for efficient Retool dashboards](https://blog.boldtech.dev/ui-tips-efficient-dashboards-retool/)
- [Introducing the new Dagster+ UI](https://dagster.io/blog/introducing-the-new-dagster-plus-ui)
- [Windmill workflow automation docs](https://www.windmill.dev/docs/intro)
- [Airplane.dev multi-step workflows](https://www.airplane.dev/blog/introducing-powerful-multi-step-workflows-in-airplane)
- [Claude Console cost and usage reporting](https://support.claude.com/en/articles/9534590-cost-and-usage-reporting-in-console)
- [Paperclip GitHub repository](https://github.com/paperclipai/paperclip)
- [Paperclip: Open-Source AI Agent Orchestration — Abduzeedo](https://abduzeedo.com/index.php/paperclip-open-source-ai-agent-orchestration-builders)
- [UX Strategies for Real-Time Dashboards — Smashing Magazine](https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/)
- [Human-in-the-Loop UX — AufaitUX](https://www.aufaitux.com/blog/human-in-the-loop-ux/)
- [Human-in-the-Loop for AI Agents — Permit.io](https://www.permit.io/blog/human-in-the-loop-for-ai-agents-best-practices-frameworks-use-cases-and-demo)
- [Carbon Design System — Status Indicators](https://carbondesignsystem.com/patterns/status-indicator-pattern/)
- [Dashboard Design UX Patterns — Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards)
- [Sidebar Design Best Practices — ALF Design Group](https://www.alfdesigngroup.com/post/improve-your-sidebar-design-for-web-apps)
- [Tabs UX: Best Practices — Eleken](https://www.eleken.co/blog-posts/tabs-ux)
