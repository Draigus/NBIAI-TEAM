# VP Product Review: Feature Spec Revision -- No-API Architecture

**Reviewer:** VP Product
**Date:** 28 Mar 2026
**Re:** feature_spec.md v1.0 -- impact of zero Anthropic API mandate
**Status:** Requires engineering spec update before build continues

---

## Framing

Glen has mandated that the app makes zero direct calls to the Anthropic API. Claude Desktop sessions (running on his Max plan) are the execution engine. The app's role changes: it is no longer an orchestrator that triggers API calls and streams responses. It becomes a task management and results display system, with Claude Desktop acting as the processing layer in between.

This is a meaningful architectural shift but it does not hollow out the app's value. The app remains the single place where Glen and the team create work, review what was done, and manage the AI company. The execution mechanism just changes from synchronous API call to asynchronous session processing.

The feature spec needs targeted changes in four sections. Most of the spec survives intact.

---

## 1. What Gets Removed

### Section 7.2 -- Agent Heartbeat System (Remove Entirely)

The heartbeat system assumes a server-side process that polls for assigned tasks and fires API calls on a timer. Remove entirely:
- The AgentHeartbeat data object and its database table
- The heartbeat trigger value from the AgentExecution.trigger enum
- The server-side heartbeat scheduler
- The "Last Heartbeat" timestamp on the Role Detail page (Section 4.3)
- The pulsing heartbeat indicator on org chart nodes
- The WebSocket event agent_heartbeat

### Section 7.6 -- Manual Execution Trigger (Remove API-Backed Behaviour)

The "Run Now" button concept survives in adapted form (see What Gets Added), but the current spec's description -- checking out a task and directly calling the Anthropic API -- is removed.

### Section 7.4 -- Cost Tracking (Remove Token-Level Tracking)

Token-by-token cost tracking assumes the app receives raw API responses with token counts. Claude Desktop sessions do not return token metadata. Remove:
- input_tokens, output_tokens, cost_usd from AgentExecution
- model_pricing table and all associated logic
- "Total tokens used (period)" and "Total cost (period)" from the Performance tab
- "Budget Used" column in org chart List View (Section 3.4)
- Budget cap alert at 80% and hard stop at 100% (Section 7.5)

Replaced by: Manual cost log (see What Gets Added).

### Section 7.5 -- Budget Caps (Remove Automated Enforcement)

Without token tracking, automated budget enforcement is not possible. Remove monthly_budget_cap_usd and current_month_spend_usd from Agent model and remove the automated pause-on-cap-reached behaviour.

### Section 11 -- WebSocket Real-Time (Reduce Scope)

Remove WebSocket events that assumed live API execution feedback:
- agent_execution_started
- agent_execution_completed
- agent_heartbeat

Retain: approval_created, approval_decided, task_updated, notification.

### Setup Screen -- Anthropic API Key Field (Remove)

Section 1.3 setup wizard and Settings > Integrations API key management section: both removed. Remove anthropic_api_key_encrypted from Company data object.

---

## 2. What Gets Added

### New Status: queued

Add queued to the Task status enum, sitting between assigned and in_progress:

```
backlog -> assigned -> queued -> in_progress -> review -> done
                             -> blocked
                             -> cancelled
```

queued means: this task has been prepared and is waiting for a Claude Desktop session to pick it up.

New fields on Task:
- queued_at (timestamp, nullable)
- session_id (UUID, nullable, FK to ClaudeDesktopSession)
- session_prompt (text, nullable, max 50000 chars): the assembled prompt ready to paste into Claude Desktop

### New Table: ClaudeDesktopSession

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| label | string | Human-readable label, e.g. "CEO -- Sprint planning 28 Mar" |
| agent_id | UUID, nullable | FK to Agent |
| status | enum | pending / in_progress / completed / failed |
| trigger | enum | manual / scheduled |
| scheduled_for | timestamp, nullable | When it was intended to run |
| started_at | timestamp, nullable | When session opened |
| completed_at | timestamp, nullable | When results posted back |
| notes | text, nullable | Glen's session notes |
| created_by_user_id | UUID | FK to User |
| created_at | timestamp | Auto-set |
| updated_at | timestamp | Auto-set |

