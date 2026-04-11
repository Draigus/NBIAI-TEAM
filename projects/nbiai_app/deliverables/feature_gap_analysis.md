# NBI Dashboard -- Feature Gap Analysis

**Date:** 2026-04-06
**Author:** VP Product (AI)
**Scope:** Feature comparison against Targetprocess, Jira, Monday.com, Linear, Asana, ClickUp, Shortcut
**Target audience:** 5-50 person software team

---

## Current NBI Dashboard Capabilities (baseline)

- Task management: kanban board, list view, standup view
- Task hierarchy: parent/child tasks, task dependencies (blocking/blocked_by/related)
- Task states: backlog, assigned, queued, in_progress, blocked, review, done, cancelled
- Priority levels: critical, high, medium, low
- Task comments and activity log (comments, status changes, assignments, escalations)
- Project management: project list, project detail, project health (RAG), project status lifecycle
- Agent/role management: org chart, role detail, agent lifecycle, reporting hierarchy
- Approval workflow: Glen approval gates for external comms, financial, strategic decisions
- Finance module: revenue tracking, payroll (human + agent), execution cost tracking
- Client management: pipeline stages (identification through closed), client linking to projects
- Claude Desktop session tracking: queue, sessions, prompt assembly
- Authentication: JWT with refresh tokens, RBAC (board, admin, viewer)
- Settings: profile, notification preferences, theme/display, API keys
- Dashboard: KPI cards, charts (tasks by status, tasks by assignee)

---

## 1. MUST-HAVE -- Common across all tools, users expect these

These features appear in 5+ of the 7 tools researched. Their absence would make the NBI Dashboard feel incomplete to anyone who has used a modern PM tool.

### 1.1 Sprint/Cycle/Iteration Management

**Present in:** Jira (sprints), Linear (cycles), Shortcut (iterations), Asana (sprints), ClickUp (sprints), Monday.com (sprints)

**What we're missing:** The NBI Dashboard has task statuses and a queue system but no formal concept of a time-boxed iteration. A sprint/cycle is a container that groups tasks into a fixed time period (typically 1-2 weeks), tracks velocity (how many points/tasks completed per sprint), provides burndown/burnup charts showing progress against the sprint goal, and allows sprint retrospectives. Jira and Linear both support sprint backlogs distinct from the product backlog, sprint goals, and automatic rollover of incomplete work.

**Why it matters for NBI:** Without sprints, there is no structured cadence for planning what agents work on next. Glen currently manages this manually. A sprint system would let him batch-assign work in weekly or fortnightly cycles and see at a glance whether the team is on track.

### 1.2 Custom Fields on Tasks/Projects

**Present in:** Jira, Monday.com, Linear, Asana, ClickUp, Targetprocess, Shortcut

**What we're missing:** The schema has fixed fields (title, description, status, priority, assignee, dates, estimated_minutes). There is no mechanism for users to add arbitrary fields (dropdown, number, text, date, checkbox, URL, person) to tasks or projects without a schema migration. Every tool in the comparison set supports user-defined custom fields. Monday.com and ClickUp make this a core differentiator -- every column is effectively a custom field. Linear added custom fields in 2024. Jira supports custom fields with field configurations and screens.

**Why it matters for NBI:** As the team grows or takes on different project types, Glen will want to track things the schema did not anticipate (e.g. "Client Impact", "Revenue at Risk", "Sprint Points", "Story Points", "T-Shirt Size", "Definition of Done checklist").

### 1.3 Workflow Automation / Rules Engine

**Present in:** Jira (automation rules), Monday.com (automations), Linear (auto-archive, auto-assign, SLAs), Asana (rules), ClickUp (automations), Targetprocess (process rules)

**What we're missing:** The NBI Dashboard has no if-this-then-that automation. No ability to say "when a task moves to done, notify Glen" or "when a task has been in_progress for more than 3 days, escalate to the assigned agent's manager" or "when all subtasks are done, move the parent to review". Jira alone has 100+ automation templates. Monday.com's automations are a core selling point with triggers, conditions, and actions across boards. Linear automatically archives completed issues and can auto-assign based on team rules.

