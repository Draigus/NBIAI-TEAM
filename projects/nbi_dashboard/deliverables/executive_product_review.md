# NBI WorkSage — Executive Product Review

**Date:** 2026-04-14
**Reviewer:** Claude (acting as NBI exec consultant + product manager)
**Scope:** Full review of the NBI WorkSage platform after the overnight session that added ~13 phases of work (bug fixes, Bug Tracker, SoW layer, Calendar events, Teams, Hiring, Practices, Warnings sidebar, and polish).

---

## Executive Summary

NBI WorkSage has evolved from a task dashboard into a full consultancy operations platform. It now covers the full life cycle: CRM (leads) → SoW management → delivery (tasks with 4-level hierarchy + teams + calendar) → financials → reporting. The recent session closed 42 of 48 backlog items and added foundational data layers (SoWs, Teams, Practices, Hiring) that unlock a lot of future work.

**Overall health:** Good. The product is production-grade enough to run NBI day-to-day, the code quality is high after two code-review passes, and the security posture is solid (XSS hardening, RBAC, pricing-filter pipeline, UUID validation). The gaps are mostly in two areas: (1) the sheer surface area now demands better information architecture and onboarding, and (2) several "stub" implementations (research, SMTP, QuickBooks) need real backends to deliver full value.

**Top three priorities for the next sprint:**
1. **Settle the information architecture.** Sidebar is overloaded. Split Settings, flatten views, introduce an admin area.
2. **Wire real backends for the three stubs** (research, email, time tracking) so blocked features light up.
3. **Start the telemetry/BI dashboard** (already planned). Without usage data we're flying blind on what actually gets used.

---

## What Works Well

### Architecture
- **4-level hierarchy** (Project > Feature > Story > Task) with prerequisites, dependencies, and timeline views is a genuinely powerful model. The addition of the SoW layer (now optional) completes the picture: Client > SoW > Project > Feature > Story > Task.
- **Migration framework** is disciplined. 18 numbered migrations, idempotent, auto-applied on restart.
- **Monolithic frontend** is unfashionable but practical — a single HTML file means no build step, trivial deploys, zero framework churn. At 15k lines it's approaching the limit but the function-level organisation holds up.
- **Backup/restore** with full table coverage is a real safety net.

### Product fit
- **Bug Tracker as a first-class view** is the right call. It makes the product self-dogfooding — every session closes more bug tracker items, feedback → fix → release → feedback.
- **SoW pricing/legal filter** is uniquely valuable for NBI. It's the kind of feature a generic PM tool would never build, but is essential here because client SoWs contain commercially sensitive data employees shouldn't see.
- **Prerequisites system** with server-side enforcement is unusually robust for a small-team tool. It prevents premature Done-marking which is a common issue in consulting PM.
- **Multi-client portfolio view** with per-client filters, health rollups, and workload views — you can see "NBI Portfolio" or drill into one client instantly. This is the thing that justifies a bespoke tool over Asana/Monday.

### Engineering
- **100% JSDoc coverage** on the frontend (403 functions).
- **Audit logging** on every mutation. Rare for a tool this size.
- **Cursor-based pagination** on large lists. Scales as task count grows.
- **Rate limiting + Prometheus metrics + retry/circuit breakers** on the server. This is production-grade infra nobody would build unless they've been burned before.

---

## Gaps & Risks

### Information Architecture — HIGH
The sidebar now has 10 top-level views (Dashboard, Workload, Projects, People, Leads, Expenses, Bug Tracker, Hiring, Finances, Settings) plus MY WORK, CLIENTS, PRACTICES, HEALTH, QUICK FILTERS. That's too much for a single column.

**Recommendation**: Group the sidebar into collapsible sections:
- **Work**: Dashboard, Workload, Projects, People, My Work
- **Business**: Leads, Hiring, Expenses, Finances
- **Meta**: Bug Tracker, Settings

Split Settings into sub-pages: Account / Team Admin / Data / Page Permissions / Bug Reports / Changelog. Currently it's a single overloaded page.

### Onboarding — HIGH
A new NBI employee seeing this for the first time has no guidance. The data is already dense. There are no empty states with "do this first" prompts. No tooltips on icons. No in-product help.

**Recommendation**: Add a lightweight onboarding checklist that appears for new users: "Complete your profile → Set your working hours → Pick your default client filter → Report your first bug → Close your first task". Dismissible once done. This is 1-2 days of work and will make the difference between NBI employees adopting this and quietly reverting to spreadsheets.

