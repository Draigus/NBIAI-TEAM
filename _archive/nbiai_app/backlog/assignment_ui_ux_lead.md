# Task Assignment: UI/UX Lead
**Assigned by:** CEO
**Date:** 2026-03-28
**Project:** NBIAI Team App
**Priority:** HIGH — blocking all engineering work

---

## Your Assignment

Design every screen of the NBIAI app. This is Deliverable 3. Engineering cannot build the frontend without it.

You must produce:
1. A design system spec (colours, typography, spacing, components)
2. A wireframe or annotated layout for every screen
3. All states: empty, loading, error, populated, hover/focus
4. All interactive elements: what happens on click, hover, submission
5. Responsive behaviour: desktop-first; specify breakpoints

The spec must be complete enough that a senior engineer can implement any screen without asking a single clarifying question about layout, colour, spacing, or interaction.

---

## Aesthetic Direction

**Tone:** Professional, technical, dark. This is a control room for an AI company, not a consumer product.

**Reference products (for tone, not copying):**
- Linear — clean dark UI, excellent task management feel
- Vercel dashboard — dark, data-dense, high-information-density
- Paperclip (github.com/paperclipai/paperclip) — adapt the architecture; bring your own design

**Palette direction:**
- Dark backgrounds (not pure black — near-black, e.g. #0F0F0F or #111827)
- Accent: NBI brand blue or a strong electric accent (propose with rationale)
- Status colours: Green #22C55E / Amber #F59E0B / Red #EF4444 — non-negotiable, these are semantic
- Text: high-contrast white/light-grey hierarchy
- Borders: subtle dark strokes, not heavy lines
- No gradients on data — flat, readable
- Subtle use of glow or accent for active states only

**Typography:**
- Body: Inter or equivalent (system font acceptable)
- Mono: JetBrains Mono or Fira Code for execution logs, token counts, cost figures
- Hierarchy: clear H1/H2/H3/body/caption scale, specified in px and line-height

**Component library:** shadcn/ui as the base. Propose any custom components required.

---

## Screens to Design

### 1. Login Screen
- Email + password fields
- Submit button with loading state
- Error state: invalid credentials
- First-time setup flow: "Create your company" screen (company name, logo upload, set board user email)
- No public registration — invite-only implied by the admin-only user creation

### 2. Command Centre (Home / Dashboard)
This is the most important screen. Gets the most attention.

**Layout:** Left navigation sidebar + main content area. Sidebar is persistent across all screens.

**Sidebar contains:**
- NBI logo + company name at top
- Navigation links: Command Centre, Org Chart, Projects, Tasks, Finance, Leads & Clients, Approvals, Settings
- User avatar + role at bottom
- Sidebar can collapse to icon-only on smaller viewports

**Main content — Command Centre widgets (design as a responsive grid):**

1. **Quick Stats bar** (top, full width): four stat cards — Open Tasks (count), Agents Active (count), Goals In Progress (count), Pending Approvals (count with badge if >0)

2. **Active Projects** widget: table or card list showing: project name, status badge (Green/Amber/Red), lead agent name + avatar, last update timestamp. Max 5 rows; "View all" link. Click row → goes to project detail.

3. **Agent Status Feed** widget: real-time list of all agents — each row: agent name, role, model tier badge (Opus/Sonnet), status badge (Active/Idle/Running/Blocked/Paused). Updates live. Click row → goes to Role Detail page.

4. **Activity Feed** widget: reverse-chronological log of agent actions last 24 hours. Each item: agent avatar + name, action description, timestamp. Scrollable, max 20 items visible.

5. **Approvals Queue** widget: list of pending approvals. Each item: type (email/external/financial), requesting agent, summary of what it is, "Review" button. Badge count matches Quick Stats. Empty state: "No pending approvals."

Design all states: fully loaded, empty (no projects/agents yet), partial (some widgets populated), loading skeleton.

### 3. Org Chart View
- Full-page visual tree of the agent hierarchy
- Root: Glen Pryer (Board) at top — human, not an agent
- Tree nodes for all 18 roles
- Each node displays: role title, agent name (if hired), model tier badge, status badge (Active/Idle/Paused/Vacant)
- "Vacant" state: node shown with dashed border + "Hire" button
- "Active" state: node shows current task (truncated to 1 line)
- Click any node → opens Role Detail page (slide-over panel or new page — specify which)
- Zoom/pan for large trees: specify how (browser zoom, or custom pan/zoom controls)
- Toolbar: "Hire Agent" button (opens modal), filter by status, search by role name
- Mobile: tree collapses to accordion list

### 4. Role Detail Page
Accessed by clicking a node in the Org Chart, or from Agent Status Feed.

**Layout:** Full page, not a modal. Back button to Org Chart.

**Sections:**
1. **Header:** Role title, agent name, model tier badge, status badge, reports-to (linked), direct reports (linked list)
2. **Current Assignment:** Task title, project, status badge, time in current state, link to task detail
3. **Performance Metrics:** Four stat cards — Tasks Completed (all time), Average Completion Time, Escalations This Month, Budget Used This Month (with progress bar: green <80%, amber 80-99%, red 100%)
4. **Task History:** Table of last 10 completed tasks — task title, project, completed date, outcome (done/escalated/blocked), duration. Click row → task detail.
5. **Knowledge Files:** Three sections (Tier 1 / Tier 2 / Tier 3) showing loaded files — name, last updated. Read-only.
6. **System Prompt:** Collapsible code block. Read-only. Copy button.
7. **Actions bar:** Edit Agent (opens modal), Pause Agent, Terminate Agent. Pause/Terminate require confirmation modal.

### 5. Projects View
**List view:**
- Table: project name, status badge, lead agent, task counts (total / in-progress / blocked / done), last updated
- "New Project" button → modal with: name, description, lead agent (dropdown from agents list), status
- Click row → Project Detail

**Project Detail:**
- Header: project name, status badge, lead agent, description, edit button
- Tasks table: task title, assigned agent, priority badge, status badge, last updated. Filterable by status and priority.
- "New Task" button
- Empty state for no tasks

### 6. Task Detail
Accessed from Project Detail or any task link.

**Layout:** Full page or large slide-over (specify). Back button.

**Sections:**
1. **Header:** Task title, status badge, priority badge, project link, edit button
2. **Assignment:** Assigned agent (linked to Role Detail), assigned by, created date, due date (if set)
3. **Description:** Full text, markdown rendered
4. **Status transitions:** Buttons for valid next states (e.g. if "backlog" → "assigned" and "in progress"). Blocked and escalation transitions require a comment — show inline comment field when those transitions are selected.
5. **Relations:** Blocking tasks / blocked-by tasks / related tasks — each as linked pills. "Add relation" button.
6. **Activity Log:** Reverse-chronological — each entry: who (agent or human), what (status change, comment, assignment), timestamp. Comments shown as full text. Status changes shown as "[old status] → [new status]".
7. **Checkout status:** "Checked out by [agent] since [time]" or "Available"

### 7. Finance Tab
**Sub-navigation:** Revenue | Payroll | Cash Flow | NSI Scenarios | Pipeline

**Revenue screen:**
- KPI cards: Monthly Contracted Revenue, Annual Contracted Revenue, Monthly Target, YTD vs Target
- Table: all revenue items — client, type (monthly/one-off), amount, start date, end date, status
- Progress bar: contracted vs target (monthly and YTD)

**Payroll screen:**
- Table: all staff (human + agent) — name, type, role, monthly cost, annual cost, active status
- Total row at bottom
- Add / Edit / Deactivate actions (Board only)

**Cash Flow screen:**
- 3-month rolling projection: table with months as columns, revenue/costs/net as rows
- Simple bar chart: monthly net cash flow (green positive, red negative)

**NSI Scenarios screen:**
- Three scenario cards: Current (NSI full), Partial Transition, Full Transition
- Each card: monthly revenue impact, cost impact, net position, notes
- Comparison table below the cards

**Pipeline Revenue screen:**
- Table: active BD leads — company, expected value, probability %, probability-weighted value, expected close date
- Summary: total pipeline value, probability-weighted total

### 8. Leads & Clients Tab
**Sub-navigation:** Pipeline | Active Clients | Overdue Follow-ups

**Pipeline screen:**
- Kanban board or table view (togglable) — stages: Identification → Qualification → Outreach → Discovery → Proposal → Close
- Lead card: company name, contact name, stage, last contact date, next action, owner (agent or human)
- "New Lead" button → modal
- Click lead → Lead Detail slide-over: all fields, activity log, edit actions

**Active Clients screen:**
- Table: client name, engagement type, health badge (Green/Amber/Red), Glen's role, next milestone date, days to milestone
- Click row → Client Detail: engagement overview, recent activity, health notes, key contacts

**Overdue Follow-ups screen:**
- Filtered list: all leads/clients where next action date is in the past
- Sorted by most overdue first
- Quick action: "Mark contacted" button updates last contact date

### 9. Approvals Page
Dedicated page (linked from sidebar and dashboard widget).

**Layout:** Two-column: list on left, detail on right (or full-width list on mobile with detail as overlay)

**List:** All pending approvals — type badge, requesting agent, summary, age (time since created). Sorted oldest first.

**Detail pane:**
- Type (e.g. "External Email")
- Requested by (linked to Role Detail)
- Context: what task triggered this, what the agent was trying to do
- Full content: e.g. full draft email text in a code/text block
- Action buttons: Approve (green), Request Changes (amber), Reject (red)
- Comment field (optional for Approve, required for Request Changes and Reject)
- Resolved items: separate tab showing history — approved/rejected, by whom, when

Empty state: full-page "No pending approvals" with checkmark illustration.

### 10. Settings
**Sub-navigation:** Company | Users | Agent Library | Knowledge Base | Budgets | API Keys

**Company:** Edit company name, logo upload, contact details. Save button.

**Users:** Table of users — name, email, role (Board/Admin/Viewer), last login, status. Invite User button. Remove button (not for own account). Role change dropdown (Board only).

**Agent Library:** Read-only table of all 18 defined roles — role name, model tier, reports to, current agent assigned (or Vacant). Link to hire/edit from Org Chart.

**Knowledge Base:** Tabbed by Tier — Tier 1, Tier 2 (by role), Tier 3 (by project). Each file: name, last updated, size. Read-only — no editing inline. Instructions to edit: "Update source files in the repository."

**Budgets:** Table of all agents — agent name, role, monthly cap (editable), current month spend, % used (progress bar). Save all button. Warning displayed for any agent at 80%+.

**API Keys:** Masked display of stored keys — label, last 4 characters, date added. Add new key (label + value). Revoke button. Keys encrypted at rest — note displayed.

---

## Design Deliverable Format

Produce the spec as a written document (not a Figma link — the team works in markdown). For each screen:

1. **Screen name and purpose** (one sentence)
2. **Layout description** (describe the grid/flex structure in words)
3. **All visible elements** (listed, with position, content, type)
4. **All user actions** (what each interactive element does on click/hover/focus/submit)
5. **All states** (empty, loading, error, populated; describe what changes per state)
6. **Colour and component notes** (which shadcn/ui component, which colour token)

Do not use Figma references, image links, or "see wireframe" — write it out. The engineer's only source of truth is this document.

---

## Acceptance Criteria for the Design Spec

- Every screen in the app is described (all 10 listed above, plus any modals or sub-screens you identify)
- Every state is described: empty, loading, error, populated
- Every interactive element has a defined action
- Colour tokens defined (no vague "dark background" — actual hex or Tailwind token)
- Typography scale specified (size, weight, line-height for each level)
- Spacing system specified (which Tailwind spacing scale, or custom)
- shadcn/ui components called out by name for each UI element
- Any custom components not covered by shadcn/ui are described in detail
- No TBDs, no vague descriptions, no "similar to X product"
- UI/UX Lead self-reviews against this checklist before submitting

---

## Handoff

When complete: submit to CEO for review. CEO reviews alongside VP Product spec and CTO architecture doc before passing all three to VP Engineering to begin Sprint 1.

Do not start until you have read:
- projects/nbiai_app/project_brief.md (full context)
- projects/nbiai_app/backlog/assignment_vp_product.md (what VP Product is speccing — your screens must match)
- company/org_chart.md (the org structure shown in the Org Chart view)
- github.com/paperclipai/paperclip (reference architecture — study the UI patterns even if you don't copy them)