**Why it matters for NBI:** The AI agent team produces a high volume of tasks. Without automation, Glen or an admin must manually update statuses, send notifications, and manage escalations. This becomes unmanageable past 10-15 agents.

### 1.4 Roadmap / Timeline View (Gantt)

**Present in:** Jira (timeline/roadmap), Monday.com (timeline/Gantt), Linear (roadmap, projects timeline), Asana (timeline), ClickUp (Gantt), Targetprocess (graphical timeline), Shortcut (roadmap)

**What we're missing:** No visual timeline showing tasks/projects plotted on a horizontal calendar with dependencies drawn as lines between them. The NBI Dashboard has start dates, due dates, and dependencies in the schema, but no Gantt-style visualisation. Jira's timeline view lets you drag to reschedule, see dependency arrows, and group by epic. Asana's timeline is similar. Linear's roadmap shows projects on a quarterly timeline with progress bars.

**Why it matters for NBI:** Glen needs to see the big picture of what is happening across projects over the next weeks and months. A list of tasks sorted by date is not the same as a visual timeline with dependency chains.

### 1.5 Epics / Milestones (multi-level hierarchy above tasks)

**Present in:** Jira (epics, initiatives via Advanced Roadmaps), Linear (projects, initiatives), Shortcut (epics, milestones), Asana (goals, milestones), ClickUp (goals, milestones), Monday.com (groups, subitems), Targetprocess (epics, features, user stories, portfolio items)

**What we're missing:** The NBI Dashboard has projects and tasks with parent/child relationships, but no formal epic or milestone entity. An epic is a large body of work that spans multiple sprints and groups related tasks. A milestone marks a significant checkpoint in a project. Targetprocess takes this furthest with a full entity hierarchy: Portfolio Epics > Epics > Features > User Stories > Tasks/Bugs. Jira has Epic > Story > Subtask. Linear has Initiative > Project > Issue > Sub-issue.

**Why it matters for NBI:** Parent/child tasks provide some hierarchy, but there is no way to say "these 15 tasks across 3 sprints all belong to the Q2 Platform Launch epic" and track that epic's completion percentage. Milestones would let Glen mark deadlines like "MVP ready" or "Client demo".

### 1.6 Global Search

**Present in:** Jira, Monday.com, Linear, Asana, ClickUp, Shortcut, Targetprocess

**What we're missing:** No full-text search across tasks, projects, comments, agents, or clients. Every PM tool has a command-palette-style global search (often Cmd+K) that instantly finds any entity by name, description, or content. Linear's search is particularly fast and supports filters. Jira has JQL (Jira Query Language) for advanced structured queries.

**Why it matters for NBI:** As the number of tasks, projects, and comments grows, finding things by browsing becomes impractical. Search is table stakes.

### 1.7 Saved Filters / Custom Views

**Present in:** Jira (saved filters, dashboards), Linear (custom views, favourites), Monday.com (views), Asana (saved searches, custom dashboards), ClickUp (saved views), Shortcut (saved searches), Targetprocess (custom views, entity views)

**What we're missing:** No ability to save a filtered/sorted view of tasks and share it. For example, "All critical tasks assigned to engineering agents, sorted by due date" or "My standup view filtered to this sprint only". Every tool lets users create, name, and share custom views with specific filter/sort/group configurations. Linear makes views a first-class concept with the entire left sidebar being customisable views.

**Why it matters for NBI:** Different stakeholders need different slices of the same data. Glen wants a leadership view; individual agents want their own workload view. Without saved views, everyone sees the same default.

### 1.8 Activity / Audit Log

**Present in:** Jira (activity stream, audit log), Monday.com (activity log), Linear (activity), Asana (activity feed), ClickUp (activity), Shortcut (activity), Targetprocess (history)

**What we're missing:** The task_comments table captures task-level activity, and agent_executions tracks execution runs. But there is no global activity feed showing "Agent X completed task Y", "Glen approved request Z", "Project health changed to amber" across the entire system. Jira's activity stream shows all changes across all issues. ClickUp has a comprehensive activity log at workspace, space, and folder levels.