### Real Research Backend — HIGH
The "Gather Portfolio Detail Information" button on the client page is a stub. It correctly leaves all fields blank (no hallucinations), but it's not delivering value. Glen specifically wanted this working with real web sources.

**Recommendation**: Integrate with a real search API (Brave Search, Tavily, or Anthropic's web search once available). Constrain results to verified facts only, with source URLs stored alongside each field. This is 2-3 days of work and gives NBI a real data-entry shortcut.

### SMTP & Email — MEDIUM (blocked on external)
Three features remain blocked: email warnings on late tasks, PM report system, password reset emails. Glen needs to provide SMTP provider details. Once configured, these light up immediately (code is already written).

**Recommendation**: Use Postmark or Resend (both have generous free tiers + good deliverability). Glen creates an account, provides API key, and we flip a switch. 30 minutes of work post-SMTP setup.

### QuickBooks Time Integration — MEDIUM (blocked on external)
Blocked on Bryan's token. Once available, we get real time tracking data feeding into the hours-spent fields on tasks.

### SoW Layer Needs UI Surface — MEDIUM
Phase 3 added the data layer and upload flow, but the sidebar hierarchy doesn't yet show Client > SoW > Project. Right now SoWs are only visible inside the client detail panel. Users won't discover them naturally.

**Recommendation**: Extend the client section of the sidebar to expand into SoW sub-items on click, and filter views by SoW as well as by client. 1 day of work, high visibility payoff.

### Telemetry & BI Dashboard — MEDIUM (already planned)
Plan saved in `.claude/plans/serialized-hatching-anchor.md`, reminder set for 15 April. Without usage telemetry we don't know:
- Which views are actually used
- Where users get stuck
- Which features are noise
- How long typical sessions are

**Recommendation**: Before adding more features, ship the telemetry collection. Use a simple events table (`event_name`, `user_id`, `properties` JSONB, `created_at`) fed from frontend calls. Dashboard in Finances-style view for Glen to self-serve.

### Mobile Experience — MEDIUM
The app has responsive CSS down to 480px but the actual experience at mobile widths is compromised. Sidebar hides, tabs stack, and dense tables overflow. Magnus and other team members likely browse from phones at times.

**Recommendation**: Define which views must be mobile-first (probably: My Work, Bug Tracker, submit a bug, Calendar). Polish those specifically rather than trying to make everything work. A "lite" view toggle for mobile users could be worth it.

### Notifications are in-app only — MEDIUM
The notification system works but is in-app only. Users have to log in to see them. For late-task warnings this is a problem.

**Recommendation**: When SMTP lands, also wire notifications to email. Optionally, add a Slack integration (NBI uses Slack per my earlier notes).

### No integration with external tools — LOW but ongoing
WorkSage is an island. No Jira/Linear import, no Google Drive / OneDrive for file links (only Sharepoint URL embed), no calendar sync with Google/Outlook.

**Recommendation**: Prioritise by what NBI actually uses. Tom's expense reports go somewhere — does that need API integration? Glen's calendar — Google or Outlook?

---

## What's Missing That I'd Add

### Must-have additions

1. **Billing / invoicing linkage** — Right now fee income is manual entry in Finances. If the SoW layer had a `billing_schedule` field (kept server-side, not exposed in work_package_text), Finances could auto-generate expected invoices. This stays within the "no pricing to employees" rule because only admins/finance roles would see it.

2. **User profile page** — Each person should have a page showing their tasks, their time logged, their leads, their calendar, their certifications/skills. Currently People view aggregates across users but there's no "Glen Pryer's page".

3. **Reports / analytics view** — Beyond the portfolio report, I'd want filterable analytics: "show me all projects over 20% late", "show me client revenue trend last 6 months", "show me hours burned vs estimated by assignee". These exist partially but aren't discoverable.

4. **Document library** — SoWs can be uploaded now but other documents (client contracts, NDAs, case studies, templates) have no home. A simple per-client documents tab would centralise everything.

5. **Client-facing portal (read-only)** — Glen's clients could have limited access to see only their own status (tasks in progress, upcoming milestones, team assigned, time off). This is a differentiator that moves NBI from "we use a tool internally" to "we give you transparency".

6. **Onboarding workflow** for new clients — when a new client is created, auto-create the default structure: SoW placeholder, draft project, kickoff meeting task, status template. Saves 20-30 minutes per new engagement.

### Nice-to-haves

7. **Bulk import/export** improvements — Excel template exists but is stalled. Add CSV import for the most common operations (tasks, leads, time entries).

8. **Time tracking UX** — Currently users log time in a small input inside the task detail panel. A dedicated time tracking view with today-focus, weekly overview, and quick-add would be more efficient.

9. **@mentions in comments** — task/bug comments should support @mentions that trigger notifications.

10. **Saved filters / views** — Users should be able to save filter combinations as named views: "My overdue tasks", "Couch Heroes at-risk", "Critical this week". One click to return to a previously-set state.

11. **Templates** — New project from template, new task from template. Currently there's partial support in the Data section, but it's hidden. Surface it in the "+ New" menu.

12. **Keyboard shortcuts improvements** — There are vim-style nav shortcuts already (g+d, g+t, etc) but new users don't know about them. Add a `?` help overlay listing all shortcuts. And: Cmd+K command palette would be a power-user win.

---

## Product Metrics to Track

Once telemetry is in place, I'd track these weekly:

**Engagement:**
- Daily active users (DAU)
- Sessions per user per day
- Avg session length
- Most-used views (ranked)
- Feature adoption rate (% users who've used each feature)

**Quality:**
- Bugs reported per week
- Bug tracker mean time to resolution
- % of tasks completed on time vs late
- % of tasks with all mandatory fields filled before Done

**Business:**
- Revenue tracked vs target (already visible in Finances)
- Active vs won leads ratio
- Hours spent vs estimated (velocity proxy)
- Time to first task click for new users (onboarding quality)

---

## The Big Bet

The thing that will make or break NBI WorkSage as a differentiator is whether it becomes a **platform for AI-augmented consultancy operations**, not just a PM tool. Glen has an AI agent team (33 roles) that could in theory take action on this data: auto-triage bug reports, auto-suggest task prerequisites, auto-generate weekly status reports per client, auto-research new clients, auto-score leads, auto-flag blockers.

The research stub on the client page is a hint at this direction. The backlog items for "PM Report System" (daily AI-generated email digests) and "Warnings & Alerts" (now built) also point this way.

**Recommendation**: Make the "AI agent integration layer" an explicit Phase. Right now the AI team exists as a separate thing (the NBIAI Team App on port 3001). Bringing them into WorkSage as autonomous actors that can read task data, post comments, run research, and propose actions (gated by admin approval) would transform the product. That's a 2-3 sprint project but it's the strategic direction.

---

## Risks to Watch

1. **Monolithic HTML file is approaching its limit** — at 15,828 lines, any further feature additions will push toward 20k+. At that point a split is mandatory. Plan for an incremental extraction (not a rewrite): pull out specific views (hiring, calendar, teams) into separate files loaded on demand.

2. **No automated test coverage beyond the SoW extractor** — the rest of the codebase has no tests. Not critical for a 10-person internal tool but will bite when refactoring. Add Playwright smoke tests for the top 10 flows.

3. **Single-instance PostgreSQL** — no replication, no failover. If the server goes down, the whole team is blocked. Cloudflare Tunnel gives remote access but the DB is still a single point of failure. Consider a managed Postgres (Supabase, Neon) for the main instance with the current one as a fallback.

4. **All data lives in one place** — tasks, expenses, leads, SoWs, bugs, hiring, calendar. If the DB is corrupted, everything is lost. Backup endpoint helps but ensure it runs on a schedule (cron) and stores off-site.

5. **Knowledge concentration** — Glen + Claude built most of this. No other team member has deep knowledge of the codebase. Write a 1-page architecture overview in the README so Tom, Magnus, Bryan can triage issues when Glen's unavailable.

---

## Summary

NBI WorkSage is in a strong position. It went from a task dashboard to a full operations platform in ~10 weeks. The remaining work is less about feature completeness and more about **information architecture, onboarding, backend integrations, and the AI agent layer that would make this uniquely NBI**.

My top three recommendations (in priority order):
1. **Fix IA + onboarding** to support the feature surface that now exists
2. **Light up the blocked backends** (SMTP, research, QuickBooks)
3. **Make the AI agent team an active participant** in WorkSage, not a separate app

The codebase is clean, secure, and maintainable. The product is valuable. The next moves are about amplification, not compensation.
