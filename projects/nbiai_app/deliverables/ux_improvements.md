# Design Improvement Recommendations — NBIAI App

**Author:** UI/UX Designer
**Date:** 2026-03-28
**Version:** 1.0
**Based on:** `design_spec.md` v1.0, `feature_spec.md` v1.0, and `ux_competitive_research.md` v1.0
**For review by:** UI/UX Lead

---

## How to Read This Document

For each screen in the NBIAI app, this document identifies:
- What the current design gets right (with citation to the research basis)
- What should be improved (specific and actionable)
- Priority: **High** (affects core usability) / **Medium** (meaningful improvement) / **Low** (polish)

Improvements are not style preferences. Each one is grounded in a specific finding from the competitive research. Where the research is cited, the relevant section in `ux_competitive_research.md` is referenced.

---

## Contents

1. [Design System (Tokens, Components, Motions)](#1-design-system)
2. [Global Layout and Navigation](#2-global-layout-and-navigation)
3. [Screen 1 — Login and First-Time Setup](#3-screen-1--login-and-first-time-setup)
4. [Screen 2 — Command Centre (Dashboard)](#4-screen-2--command-centre-dashboard)
5. [Screen 3 — Org Chart View](#5-screen-3--org-chart-view)
6. [Screen 4 — Role Detail Page](#6-screen-4--role-detail-page)
7. [Screen 5 — Projects View and Project Detail](#7-screen-5--projects-view-and-project-detail)
8. [Screen 6 — Task Detail](#8-screen-6--task-detail)
9. [Screen 7 — Finance Tab](#9-screen-7--finance-tab)
10. [Screen 8 — Leads & Clients Tab](#10-screen-8--leads--clients-tab)
11. [Screen 9 — Approvals Page](#11-screen-9--approvals-page)
12. [Screen 10 — Settings](#12-screen-10--settings)

---

## 1. Design System

### What the current design gets right

- The five-colour semantic status system (green, amber, red, blue, grey) matches industry standard RAG conventions and is correctly applied across agent, task, project, approval, and priority states (Research: §2.3 Status Badge Semantics).
- The three-level text hierarchy (`text-primary` / `text-secondary` / `text-muted`) matches the most effective pattern found in high-density dark dashboards. The specific hex values create appropriate contrast without excessive brightness (Research: §2.2 Information Hierarchy).
- Using borders as the primary depth signal over shadows is correct for a dark UI where shadow contrast is inherently low (Research: §2.2 Information Hierarchy).
- Monospace type (`JetBrains Mono`) for all financial figures, token counts, and log entries is the correct choice for vertical alignment in data tables (Research: §2.7 Cost and Token Display).
- The `--accent-primary` choice of `#4F6EF7` (Electric Indigo Blue) rather than a pure saturated blue is the right decision for a data-dense internal tool where the accent must read at 11px (badge) through to 28px (display) without visual fatigue.
- Restricting the icon library to Lucide React throughout (no mixing) prevents the inconsistency that plagues many internally-built tools.
- The `StatusBadge` component using `border border-[status-colour]33` (25% opacity border) alongside the tint background creates a subtle but readable border that distinguishes badges from their background — a detail missed in most design systems.

### Improvements

**1.1 — The StatusBadge 6px dot should be replaced with a Lucide icon for critical status states**

Priority: **Medium**

Current spec: the StatusBadge uses a `6px × 6px` filled circle as a leading element in all states. This is purely a colour signal and fails colour-blind users for the single most important status distinction (blocked vs active).

Recommendation: for BLOCKED, PAUSED, and ERROR states, replace the dot with an appropriately-sized Lucide icon (`AlertCircle size-3` for BLOCKED, `PauseCircle size-3` for PAUSED). For ACTIVE and RUNNING states, the dot (optionally with a subtle pulse animation at 2s interval) is sufficient because these are "all clear" states where colour confirmation is a secondary signal, not the alert.

Basis: Carbon Design System guidance on status indicators recommends icon + colour redundancy for states that require action. Research: §2.3, colour-blind accessibility finding.

---

**1.2 — The agent status change flash duration should be reduced from 800ms to 250ms**

Priority: **Medium**

Current spec: when an agent's status changes via WebSocket, the row flashes `bg-accent-muted` for 800ms.

800ms is long enough to resemble an error state or a UI glitch rather than a data-refresh acknowledgement. Research on real-time dashboard micro-animations consistently places effective transition durations between 200–400ms for status-change indicators.

Recommendation: reduce the flash to `250ms` with a `ease-out` easing. The row should return to its default state naturally, not abruptly. The 250ms duration is long enough to be noticed, short enough to not be alarming.

Basis: Research: §2.1 Real-Time Monitoring, smooth transition finding.

---

**1.3 — Add a "last refreshed" timestamp to live widgets**

Priority: **Low**

Current spec: the Activity Feed widget shows "Last 24 hours" as a static label. The Agent Status Feed has no freshness indicator.

When a user watches a monitoring dashboard and sees no changes for several minutes, there is no signal distinguishing "nothing is happening" from "the widget is stale." A `Caption text-muted` "Updated just now" / "Updated 3m ago" indicator in the widget header footer (below the list, right-aligned) provides this reassurance.

Recommendation: add a `lastUpdatedAt` timestamp display to the Agent Status Feed widget and the Activity Feed widget. Format: `Caption text-muted` aligned right: "Updated just now" (< 30 seconds) / "Updated [N]m ago" (> 30 seconds).

Basis: Research: §2.1 Real-Time Monitoring, "last refreshed" timestamps finding.

---

**1.4 — Input/output token split should be defined at the component level, not just as a total**

Priority: **High**

Current spec: the execution log collapsed row shows a single token count (`14,203 tok`) and a single cost figure (`$0.043`). The expanded row does not specify an input/output breakdown.

In a multi-model system where system prompt length (input) and generated response length (output) represent different cost levers, aggregating tokens destroys the actionable signal. This is validated by both Anthropic Console patterns and LLM cost management best practices.

Recommendation: define a new breakdown for the execution log expanded row: `Input: [N,NNN] tok` · `Output: [N,NNN] tok` · `Cached: [N,NNN] tok` in `Caption Mono text-muted`. The collapsed row continues to show total tokens and total cost. The breakdown is disclosed on expand.

Basis: Research: §2.7 Cost and Token Display, input/output token split finding.

---

## 2. Global Layout and Navigation

### What the current design gets right

- The fixed left sidebar with collapsible state persisted in localStorage is the correct navigation pattern for 8 primary sections (Research: §2.4 Navigation Patterns, sidebar for 5+ sections).
- The `border-l-2 border-accent -ml-[2px]` active state indicator on nav items is the correct selection signal — it creates a directional reading cue that background fill alone cannot provide (Research: Decision 2 in §3 Synthesis).
- Vertical tab list in Settings (`w-[180px]`) at 6 settings sections is the right choice (Research: §2.4, vertical tabs for 6+ settings categories).
- The page header with sticky `top-0` positioning and breadcrumb-style back navigation for deep pages is correct for the current navigation depth.
- Badge placement on the Approvals nav item using an absolute-positioned circle is the standard iOS/Android pattern that users recognise immediately (Research: §2.4, badge placement finding).

### Improvements

**2.1 — The sidebar collapse toggle location needs to be more discoverable**

Priority: **Medium**

Current spec: the collapse/expand toggle is positioned `absolute right-[-12px] top-[14px]` — a small `24px × 24px` circle that protrudes from the sidebar edge.

This positioning places the toggle in a spatially awkward position: it is neither clearly inside the sidebar nor clearly outside it. Users who do not know it exists are unlikely to find it. The toggle should be more discoverable while remaining unobtrusive.

Recommendation: move the collapse toggle to the bottom of the sidebar, just above the user avatar section, as a full-width row button: `Button ghost w-full justify-start px-3 py-2`. In expanded state: `PanelLeftClose size-4 mr-2` icon + `Caption text-muted` label "Collapse". In collapsed state: show only the `PanelLeftOpen size-4` icon centred. This follows the pattern used by Notion, Linear, and Vercel's sidebar — the toggle lives at the bottom of the nav, where users discover it naturally.

Basis: Sidebar design best practices. Research: §2.4.

---

**2.2 — The Approvals nav item badge should be visible in collapsed sidebar mode**

Priority: **High**

Current spec: the Approvals badge (red circle with count) is positioned `absolute -top-1 -right-1` relative to the nav icon. In collapsed mode, the sidebar width is 60px and only icons are visible — the badge should remain visible.

The spec does not explicitly address whether the badge is visible in collapsed state. This must be confirmed: the badge `z-index` must be above the sidebar background, and the badge must not be clipped by the `w-[60px]` container boundary. The `-right-1` positioning places the badge at `icon right edge + 4px`, which may clip against the sidebar container.

Recommendation: in collapsed mode, position the Approvals icon within `relative overflow-visible`. The badge `absolute -top-1 -right-1` will then extend beyond the icon bounds and remain visible. If the container clips the badge, use `absolute -top-1 right-1` (inside the icon bounds) in collapsed mode specifically. The badge must never disappear in collapsed mode — pending approvals are the highest-urgency signal in the app.

Basis: Research: §2.4 badge placement, ambient awareness requirement.

---

**2.3 — The global search (`Cmd+K`) must have a keyboard shortcut tooltip**

Priority: **Medium**

Current spec: the page header contains a global search input with `Cmd+K / Ctrl+K` to focus. The shortcut is mentioned in the feature spec but is not described as having a tooltip or visual affordance in the design spec.

Users who do not read documentation will not discover the `Cmd+K` shortcut unless they hover over the search field and see a tooltip.

Recommendation: the search input should have a right-side keyboard shortcut hint rendered as a `Badge`-style element inside the input: `⌘K` on macOS and `Ctrl+K` on Windows/Linux, in `Caption text-muted`. This is the pattern Linear uses — the shortcut is always visible in the input. When the input is focused, the shortcut hint disappears (replaced by the cursor). This teaches the shortcut passively to every user who sees the search bar.

Basis: Linear keyboard shortcut discoverability research. Research: §1.1 Linear, keyboard shortcut discoverability.

---

## 3. Screen 1 — Login and First-Time Setup

### What the current design gets right

- The login screen is correctly isolated (no sidebar, no navigation chrome) — a clean focused form is the right approach for authentication.
- The show/hide password toggle using Lucide `Eye` / `EyeOff` is standard and correct.
- Autofocus on the email field on mount is the correct default — reduces friction to zero for returning users.
- The step indicator for the First-Time Setup flow (numbered circles: upcoming / active in accent / completed with green check) is well-established and correct.
- The validation-on-blur pattern (inline red helper text below the field, not a modal or banner) is the lowest-friction validation pattern for multi-field forms.

### Improvements

**3.1 — The setup wizard Step 3 should not redirect to a separate login screen**

Priority: **High**

Current spec: on completing Step 3 of the setup wizard, the button "Go to Command Centre" navigates to the login screen. The user must then log in with the credentials they just created.

This creates an unnecessary friction loop. The user just created their account — they have authenticated intent. Requiring them to immediately log in again will cause confusion ("Did I do something wrong? Why am I being asked to log in?").

Recommendation: on successful completion of the setup wizard, issue a session automatically (the same session creation that occurs on login) and redirect directly to the Command Centre. The user's setup credentials are already in memory — there is no security reason to force a separate login. A success toast on the Command Centre: "Welcome to [Company Name]. Your AI company is ready." (matches the feature spec's welcome toast).

Basis: standard UX convention — registration flows should authenticate automatically. Any product that requires manual login immediately after registration creates unnecessary drop-off.

---

**3.2 — The login card should display a "Remember me" option**

Priority: **Medium**

Current spec (feature spec): the login screen includes a "Keep me signed in for 30 days" checkbox defaulting to unchecked. This is mentioned in the feature spec but absent from the design spec's visual layout description.

The design spec should explicitly describe the "Remember me" checkbox position (below the password field, above the submit button), its `type="checkbox"` + `Caption text-secondary` label pattern using shadcn/ui `Checkbox`, and the behaviour when checked (30-day refresh token instead of 7-day).

Recommendation: add the "Remember me" checkbox to the design spec login layout in the position between the password field and the submit button. Use shadcn/ui `Checkbox` component with `checked:bg-accent checked:border-accent`. Label: `Caption text-secondary`: "Keep me signed in for 30 days".

Basis: Alignment between design spec and feature spec; feature spec Section 1.3.

---

## 4. Screen 2 — Command Centre (Dashboard)

### What the current design gets right

- The 12-column grid with 7:5 split (Active Projects left, Agent Status right; Activity Feed left, Approvals Queue right) creates the right visual weight distribution — the wider left columns contain the more content-rich widgets.
- The four-card Quick Stats bar is within the "limit to five primary elements" recommendation (Research: §2.1 Real-Time Monitoring).
- The Agent Status Feed's WebSocket update with row-level `bg-accent-muted` flash is correct in concept (Research: §2.1), though the duration should be adjusted (see §1 improvement 1.2).
- Skeleton loaders per widget (rather than a page-level spinner) is correct — each widget loads and populates independently (Research: §2.1, skeleton states).
- The Pending Approvals stat card using `border-status-red` border and `text-status-red` value when non-zero is the right urgency signal — the card itself becomes actionable-feeling rather than informational.

### Improvements

**4.1 — The Quick Stats bar shows the wrong four metrics**

Priority: **High**

Current design spec: the four stat cards are: Open Tasks / Agents Active / Goals In Progress / Pending Approvals.

Based on the "three primary questions" principle (Research: Synthesis Decision 1) — the dashboard must answer: (1) Is anything blocked? (2) Is anything pending my approval? (3) What is the current company activity? — the current four stats do not surface "blocked" as a primary signal.

"Open Tasks" and "Goals In Progress" are useful but neither is a call to action. "Tasks Blocked" is a call to action. "Open Tasks" is noise when the user needs to triage.

Recommendation: replace "Open Tasks" with "Tasks Blocked" and replace "Goals In Progress" with "Agents Active". The revised four stats:

1. **Tasks Blocked** — red if > 0, grey/green if 0. Label: "TASKS BLOCKED". Sub: "require unblocking".
2. **Agents Active** — green if > 0, grey if 0. Label: "AGENTS ACTIVE". Sub: "of [total] total".
3. **Pending Approvals** — red if > 0, grey if 0 (board role only). Label: "PENDING APPROVALS". Sub: "action required" if > 0, "all clear" if 0.
4. **Open Tasks** — white. Label: "OPEN TASKS". Sub: "across all projects".

This reordering places the two urgency signals (blocked, approvals) first and left, where the eye scans first. "Agents Active" and "Open Tasks" are context, not calls to action.

Basis: Research: §2.1 hierarchy by urgency; Synthesis Decision 1.

---

**4.2 — The Agent Status Feed widget lacks an urgency sort**

Priority: **High**

Current spec: the Agent Status Feed lists all 18 agents in a scrollable list. The default filter is "All". The sort order is not specified.

Without a defined sort order, the list will render in database insertion order (or alphabetical by role name) — both of which are operationally meaningless. An operator scanning the Agent Status Feed wants to see blocked agents first, then active agents, then idle agents. Vacant and paused agents are the least urgent.

Recommendation: define the default sort order for the Agent Status Feed as urgency-based: BLOCKED → ERROR → ACTIVE → RUNNING → PAUSED → IDLE → VACANT. Within each group, sort alphabetically by role name. This ensures that when anything is wrong, it appears at the top of the list without requiring the user to apply a filter.

Additionally: add a visual group separator (`Caption text-muted uppercase tracking-widest text-[10px] px-4 py-1 bg-base border-b border-subtle`) between status groups when > 0 items exist in each. This mirrors Dagster's grouped asset view and Linear's grouped issue list.

Basis: Research: §2.1, "hierarchy by urgency not recency"; §1.4 Dagster status grouping.

---

**4.3 — The Activity Feed needs differentiation between action-required and informational entries**

Priority: **Medium**

Current spec: all Activity Feed items are rendered identically using the `ActivityFeedItem` component. There is no visual distinction between entries that link to a pending approval (which require Glen's attention) and entries that are purely informational (agent completed a task, agent updated finance data).

Recommendation: feed items that reference a pending approval should display a `border-l-2 border-status-amber` left accent on the `ActivityFeedItem` container. This is consistent with the left-border accent pattern used for active states throughout the app. The item text for such entries should include a `Button` ghost size `xs` inline: "Review" — positioned after the action description, navigating to the Approvals Page with the item pre-selected.

Entries that reference a completed task or a successful action have no left border.

Basis: Research: Synthesis Decision 8 (activity feed as audit record with actionable items surfaced); §2.5 Approval Workflow UX.

---

**4.4 — The Approvals Queue widget should show age with urgency colouring**

Priority: **Medium**

Current spec: each item in the Approvals Queue widget shows: approval type badge, agent name, summary (truncated), "Review" button. Age is not mentioned.

The feature spec Section 2.7 mentions that approvals are sorted by `created_at` ascending (oldest first), implying age matters. But the widget itself does not display age — so the "oldest first" sort provides no user-visible urgency signal.

Recommendation: add an age indicator to each item in the Approvals Queue widget. Position: between the summary text and the "Review" button. Format: `Caption text-muted` → amber if >24h → red if >72h. Example: "3h ago" (grey), "26h ago" (amber), "4 days ago" (red). This is the same pattern defined for the Approvals Page left column — it should be consistent in the widget.

Basis: Research: §1.6 Airplane.dev, age as urgency signal; §2.5 Approval Workflow UX.

---

**4.5 — The Activity Feed widget truncation at 20 items is insufficient for operational awareness**

Priority: **Low**

Current spec: the Activity Feed widget shows max 20 items in its scroll container and "older items are not paginated in v1."

A busy company with 18 agents can generate more than 20 activity events in an hour. The "Last 24 hours" filter with a hard 20-item cap means Glen may miss important activity. The "Last 24 hours" and "Last hour" filter options in the feature spec should control the actual count.

Recommendation: remove the 20-item hard cap. Instead, the widget should show all items within the selected time window (default: Last 24 hours), up to a configurable scroll container of `max-h-[320px]`. The list scrolls within the fixed widget height. A "View full feed" link at the bottom navigates to a dedicated activity feed page (a v2 feature consideration). In v1, a "Load more" button at the scroll container bottom is sufficient.

Basis: Operational monitoring completeness requirement.

---

## 5. Screen 3 — Org Chart View

### What the current design gets right

- SVG paths with bezier curves for connector lines is the correct technical approach — smooth curves between nodes are more visually refined than straight lines or right-angle elbows.
- The pan/drag interaction using `cursor-grab` / `cursor-grabbing` is the correct interaction model for a canvas that may exceed viewport dimensions.
- The Glen Pryer root node with a distinct visual treatment (`border-2 border-accent/50`) correctly establishes him as human-operator-not-agent.
- The mobile fallback to an accordion list is pragmatic and correct — the canvas tree is unusable on mobile, and the accordion preserves functionality.
- The toolbar search with real-time filtering (dimming non-matching nodes to `opacity-30`) is the right pattern for quickly finding a specific role without zooming in on every node.

### Improvements

**5.1 — TreeNode should implement progressive disclosure, not full detail by default**

Priority: **High**

Current spec: each `TreeNode` (180px × 80px) displays role title (Row 1), agent name + model tier badge (Row 2), and status badge + current task (Row 3). At 18 nodes filling a viewport, this creates a visually dense and hard-to-scan canvas.

Recommendation: implement two display states for `TreeNode`.

**Default state** (compact, always visible): role title (`Body Strong text-primary`, truncated at 22 chars) and `StatusBadge` only. The node height reduces to `180px × 56px` in this state, giving more breathing room between nodes.

**Hover/selected state** (full detail): model tier badge appears in Row 2 beneath the role title. Agent name appears next to it. If status is Active/Running: current task appears in Row 3 as `Caption text-muted truncate`. Node maintains 180px × 80px dimensions on hover via CSS height transition (`transition: height 150ms ease-out`).

This follows Dagster's faceted lineage view approach — users who need detail hover to get it; users scanning the full chart see only what they need (role + status).

Basis: Research: §1.4 Dagster progressive disclosure; Synthesis Decision 7.

---

**5.2 — Vacant nodes should have a distinct visual weight, not just a dashed border**

Priority: **Medium**

Current spec: vacant roles use `border-2 border-dashed border-default` and render the role title in `text-muted` with a `UserPlus` icon and "Hire" text.

The dashed border is a reasonable vacancy signal, but the overall visual weight of a vacant node is nearly identical to a populated idle node (both use muted text). In a canvas with 18 nodes, several of which may be vacant, vacant nodes should be clearly subordinate to populated ones — they are "to-do" items, not active entities.

Recommendation: add `opacity-60` to vacant nodes at the component level. A vacant node at 60% opacity is clearly present (the slot is defined, the role name is readable) but visually recedes relative to populated nodes. On hover, the opacity returns to 100% and the "Hire" button becomes fully visible. This is a stronger signal than dashed border alone.

Basis: Research: standard ghost/inactive state conventions in design systems.

---

**5.3 — Add a heartbeat staleness indicator to agent nodes**

Priority: **Medium**

Current spec: agent nodes display operational status (Active, Idle, Blocked, Paused) via `StatusBadge`. The `last_heartbeat_at` field exists in the data model but is not surfaced in any UI component.

An agent that is marked "Idle" but whose `last_heartbeat_at` was 2 hours ago may be offline, unresponsive, or experiencing an unreported error. Operational status without heartbeat freshness is incomplete health information.

Recommendation: add a small `Clock size-3 text-status-amber` icon to the `TreeNode` component when `last_heartbeat_at` is more than 30 minutes ago AND the agent's status is not explicitly `offline` or `paused`. Position: top-right corner of the node, `absolute top-2 right-2`. A tooltip on hover: "Last heartbeat: [relative time ago]". This appears only in the hover/selected state to avoid cluttering the compact default view.

Basis: Research: §1.4 Dagster freshness policies; Synthesis Decision 5.

---

**5.4 — The List View (flat table) needs explicit sort defaults**

Priority: **Medium**

Current spec: the List View table columns are defined with sortable/filterable flags, but no default sort is specified. This means the table will render in an unspecified order.

Recommendation: default sort for the List View should be: Status (urgency-ascending: Blocked → Active → Idle → Paused → Error → Vacant), then alphabetical by role name within each status group. This matches the urgency-based sort logic recommended for the Agent Status Feed widget (see §4 improvement 4.2) and ensures the most-urgent agents appear at the top.

Basis: Research: §2.1 hierarchy by urgency; consistency with Agent Status Feed sort logic.

---

## 6. Screen 4 — Role Detail Page

### What the current design gets right

- The two-column header block (56px avatar left, details right) with the hierarchy of `H1` role title → `H3` agent name → badges row → reports-to → direct reports is correct typographic hierarchy.
- The `ProgressBar` on the Budget Used stat card (green < 80%, amber 80–99%, red ≥ 100%) is the right budget utilisation display (Research: §2.7, budget cap as progress bar).
- Defaulting the System Prompt section to collapsed is correct — this section can be thousands of characters and should not be the first thing visible on the page.
- The execution log's expandable run rows (collapsed: summary + duration + token count + cost; expanded: full log entries) is the right progressive disclosure pattern (Research: §1.3 Retool expandable rows).
- The copy button on the System Prompt `CodeBlock` (`absolute top-3 right-3`) is an essential affordance for developers.

### Improvements

**6.1 — The execution log collapsed row should show total cost prominently, not as an afterthought**

Priority: **High**

Current spec: the execution log collapsed row contains: timestamp / run summary / duration / token count / cost / expand chevron. Cost is the rightmost element before the chevron, in `Caption Mono text-accent w-20 text-right`.

The cost figure is the most actionable signal in the execution log — it tells Glen whether an agent's execution is unexpectedly expensive. Placing it last and at small size means it is likely to be ignored in a visual scan.

Recommendation: reorder the collapsed row right section to: cost (primary, `Body Mono text-accent w-24 text-right`) / token count (secondary, `Caption Mono text-muted w-24 text-right`) / duration (tertiary, `Caption Mono text-muted w-20 text-right`) / expand chevron. Moving cost to the leftmost of the right-side metadata makes it the first figure a right-to-left scanner sees.

Basis: Research: §2.7, cost per execution run as primary metric.

---

**6.2 — The execution log expanded row must show input/output/cached token breakdown**

Priority: **High**

Current spec: the expanded run row shows "full `ExecutionLogEntry` items (each line of the log)." There is no specification for where the token breakdown appears in the expanded state.

Recommendation: add a summary bar at the top of the expanded content, before the log lines. This bar: `flex items-center gap-6 px-4 py-2 bg-base border-b border-subtle`. Contents in `Caption Mono text-muted`: "Input: [N,NNN] tok" · "Output: [N,NNN] tok" · "Cached: [N,NNN] tok" · "Cost: $[X.XXX]". This bar gives the cost breakdown context before the user reads the log lines below it.

Basis: Research: Synthesis Decision 6 and §2.7 input/output token split.

---

**6.3 — The Performance Metrics section needs sparkline trends, not just point-in-time values**

Priority: **Medium**

Current spec: the four `StatCard` components on the Role Detail page show current-state values: Tasks Completed (all time), Avg Completion (last 30 days), Escalations (this month), Budget Used (this month). None show trend data.

"14 tasks completed" tells Glen nothing about whether this agent is performing well or declining. "14 tasks completed (up from 8 last month)" is actionable.

Recommendation: add an optional `delta` indicator to the `StatCard` component: a small `ChevronUp size-3` (green) or `ChevronDown size-3` (red) with a `Caption text-status-green` or `Caption text-status-red` delta value (e.g. "+6 vs last month"). This requires the API to return month-over-month comparison data for these metrics. The visual change to the component is minimal — the delta line sits below the sub-label.

Basis: Research: Synthesis Decision 1 (metric trends alongside current values); §2.1 "sparklines or delta indicators on stat cards".

---

**6.4 — The Task History table should show outcomes with more granularity**

Priority: **Low**

Current spec: the Task History table Outcome column uses three small badges: Done (green), Escalated (amber), Blocked (red). "Escalated" is ambiguous — was it escalated and then resolved? Is it still escalated?

Recommendation: replace "Escalated" with "Completed via escalation" (green) or "Escalated — pending" (amber) if the escalation is still open. The distinction matters for evaluating agent performance — a task that required escalation but was ultimately completed is a different signal from a task that is stuck in an escalation loop.

Basis: Audit trail completeness; clarity of agent performance signals.

---

## 7. Screen 5 — Projects View and Project Detail

### What the current design gets right

- The projects table column widths (35% name, 12% status, 18% lead agent, 25% tasks breakdown, 10% last updated) reflect the reading-order importance of each column correctly.
- The inline task count format (`12 total · 3 in progress · 1 blocked · 8 done`) with red colouring on blocked count and amber on in-progress is a compact but highly informative status summary.
- The Project Detail two-panel approach (info block top + task list below) is a correct layout for this content.
- The task filter dropdowns (status and priority) within the Project Detail task list are placed in the right position (header right side of the task list section).

### Improvements

**7.1 — The Projects table is missing a progress column**

Priority: **Medium**

Current spec: the Projects table on the list screen shows: Project name / Status / Lead Agent / Tasks breakdown (count format) / Last Updated.

The feature spec (Section 2.4) describes a progress bar for Active Projects on the dashboard showing "% of tasks in `done` status out of total tasks." This progress bar exists on the dashboard widget but not on the Projects table itself. A user navigating to the full Projects view from the dashboard loses this visual completion indicator.

Recommendation: add a Progress column to the Projects table (inserted between Tasks and Last Updated). Display as a `ProgressBar` component at `w-32 h-1.5` with a `Caption Mono text-muted` percentage value to its right (e.g. "67%"). This occupies the space currently used by the Last Updated column width — reduce Last Updated to 8% and allocate 12% to Progress.

Basis: Feature spec consistency; visual completion tracking is more actionable than a text task count for understanding project health.

---

**7.2 — The Project Detail page header "Edit" button placement is inconsistent**

Priority: **Low**

Current spec: the Project Detail page header right side shows "Edit" button (`Button outline`) and "New Task" button (`Button default`). The "Edit" button applies to the project metadata, not to the task list. This positioning ambiguity (are we editing the project or the task list?) could confuse users.

Recommendation: move the "Edit" button to the Project Info block itself (the `bg-surface` card), positioned as an icon-only `Button ghost h-7 w-7` with `Pencil size-3.5` in the top-right corner of the card (`absolute top-4 right-4`). The page header right side retains only the "New Task" button. This co-locates the edit action with the content it edits.

Basis: Research: Retool's principle of co-locating edit actions with their target content.

---

## 8. Screen 6 — Task Detail

### What the current design gets right

- The two-column layout (8:4 main content and metadata sidebar) is correct for task detail pages — content is the primary reading experience, metadata is reference.
- The inline status transition UI (transition buttons + `InlineCommentField` for blocking transitions) is a significant design decision that avoids modal overhead for status changes. This is correct — modal confirmation for blocking is appropriate; a full modal for routine status changes is excessive friction.
- Requiring a minimum 10-character comment to confirm a "Blocked" transition enforces accountability without being overly prescriptive.
- The optimistic update pattern for comment posting (comment appears immediately, then API confirms) is the correct approach for a tool used in real-time operations.
- The activity log rendering markdown comments (via `react-markdown`) with prose styling is correct — agents may generate formatted comments with lists, headers, or code blocks.

### Improvements

**8.1 — The status transition buttons should show colour indicators, not just text labels**

Priority: **Medium**

Current spec: transition buttons are `Button variant outline size-sm` with "each button shows the target status name and the corresponding `StatusBadge` colour dot as a small circle prefix." The colour dot prefix is mentioned but its exact implementation is left vague — "small circle prefix."

For clarity and consistency with the StatusBadge component, each transition button should embed the target `StatusBadge` (compact variant, no label, just the coloured dot and border) as its leading element. The button label is the status name in `text-secondary`. This makes the transition target immediately scannable by colour before the label is read.

Recommendation: the transition button pattern should be: `[6px dot in target status colour] [Status name]` where the dot uses the same `bg-[status-colour] border border-[status-colour]` recipe as the `StatusBadge` leading element. The dot should be `8px × 8px` within the button context (slightly larger than the 6px used in badges, to be legible as a standalone element).

Basis: Research: §2.3 status badge semantics — colour and icon redundancy.

---

**8.2 — The "Assigned to" metadata in the right sidebar should show the agent's current status**

Priority: **Low**

Current spec: the right sidebar shows "Assigned to: [AgentAvatar 28px] [Role name as text-accent link]" as a metadata row.

A task detail page is often opened to understand why work is progressing or not. Knowing the assigned agent's current status (Active, Blocked, Idle) directly answers "is the person doing this task able to do it right now?" This is directly visible on the Org Chart and Role Detail pages but not on the task page where it is most contextually relevant.

Recommendation: add a small `StatusBadge` inline after the agent role name in the "Assigned to" row. The badge is compact (no label, just the colour dot) to avoid overloading the metadata row. Tooltip on hover: "[Role name] is currently [status]".

Basis: Contextual completeness; reduces navigation to Org Chart just to check agent status.

---

**8.3 — The Relations block needs an "empty" visual state that is inviting, not clinical**

Priority: **Low**

Current spec: if no blocking/blocked-by/related tasks exist, each sub-section shows `Caption text-muted italic`: "None." Three consecutive "None." labels looks like an error state or incomplete data.

Recommendation: when all three relations sub-sections are empty, replace the entire Relations block with a single centred empty state: `py-6 text-center`. `Link size-6 text-muted mx-auto mb-2`. `Caption text-muted`: "No linked tasks." `Button ghost size-sm mt-1`: "Link a task". This is cleaner than three "None." labels and provides a clear entry point for adding relations.

Basis: Standard empty state best practices; the feature spec mandates empty states for all lists.

---

## 9. Screen 7 — Finance Tab

### What the current design gets right

- The horizontal tab sub-navigation (Revenue / Payroll / Cash Flow / NSI Scenarios / Pipeline) within Finance is correct for 5 sub-sections — tabs are appropriate here where a sidebar would feel heavy (Research: §2.4, tabs for sub-sections within a page).
- Monospace font for all financial figures in tables is correct (Research: §2.7).
- Left-align text columns, right-align monetary columns is implemented correctly in the revenue and payroll table specs.
- The ProgressBar for Monthly vs Target with green/amber/red thresholds is the right pattern for budget visualisation (Research: §2.7, budget cap utilisation as progress bar).
- The total footer row in financial tables (background: `bg-elevated`, bold text) is the correct way to summarise totals without a separate summary card.

### Improvements

**9.1 — The Cash Flow bar chart should use bar charts, not a flex layout approximation**

Priority: **Medium**

Current spec (Section 9.3): the Cash Flow net position chart uses a `flex items-end gap-6 h-[140px]` layout with manually calculated percentage heights for each bar. This is a visual approximation of a bar chart, not an actual chart.

The three-bar flex approach has two problems: (1) the bar heights are calculated in CSS as proportions of the tallest absolute value, which requires complex runtime logic in the component; (2) there is no axis, no gridlines, and no consistent scale reference. A user cannot look at the chart and know if a "60% height" bar represents £2,000 or £20,000.

Recommendation: implement the cash flow chart using a lightweight charting library already likely in the stack (Recharts or Tremor, both compatible with shadcn/ui and React). A simple `BarChart` with a y-axis, three bars, and consistent scaling is substantially more informative. The bars should use the same green/red colour logic for positive/negative. The chart should be no taller than `200px` to remain compact.

Basis: Research: §2.7, "bar charts for daily/weekly cost and token usage" and the need for proper scale reference.

---

**9.2 — The Finance tab should include an agent cost breakdown view**

Priority: **Medium**

Current spec: the Finance tab has five sub-tabs: Revenue / Payroll / Cash Flow / NSI Scenarios / Pipeline. There is no sub-tab for AI agent operating costs.

The agent cost data exists in the data model (`current_month_spend_usd` per agent, `monthly_budget_cap_usd` per agent). This is a material operational cost for NBI — Opus agents in particular can incur significant API costs. Burying this in individual Role Detail pages means Glen has no aggregate view of AI operating expenditure.

Recommendation: add a sixth sub-tab: **Agent Costs**. Content: a table of all agents showing `role_name` / `model_tier` badge / `current_month_spend_usd` (right-aligned, Mono) / `monthly_budget_cap_usd` (right-aligned, Mono, "No cap" if null) / utilisation ProgressBar / `last_execution_at`. Table footer: total AI costs for the month. Above the table: two `StatCard` components — "Total AI Spend This Month" and "Projected Monthly AI Spend" (based on current run rate).

Basis: Research: §1.7 Anthropic Console, model-tier cost attribution; §2.7 AI cost display patterns.

---

**9.3 — The Revenue table "Status" column should use the standard StatusBadge, not a custom variant**

Priority: **Low**

Current spec: the Revenue table status column uses `StatusBadge` variants defined as: Active (green), Paused (amber), Ended (grey). These match the standard status colour semantics correctly. However, the spec does not explicitly confirm that these use the standard `StatusBadge` component recipe — it simply describes the colours. Verify and confirm that the revenue table status badges use the same `StatusBadge` component as all other status displays, not custom CSS.

Recommendation: explicitly state in the design spec that the Revenue, Payroll, and Client Health status columns use the standard `StatusBadge` component with the appropriate status token. This prevents engineers from implementing one-off badge styles that deviate from the design system.

Basis: Design system consistency discipline.

---

## 10. Screen 8 — Leads & Clients Tab

### What the current design gets right

- The Kanban default with Table as an equal option is correct — both views are first-class (Research: Synthesis Decision 9, §2.6 Kanban vs Table).
- The colour progression of kanban column headers (grey → blue → amber → green as stages advance) creates a visual progress metaphor that reinforces left-to-right pipeline movement (Research: §2.6 column header stage visualisation).
- The overdue colouring on last contact date (amber >14 days, red >30 days) is the primary urgency signal in the pipeline and is correctly implemented.
- The drag-and-drop card interaction using `@dnd-kit/core` with `opacity-60 scale-[1.02] shadow-lg` on drag start is the correct tactile feedback pattern.
- The Overdue Follow-ups sub-tab with a dedicated amber notice banner and a "Mark contacted" quick-action is a significant usability feature — it brings Glen directly to the work that needs doing without requiring filtering.

### Improvements

**10.1 — Kanban cards should show the expected value to make the pipeline financially legible**

Priority: **High**

Current spec: the `KanbanCard` component shows company name / contact name / last contact date / next action / owner. There is no mention of expected deal value on the card.

A BD pipeline that does not show the financial weight of each opportunity renders all leads as equal. Glen cannot prioritise outreach by value without opening each card individually. The most important piece of information on a kanban card — after "who is this" — is "how much is this worth."

Recommendation: add a `Body Mono text-accent` expected value display to the `KanbanCard`, positioned below the company name: "£XX,XXX" or "Value TBC" in `Caption text-muted italic` if no expected value is set. This single addition fundamentally improves the financial utility of the Kanban view.

Basis: Research: §2.6 kanban card content hierarchy; §1.7 pipeline revenue screen value display.

---

**10.2 — The Table view should persist the filter state when switching from Kanban**

Priority: **Medium**

Current spec: the view toggle between Kanban and Table is described but filter state persistence on view switch is not specified.

If Glen applies a "Proposal" stage filter on the Kanban view and then switches to Table view, losing the filter is jarring and forces re-application. The view is a presentation choice, not a navigation event.

Recommendation: add a note to the design spec: "The active stage filter, search query, and owner filter are stored in component state (not URL) and are preserved when switching between Kanban and Table views. The view toggle changes only the presentation mode."

Basis: Research: Synthesis Decision 9 (view toggle preserves filter state).

---

**10.3 — The Lead Detail slide-over should open via the right side, not override the current view**

Priority: **Low**

Current spec: "Clicking a card (not dragging): opens the Lead Detail slide-over (see Section 13)." The slide-over uses shadcn/ui `Sheet` which slides from the right. This is correct.

The issue is that in Kanban view, a full-height right-side slide-over will cover the entire Kanban board (particularly on narrower viewports). The user loses the spatial context of where the card sits in the pipeline.

Recommendation: the Lead Detail slide-over should be `w-[480px]` and use a semi-transparent overlay (`bg-black/40` rather than `bg-black/60`) so the Kanban board is faintly visible behind it. This preserves spatial context. On mobile (768px and below), the slide-over is full-width with an opaque overlay — the viewport is too narrow to maintain context.

Basis: Spatial context preservation principle; shadcn/ui Sheet overlay configuration.

---

## 11. Screen 9 — Approvals Page

### What the current design gets right

- The two-column master-detail layout (340px list left, flexible detail right) is the correct pattern for a review-and-decide workflow (Research: §2.5 Approval Workflow UX, complete context on one screen).
- Auto-selecting the oldest pending item on mount ensures the most-urgent item is always addressed first (Research: §2.5 FIFO ordering).
- The three distinct action outcomes (Approve, Request Changes, Reject) with different semantic colours (green, amber, red) and required comments for non-approval outcomes is the correct implementation (Research: §1.6 Airplane.dev, three distinct outcomes; §2.5 required comment for rejection).
- The sticky action area at the bottom of the right pane (`sticky bottom-0 bg-elevated`) ensures the decision actions are always accessible regardless of content length above.
- The "Request Changes" as an amber outcome (not a reject) is a critical design decision that prevents approval workflows from being binary and creates an iterative path for refinement.
- The Resolved tab preserving the full history with outcome badges and decision metadata is the correct audit trail implementation (Research: Paperclip immutable audit trail).

### Improvements

**11.1 — The email content block should render as a styled email, not plain text**

Priority: **High**

Current spec: for email approvals, the "FULL CONTENT" block renders the email body in `Body text-secondary` as "plain text preserving line breaks" within a `bg-input border border-subtle rounded-lg` container.

Plain text in a code-block-style container creates cognitive dissonance: the container looks like a code/log viewer, not an email preview. A reviewer reading an email draft in a monospace code frame is less likely to read it as a human reader would. The email should look like an email.

Recommendation: for email-type approvals, style the content block as an email preview: `bg-input border border-subtle rounded-lg overflow-hidden`. At the top of the block: an email header section (`px-4 py-3 border-b border-subtle`): "To: [recipients]" in `Caption text-muted`, "Subject: [subject]" in `Body Strong text-primary`. Below the header: email body in `px-4 py-4 Body text-secondary` with `white-space: pre-wrap` to preserve intentional line breaks. The body should use Inter (proportional), not JetBrains Mono.

Basis: Research: §2.5 Approval Workflow UX, "clarity over density in the content block"; §1.6 Airplane.dev, structured output display.

---

**11.2 — The approval type badge in the header should be large and positioned before the title**

Priority: **Medium**

Current spec: the detail header shows, top to bottom: approval type badge (large variant) → request title (H2) → requesting agent → age. The "large variant" badge is defined as `px-3 py-1 text-sm` but its exact positioning relative to the H2 title is not specified.

Recommendation: the approval type badge should be positioned `mb-2` above the `H2` title (not inline with it). This creates a clear visual sequence: "what type of approval is this" → "what specifically is being requested." The badge size at `text-sm` with `px-3 py-1` is appropriate. The badge should use the same `StatusBadge` recipe with approval-type colour semantics.

Basis: Standard detail-page header hierarchy — category first, specific title second.

---

**11.3 — The "Confirm" submit button should clearly state the action being taken**

Priority: **Medium**

Current spec: after selecting Approve, Request Changes, or Reject and entering a comment, the submit button reads "Confirm [Approve / Request Changes / Reject]."

"Confirm Approve" is grammatically awkward. "Confirm Request Changes" is even more so.

Recommendation: the submit button label should use imperative language that matches the action:
- **Approve selected:** "Approve and Proceed"
- **Request Changes selected:** "Send Change Request"
- **Reject selected:** "Reject Request"

These are more actionable and less ambiguous than "Confirm [verb]".

Basis: UX writing principle — button labels should state what will happen, not confirm that you are doing something.

---

**11.4 — The Pending tab should show a "you're all clear" empty state that feels rewarding, not empty**

Priority: **Low**

Current spec: the Pending tab empty state (no items): `ShieldCheck size-8 text-muted mx-auto mt-12` + `Body text-muted text-center px-6 mt-3`: "No pending approvals." + `Caption text-muted`: "Agents will request approval here..."

The empty Approvals state is a positive state — it means Glen is up to date. The current grey icon on a grey background feels like an error screen or a dead end. It should feel like a positive completion.

Recommendation: change `ShieldCheck` colour from `text-muted` to `text-status-green`. Change the primary message from `Body text-muted` to `Body Strong text-status-green`: "All clear." Change the secondary message to `Caption text-muted`: "No agents are waiting for your approval." The green shield check communicates "everything is OK" rather than "nothing is here."

Basis: Research: §1.8 Paperclip, board governance model — "all clear" is a meaningful positive state, not just an absence.

---

## 12. Screen 10 — Settings

### What the current design gets right

- The vertical tab list (`w-[180px]`) for Settings navigation at 6 sub-sections is the correct choice over a horizontal tab bar (Research: §2.4 vertical tabs for Settings).
- The Danger Zone section with explicit irreversibility warning and a required typed confirmation ("RESET") is the correct UX for truly destructive actions — it forces intentional engagement.
- The "Reset Password" button on the Edit User dialog (generating a temporary password) is preferable to showing the current password hash — correct security practice.
- The Budget Management sub-section (not fully described in the design spec, but referenced as a board-only section) aligns with Paperclip's per-agent budget cap governance model.
- The API Keys section being board-only is correctly scoped — API key exposure is a security risk and should not be visible to Admin or Viewer roles.

### Improvements

**12.1 — The Settings vertical tab list needs an active state consistent with the sidebar**

Priority: **Medium**

Current spec: the Settings vertical tab list is `w-[180px] shrink-0 border-r border-subtle pr-6`. The active tab state is not explicitly defined for the vertical tab list — it is described as shadcn/ui `Tabs` but does not confirm whether the active indicator follows the left-border convention used in the sidebar.

For consistency, the Settings vertical tab active state should match the sidebar nav item active state exactly: `bg-highlight text-primary border-l-2 border-accent -ml-[2px] pl-[14px]`.

Without this explicit definition, engineers may implement shadcn/ui's default `Tabs` active state (bottom border on a horizontal tab bar) rather than the left-border vertical convention.

Recommendation: explicitly add to the design spec: "Settings vertical tab active state: same as sidebar nav active state (`bg-highlight text-primary border-l-2 border-accent -ml-[2px] pl-[14px]`). The tab list is left-aligned — there is no bottom underline."

Basis: Design system consistency; Research: Synthesis Decision 2 (left-border active indicator as primary selection signal).

---

**12.2 — The Agent Library sub-section is referenced but not designed**

Priority: **High**

Current spec: the Settings sub-navigation includes "Agent Library" but this sub-section is not described in the design spec. The feature spec also does not detail this section beyond listing it as a Settings tab.

An "Agent Library" in the context of this application would logically be a reference view of all defined agent roles (possibly their system prompts, personas, and configurations as a library resource), distinct from the live Org Chart. However, without a defined purpose and layout, this section cannot be implemented.

Recommendation: escalate to the UI/UX Lead for a brief on the intended purpose and content of the Agent Library section before implementation begins. This is a blocker for the Settings screen.

Basis: Cannot design what has not been specified. This is a gap in the current design spec.

---

**12.3 — The Knowledge Base sub-section is referenced but not designed**

Priority: **High**

This is the same situation as the Agent Library above. The Settings Knowledge Base sub-section is listed in the sub-navigation (`company/knowledge/` → Tier 1 files, `roles/{role}/knowledge/` → Tier 2, `projects/{project}/knowledge/` → Tier 3) but its UI is not defined in the design spec.

A Knowledge Base management UI would logically display the three knowledge tiers with their file contents, allow file uploads, and associate files with agents or projects. Without this specification, the section cannot be built.

Recommendation: escalate to UI/UX Lead alongside the Agent Library gap. Both sections require specification before the Settings screen can be fully implemented.

Basis: Specification completeness; these are blockers.

---

*Note to UI/UX Lead: Items marked Priority High represent usability-critical issues or specification gaps. Items marked Priority Medium represent meaningful improvements that should be addressed before v1 launch. Items marked Priority Low are polish passes appropriate for post-launch refinement. The two High-priority items in Section 12 (Agent Library and Knowledge Base being undesigned) are blockers for the Settings screen implementation.*