**Why it matters for NBI:** Glen needs a single chronological feed of everything that happened while he was away. With 33 agents potentially active, a global activity log is essential for situational awareness.

### 1.9 File Attachments on Tasks

**Present in:** Jira, Monday.com, Linear, Asana, ClickUp, Shortcut, Targetprocess

**What we're missing:** The schema has output_path for deliverable files, but no general file attachment system. Users cannot drag-and-drop screenshots, PDFs, design files, or documents onto a task. Every PM tool supports file attachments with previews. Jira integrates with Confluence for document storage. Monday.com has file columns and a file gallery view. ClickUp supports in-task file attachments with version history.

**Why it matters for NBI:** Agent outputs, design mockups, requirements documents, and reference materials need to live alongside the tasks they relate to. Currently the only path is output_path, which is a single repo file path, not a multi-file attachment system.

### 1.10 Due Date Reminders and Overdue Highlighting

**Present in:** Jira, Monday.com, Linear, Asana, ClickUp, Shortcut, Targetprocess

**What we're missing:** The schema has due_at on tasks, but there is no system for sending reminders before a due date or visually flagging overdue tasks. Asana highlights overdue tasks in red and sends reminder notifications. Monday.com has deadline automations. Linear shows overdue indicators on issues. ClickUp has start date and due date reminders at configurable intervals.

**Why it matters for NBI:** Tasks with due dates that silently pass are worse than no due dates at all. Overdue highlighting and reminder notifications are expected by every PM tool user.

---

## 2. SHOULD-HAVE -- Differentiating features from top tools

These features appear in 3-4 of the 7 tools and represent meaningful competitive advantages. Implementing these would elevate the NBI Dashboard from basic to genuinely useful.

### 2.1 Workload / Capacity View

**Present in:** Asana (workload), Monday.com (workload), ClickUp (workload view), Targetprocess (resource planning)

**What we're missing:** No visual representation of how much work is assigned to each agent relative to their capacity. Asana's workload view shows a horizontal bar chart per person with a configurable capacity line -- you can see at a glance who is overloaded and who has spare capacity. Monday.com has a similar workload widget. ClickUp shows workload by points, time estimates, or task count.

**Why it matters for NBI:** With 33 agents, uneven work distribution is inevitable. Glen needs to see which agents are idle and which are saturated without manually counting tasks.

### 2.2 Goals / OKR Tracking

**Present in:** Asana (goals), ClickUp (goals), Monday.com (goals/OKRs), Linear (initiatives with progress)

**What we're missing:** No formal goal-setting framework that links strategic objectives to measurable results and tracks progress. Asana's goals support portfolios of goals with progress roll-up from projects. ClickUp goals can be measured by task completion, number, currency, or true/false targets. Monday.com supports OKR tracking with key results linked to board items.

**Why it matters for NBI:** The NBI Team has 6 goals with 26 sub-goals (per memory). There is no way to represent these in the dashboard and track which tasks contribute to which goals.

### 2.3 Templates (Task, Project, Workflow)

**Present in:** Jira (issue templates, project templates), Monday.com (board templates, automation templates), Asana (project templates, task templates), ClickUp (templates for everything), Shortcut (story templates)

**What we're missing:** No ability to create a reusable template for a task (pre-filled fields, checklists, subtasks) or a project (pre-built task list, standard structure). Jira lets you create issue templates with pre-populated fields. ClickUp has templates for tasks, docs, views, and entire spaces. Monday.com has 200+ pre-built board templates.

**Why it matters for NBI:** Repeatable processes (client onboarding, sprint setup, agent deployment) should be templatised to ensure consistency and reduce setup time.

### 2.4 Bulk Operations / Multi-select Actions

**Present in:** Jira (bulk change), Monday.com (batch actions), Linear (multi-select), Asana (multi-select), ClickUp (bulk actions), Shortcut (bulk edit)

**What we're missing:** No ability to select multiple tasks and change their status, assignee, priority, or project in one action. Linear lets you select multiple issues and bulk-reassign, change status, add labels, or move to a different project. Jira has a dedicated bulk change wizard. ClickUp supports drag-select and bulk actions.