### New Screen: Queue (/queue)

Glen's primary operational screen. Split view: left = queue list, right = assembled prompt for selected task.

Left panel per item:
- Task title, assigned agent, model tier badge, project name, priority badge, queued timestamp
- Copy Prompt button (copies session_prompt to clipboard)
- Mark In Progress button
- Mark Complete button (visible once in progress)

Right panel: read-only prompt preview with prominent "Copy to Clipboard" at top.

Batch operations: select multiple tasks, copy all prompts concatenated.

Nav item: "Queue" between Tasks and Approvals. Icon: ListOrdered. Badge: count of queued tasks.

### New Screen: Session Log (/sessions)

Audit trail for all Claude Desktop sessions.

Table columns: Label, Agent, Status, Trigger, Tasks (count), Scheduled For, Completed, Created By.

Session Detail page (/sessions/:sessionId): header, linked tasks, results, Glen's notes.

### New: Post Session Results Flow

From Task Detail page: "Post Session Results" button visible when task status is in_progress or queued. Opens full-screen textarea: "Paste Claude Desktop output here." On submit: saves to AgentExecution.full_output, advances task to review or done, marks session completed, toast confirms.

### New: Queue Summary Widget (replaces Agent Status Widget on Command Centre)

Shows:
- Tasks currently queued by agent
- Tasks in progress (session started, results not posted)
- Tasks completed today

### New: Manual Cost Log Table (CostLog)

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| session_id | UUID | FK to ClaudeDesktopSession |
| agent_id | UUID | FK to Agent |
| period_month | date | First of month |
| cost_usd | decimal(10,2) | Manually entered |
| notes | string | Optional |
| created_by_user_id | UUID | FK to User |
| created_at | timestamp | Auto-set |

Glen logs cost against sessions from Session Detail page. Finance tab displays manually logged costs.

---

## 3. What Stays the Same

No architectural changes required in: Authentication, Command Centre (layout), Org Chart, Project Management, Task System (minor additions only), Finance Tab (revenue/payroll sections), Leads and Clients, Settings (minus API key section), Global Search.

---

## 4. User Experience Change

### New Flow

1. Glen creates task and assigns to agent
2. App assembles session_prompt automatically
3. Task moves to queued
4. Glen opens Queue screen, sees waiting tasks
5. Glen copies prompt, opens Claude Desktop, runs session
6. Glen returns to app, uses Post Session Results to paste output back
7. Task advances to review or done

### Approval Flow Change

Old: "Approve" triggered immediate automated execution.
New: "Approve" marks output as cleared for use. Glen then manually executes the approved action (sends email, publishes document, etc.).

On "Request Changes": task returns to queued with Glen's feedback as a comment. Included in next session prompt context.

---

## 5. Revised Build Priority Order

### Phase 1 -- Essential Loop (build first)
1. Authentication + Setup (remove API key field)
2. Task creation and management (add queued status, session_prompt field)
3. Queue screen (/queue) -- the new operational centrepiece
4. Task Detail with Post Session Results flow

### Phase 2 -- Visibility
5. Command Centre (revised with Queue Summary widget)
6. Session Log (/sessions)
7. Org Chart
8. Project Management

### Phase 3 -- Decision Layer
9. Approvals (revised async flow)
10. Role Detail Page (session results instead of execution logs)

### Phase 4 -- Business Intelligence
11. Finance tab
12. Leads and Clients
13. Settings

---

## Data Model Change Summary

| Change | Detail |
|---|---|
| Remove | AgentHeartbeat table |
| Remove | anthropic_api_key_encrypted from Company |
| Remove | model_pricing table |
| Remove | input_tokens, output_tokens, cost_usd from AgentExecution |
| Remove | monthly_budget_cap_usd, current_month_spend_usd from Agent |
| Add | ClaudeDesktopSession table |
| Add | CostLog table |
| Add | queued to Task.status enum |
| Add | queued_at, session_id, session_prompt to Task |
| Update | AgentExecution.trigger: remove heartbeat, keep scheduled / manual / task_assigned |

---

*VP Product. 28 March 2026.*