**Why it matters for NBI:** When rebalancing work across agents or closing out a sprint, changing tasks one at a time is tedious. At 33 agents producing potentially hundreds of tasks, bulk operations are not optional.

### 2.5 Labels / Tags

**Present in:** Jira (labels), Linear (labels with colours), Asana (tags), ClickUp (tags), Shortcut (labels), Monday.com (tags column)

**What we're missing:** No freeform tagging system. The schema has fixed categorisation (status, priority, project), but no ability to add arbitrary labels like "tech-debt", "quick-win", "client-facing", "needs-design", "spike". Linear's label system is particularly well-designed with colour-coded label groups.

**Why it matters for NBI:** Tags enable cross-cutting categorisation that does not fit into the existing hierarchy. They are essential for filtering and grouping.

### 2.6 Recurring Tasks

**Present in:** Asana (recurring tasks), Monday.com (recurring items), ClickUp (recurring tasks), Jira (via automation)

**What we're missing:** No way to create a task that automatically regenerates on a schedule (daily standup prep, weekly report, monthly review). Asana supports daily, weekly, monthly, yearly, and custom recurrence. ClickUp supports the same with time-of-day control.

**Why it matters for NBI:** Standard operational cadences (weekly standups, monthly reviews, sprint ceremonies) currently require manual task creation each time.

### 2.7 Integrations / Webhooks / API

**Present in:** Jira (Marketplace, REST API, webhooks), Monday.com (integrations, API, webhooks), Linear (API, webhooks, integrations), Asana (API, webhooks, app marketplace), ClickUp (API, webhooks, integrations), Targetprocess (REST API, webhooks), Shortcut (API, webhooks, integrations)

**What we're missing:** The NBI Dashboard has API routes but no formal webhook system (outbound event notifications to external services) and no integration framework. Jira has thousands of Marketplace apps. Monday.com has 200+ native integrations. Linear integrates with GitHub, Slack, Figma, Sentry, and more. A minimum viable integration story would include: GitHub (link PRs to tasks), Slack/Teams (notifications), and webhooks for custom integrations.

**Why it matters for NBI:** The dashboard exists in isolation. Agent work touches GitHub repos, communication channels, and external tools. Without integrations, data lives in silos.

### 2.8 Story Points / Estimation Framework

**Present in:** Jira (story points, time tracking), Linear (estimate points), Shortcut (story points), ClickUp (story points, time estimates), Targetprocess (effort)

**What we're missing:** The schema has estimated_minutes and actual_minutes, which is time-based estimation only. There is no abstract point-based estimation system (Fibonacci, T-shirt sizing, linear scale). Jira and Linear both support configurable point scales. Story points are used for velocity tracking (points completed per sprint) which feeds capacity planning.

**Why it matters for NBI:** Time-in-minutes is granular for some work types. Points allow relative sizing ("this is about twice as complex as that") which is often more accurate for knowledge work.

### 2.9 Notifications Centre with Fine-grained Controls

**Present in:** Jira (notification schemes), Monday.com (notification centre), Linear (inbox/notification triage), Asana (inbox), ClickUp (notification centre), Shortcut (notifications)

**What we're missing:** The schema references notification preferences in settings, but Linear and Asana both have dedicated notification inboxes that function as triage systems. Linear's "Inbox" is a core UX concept -- all notifications land there and you process them like email: snooze, archive, mark as read. Asana's inbox is similar. This is distinct from a basic notification bell dropdown.

**Why it matters for NBI:** With 33 agents potentially generating dozens of events daily, a simple notification bell will overflow. A triage-style inbox lets Glen process notifications systematically.

### 2.10 Multiple Board Views (Calendar, Table, Chart)

**Present in:** Monday.com (20+ views), ClickUp (15+ views), Asana (list, board, timeline, calendar, Gantt), Jira (board, list, timeline, calendar), Linear (board, list, triage)

**What we're missing:** The NBI Dashboard has kanban, list, and standup views for tasks. Missing views include: **Calendar view** (tasks plotted on a day/week/month calendar by due date), **Table/Spreadsheet view** (inline-editable grid like a spreadsheet -- Monday.com's core UX), **Chart view** (configurable charts beyond the dashboard KPIs), and **Map view** (for location-relevant data). Monday.com and ClickUp lead here with the most view options.

**Why it matters for NBI:** Different mental models suit different tasks. A calendar view is essential for deadline management. A table view is essential for bulk data entry.

### 2.11 Markdown / Rich Text in Task Descriptions

**Present in:** Linear (full markdown), Jira (rich text editor), Monday.com (rich text), Asana (rich text), ClickUp (rich text with slash commands), Shortcut (markdown)

**What we're missing:** The schema stores task descriptions as plain text. No indication of markdown rendering, rich text editing, inline images, code blocks, tables, or checklists within task descriptions. Linear and ClickUp both support full markdown with live preview. Jira has a rich text editor with macros. Monday.com has workdocs with inline content.

**Why it matters for NBI:** Agent task descriptions and outputs often contain structured content (code snippets, tables, checklists). Rendering this as plain text loses information.

---

## 3. NICE-TO-HAVE -- Advanced features from enterprise tools

These features appear in 1-2 of the tools or represent cutting-edge capabilities. They would make the NBI Dashboard exceptional but are not blocking adoption.

### 3.1 Portfolio Management / Multi-Project Dashboards

**Present in:** Targetprocess (portfolio management, programme boards), Jira (Advanced Roadmaps / Plans), Asana (portfolios), Monday.com (high-level dashboards)

**What we're missing:** No portfolio-level view that shows all projects with their health, progress, and resource allocation in one place. Targetprocess excels here with hierarchical portfolio items, programme increments, and cross-project dependency mapping. Jira's Advanced Roadmaps (formerly Portfolio) provides multi-team planning with capacity management. Asana Portfolios show a grid of projects with status, owner, progress, and dates.

**Why it matters for NBI:** As NBI takes on multiple simultaneous projects and clients, a single-project view is insufficient. Portfolio management lets Glen see the health of the entire operation.

### 3.2 SAFe / Agile Framework Support

**Present in:** Targetprocess (full SAFe implementation), Jira (SAFe via plugins and Advanced Roadmaps)

**What we're missing:** Targetprocess is the market leader for SAFe (Scaled Agile Framework) with native support for Agile Release Trains, Programme Increments, PI Planning boards, team-of-teams, and value streams. While NBI likely does not need full SAFe, the concept of programme increments (quarterly planning cycles) and value streams (mapping work to business outcomes) could be useful.

**Why it matters for NBI:** Only relevant if NBI scales to multiple teams or adopts a formal scaling framework. Low priority for a 5-50 person team.

### 3.3 Whiteboards / Visual Collaboration

**Present in:** ClickUp (whiteboards), Monday.com (workdocs with embeds), Jira (Confluence integration)

**What we're missing:** No in-app whiteboard or visual collaboration space. ClickUp's whiteboards let teams brainstorm, draw diagrams, and connect whiteboard elements directly to tasks. Monday.com's workdocs support embedded boards and dashboards. Jira relies on Confluence for this.

**Why it matters for NBI:** Useful for planning sessions and architecture discussions, but can be handled by external tools (Miro, FigJam).

### 3.4 Docs / Wiki (Built-in Knowledge Base)

**Present in:** Monday.com (workdocs), ClickUp (docs), Linear (project documents), Asana (project briefs)

**What we're missing:** No in-app document creation or wiki system. Monday.com's workdocs are collaborative documents that can embed live board data. ClickUp Docs support nested pages, wikis, and real-time collaboration. The NBI Team already has a file-based knowledge architecture (Tier 1/2/3) but it is not surfaced in the dashboard.

**Why it matters for NBI:** The NBI knowledge base lives in markdown files in the repo. Surfacing these as browsable, searchable documents within the dashboard would reduce context-switching for Glen.

### 3.5 Time-in-Status / Cycle Time Analytics

**Present in:** Jira (control chart, cumulative flow diagram), Linear (cycle time analytics), Shortcut (cycle time, lead time)

**What we're missing:** No analytics showing how long tasks spend in each status (e.g. average time in "review" = 2.3 days). Jira's control chart shows cycle time trends. Linear provides cycle time and throughput metrics. Shortcut has built-in cycle time reporting. This data is derivable from the task_comments table (status_change entries with timestamps) but no UI exists.

**Why it matters for NBI:** Identifies bottlenecks. If tasks sit in "review" for days, Glen knows the review process needs attention. Essential for continuous improvement.

### 3.6 SLA Tracking

**Present in:** Jira (SLA goals in Jira Service Management), Linear (SLA tracking), Targetprocess (SLA support)

**What we're missing:** No ability to define service level agreements (e.g. "critical bugs must be resolved within 4 hours") and track compliance. Linear supports SLAs on issue triage and resolution times with automatic breach warnings. Jira Service Management has comprehensive SLA management.

**Why it matters for NBI:** For client-facing work, SLAs define response time commitments. For internal operations, SLAs on agent response times would highlight underperforming agents.

### 3.7 Triage / Inbox for New Issues

**Present in:** Linear (triage), Jira (backlog grooming)

**What we're missing:** Linear has a dedicated triage system where new issues land in an unsorted inbox and must be explicitly triaged (assigned priority, labels, project, assignee) before entering a team's workflow. This prevents untriaged work from cluttering the backlog.

**Why it matters for NBI:** As agents create tasks for other agents, having an explicit triage step ensures nothing falls through the cracks and that every task is properly categorised before work begins.

### 3.8 Dependency Visualisation (Graph View)

**Present in:** Jira (dependency lines on timeline), Targetprocess (dependency graph), Monday.com (dependency lines on Gantt)

**What we're missing:** The schema supports task relations (blocking, blocked_by, related) but there is no visual representation. A dependency graph shows tasks as nodes and dependencies as directional edges, making it immediately clear which tasks are blocking progress. Targetprocess has the most sophisticated dependency visualisation with cross-project dependency mapping.

**Why it matters for NBI:** With agents creating blocking dependencies between their work, a visual graph prevents the "why is nothing moving?" question.

### 3.9 Forms for External Task Intake

**Present in:** Jira (request portals via JSM), Monday.com (forms), Asana (forms), ClickUp (forms)

**What we're missing:** No public-facing form that creates tasks from external submissions. Monday.com forms let external users submit requests that become items on a board. Asana forms do the same. This is distinct from the bug/feature report system, which appears to be internal.

**Why it matters for NBI:** If NBI clients need to submit requests or feedback, a form-based intake avoids email and ensures structured data.

### 3.10 Reporting Builder / Custom Dashboards

**Present in:** Jira (custom dashboards with gadgets), Monday.com (dashboards with widgets), ClickUp (custom dashboards), Targetprocess (custom reports, graphical reports)

**What we're missing:** The NBI Dashboard has fixed KPI cards and charts. There is no drag-and-drop dashboard builder where Glen can create his own visualisations by selecting data source, chart type, filters, and groupings. Monday.com lets you build dashboards with 30+ widget types. Jira has a gadget system for custom dashboards. ClickUp has a dashboard builder with 50+ widgets.

**Why it matters for NBI:** Glen's reporting needs will evolve. A fixed dashboard means every new metric requires developer work. A builder lets Glen self-serve.

### 3.11 API Token / Personal Access Token Management

**Present in:** Jira, Linear, Asana, ClickUp, Shortcut, Targetprocess

**What we're missing:** The settings page has API key management, but it is unclear whether the NBI Dashboard supports personal access tokens for programmatic access. Every tool in the comparison set provides PAT generation with scoped permissions. This enables scripting, CI/CD integration, and third-party tool access.

**Why it matters for NBI:** For automation scripts and CI/CD pipelines that need to create or update tasks programmatically.

### 3.12 Email-to-Task / Email Integration

**Present in:** Jira (email handler), Asana (email forwarding to projects), Monday.com (email integration), ClickUp (email-to-task)

**What we're missing:** No ability to create a task by forwarding an email to a project-specific email address. Asana generates a unique email address per project; forwarding an email to it creates a task with the email subject as the title and body as the description.

**Why it matters for NBI:** Low priority for an AI agent team, but useful for Glen when he receives client requests via email and wants to quickly convert them to tasks.

### 3.13 Mobile App

**Present in:** Jira, Monday.com, Linear, Asana, ClickUp, Shortcut

**What we're missing:** No mobile application. The web app may be responsive, but every competitor offers native iOS and Android apps with push notifications. Linear's mobile app is read-focused. Jira and ClickUp have full-featured mobile apps.

**Why it matters for NBI:** Glen may want to check status or approve tasks from his phone. A responsive web app could serve as a minimum viable alternative.

### 3.14 Time Tracking with Timer

**Present in:** ClickUp (native timer), Monday.com (time tracking column), Jira (via Tempo or built-in logging)

**What we're missing:** The schema has estimated_minutes and actual_minutes on tasks, which is manual time entry. A real-time timer lets someone click "start" on a task, work on it, and click "stop" -- the elapsed time is automatically logged. ClickUp has this built in. Jira uses the Tempo plugin for advanced time tracking. Monday.com has a time tracking column with a start/stop timer.

**Why it matters for NBI:** For human team members who need to track billable hours. Less relevant for AI agents whose execution time is tracked via session duration.

### 3.15 Guest Access / External Collaborators

**Present in:** Jira, Monday.com, Asana, ClickUp, Linear, Shortcut

**What we're missing:** The RBAC system has board, admin, and viewer roles but no concept of external guests with limited, project-scoped access. Asana supports guest users who can only see projects they are invited to. Monday.com has guest roles. Linear supports guest access with restricted views.

**Why it matters for NBI:** If NBI wants to give clients visibility into their project's progress without full dashboard access.

---

## Summary Matrix

| Priority | Feature | TP | Jira | Mon | Lin | Asana | CU | SC | NBI |
|----------|---------|:--:|:----:|:---:|:---:|:-----:|:--:|:--:|:---:|
| **MUST** | Sprint/Cycle management | - | Y | Y | Y | Y | Y | Y | **NO** |
| **MUST** | Custom fields | Y | Y | Y | Y | Y | Y | Y | **NO** |
| **MUST** | Workflow automation | Y | Y | Y | Y | Y | Y | - | **NO** |
| **MUST** | Roadmap / Timeline / Gantt | Y | Y | Y | Y | Y | Y | Y | **NO** |
| **MUST** | Epics / Milestones | Y | Y | Y | Y | Y | Y | Y | **NO** |
| **MUST** | Global search | Y | Y | Y | Y | Y | Y | Y | **NO** |
| **MUST** | Saved filters / Custom views | Y | Y | Y | Y | Y | Y | Y | **NO** |
| **MUST** | Global activity log | Y | Y | Y | Y | Y | Y | Y | **NO** |
| **MUST** | File attachments on tasks | Y | Y | Y | Y | Y | Y | Y | **NO** |
| **MUST** | Due date reminders / Overdue flags | Y | Y | Y | Y | Y | Y | Y | **NO** |
| **SHOULD** | Workload / Capacity view | Y | - | Y | - | Y | Y | - | **NO** |
| **SHOULD** | Goals / OKR tracking | - | - | Y | Y | Y | Y | - | **NO** |
| **SHOULD** | Templates (task, project) | - | Y | Y | - | Y | Y | Y | **NO** |
| **SHOULD** | Bulk operations | - | Y | Y | Y | Y | Y | Y | **NO** |
| **SHOULD** | Labels / Tags | - | Y | Y | Y | Y | Y | Y | **NO** |
| **SHOULD** | Recurring tasks | - | Y | Y | - | Y | Y | - | **NO** |
| **SHOULD** | Integrations / Webhooks | Y | Y | Y | Y | Y | Y | Y | **NO** |
| **SHOULD** | Story points / Estimation | Y | Y | - | Y | - | Y | Y | **NO** |
| **SHOULD** | Notification inbox / Triage | - | - | Y | Y | Y | Y | - | **PARTIAL** |
| **SHOULD** | Calendar / Table / Chart views | Y | Y | Y | Y | Y | Y | - | **NO** |
| **SHOULD** | Rich text / Markdown in tasks | - | Y | Y | Y | Y | Y | Y | **NO** |
| **NICE** | Portfolio management | Y | Y | - | - | Y | - | - | **NO** |
| **NICE** | SAFe / Scaling framework | Y | Y | - | - | - | - | - | **NO** |
| **NICE** | Whiteboards | - | - | Y | - | - | Y | - | **NO** |
| **NICE** | Built-in docs / Wiki | - | - | Y | Y | - | Y | - | **NO** |
| **NICE** | Cycle time analytics | - | Y | - | Y | - | - | Y | **NO** |
| **NICE** | SLA tracking | Y | Y | - | Y | - | - | - | **NO** |
| **NICE** | Triage inbox | - | - | - | Y | - | - | - | **NO** |
| **NICE** | Dependency graph view | Y | Y | Y | - | - | - | - | **NO** |
| **NICE** | Forms for external intake | - | Y | Y | - | Y | Y | - | **NO** |
| **NICE** | Custom dashboard builder | Y | Y | Y | - | - | Y | - | **NO** |
| **NICE** | Personal access tokens | Y | Y | - | Y | Y | Y | Y | **PARTIAL** |
| **NICE** | Email-to-task | - | Y | Y | - | Y | Y | - | **NO** |
| **NICE** | Mobile app | - | Y | Y | Y | Y | Y | Y | **NO** |
| **NICE** | Time tracking timer | - | - | Y | - | - | Y | - | **NO** |
| **NICE** | Guest / External access | - | Y | Y | Y | Y | Y | Y | **NO** |

**Key:** TP = Targetprocess, Mon = Monday.com, Lin = Linear, CU = ClickUp, SC = Shortcut, Y = has feature, - = does not have or not a core feature

---

## Recommended Implementation Order (for a 5-50 person software team)

### Phase 1 -- Foundation (highest impact, lowest complexity)
1. Global search (Cmd+K)
2. Labels/Tags on tasks
3. Rich text/Markdown rendering in task descriptions
4. File attachments on tasks
5. Due date reminders and overdue highlighting
6. Global activity feed

### Phase 2 -- Planning & Structure
7. Epics/Milestones entity type
8. Sprint/Cycle management
9. Custom fields (JSON-backed initially, then schema)
10. Saved filters/Custom views
11. Bulk operations on tasks

### Phase 3 -- Automation & Analytics
12. Workflow automation engine (triggers + conditions + actions)
13. Roadmap/Timeline/Gantt view
14. Story points and velocity tracking
15. Cycle time analytics
16. Workload/Capacity view

### Phase 4 -- Enterprise & Growth
17. Goals/OKR tracking
18. Templates (task, project)
19. Recurring tasks
20. Integrations framework (webhooks + GitHub)
21. Custom dashboard builder
22. Notification inbox with triage
23. Guest access

---

## Key Takeaways

1. **The biggest gap is in planning infrastructure.** The NBI Dashboard handles task execution (create, assign, track, complete) but has almost nothing for planning (sprints, roadmaps, epics, milestones, estimation, velocity).

2. **Automation is the second critical gap.** Every modern PM tool has a rules engine. Without one, operational overhead scales linearly with team size, which is particularly painful with 33 AI agents.

3. **Search and views are expected baseline features.** Their absence will frustrate any user who has used Jira, Linear, or any other PM tool.

4. **The NBI Dashboard has unique strengths** that none of the compared tools have: AI agent lifecycle management, Claude Desktop session orchestration, approval gates, three-tier knowledge architecture, and the org chart with reporting hierarchy. These are genuine differentiators.

5. **Linear is the closest UX model** for where the NBI Dashboard should aim. Linear is opinionated, fast, keyboard-driven, and designed for software teams. It avoids the feature bloat of Jira and ClickUp while covering the essentials. The NBI Dashboard should adopt Linear's philosophy of doing fewer things excellently rather than copying ClickUp's everything-and-the-kitchen-sink approach.
