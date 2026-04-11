# Session Handoff — 2026-04-04c — Client Leads Tracker Planning

## How to Start the Next Session

Read these files in order:
1. This handoff (you're reading it)
2. `projects/nbi_dashboard/live_state/pending_tasks.md` — what needs doing
3. `projects/nbi_dashboard/live_state/decisions.md` — Glen's decisions
4. `projects/nbi_dashboard/live_state/conversation_context.md` — how we got here

Then IMMEDIATELY create today's session log file at `projects/nbi_dashboard/session_logs/YYYY-MM-DD_session.md` and start logging.

---

## Current State of the Dashboard

### What's Built (complete)
All 26 features from Glen's approved roadmap are done. See `handoff_2026-04-04b_feature_blitz.md` for full details. Summary:
- Gantt/Timeline with drag-to-move, day-snap, draggable column divider
- Calendar view, Board view (kanban), Tree view (by project)
- Start/end dates on all tasks, client prefix badges, client editable on all tasks
- Finance data in PostgreSQL, P&L with FX conversion
- Task comments, file attachments, dependencies, recurring templates
- In-app notifications, time tracking with timer, contract upload/extract
- Role-based dashboard views (MD/PM/IC), auto-generated client reports
- Capacity planning, mobile responsiveness, keyboard shortcuts
- Backup/restore, user management, audit log/changelog
- Sorting, bulk operations, undo (Ctrl+Z), expanded search, conflict detection

### Quality-of-life round (also complete)
- Sort dropdown (8 options) in filter bar
- Bulk select + bulk status/priority/assignee/delete
- User management (create/delete/role change) in Settings
- Undo stack (10 deep) with Ctrl+Z and toast "Undo" buttons
- Search across titles, descriptions, notes, assignees, client names
- Filter persistence in localStorage
- Loading spinner during saves, sync feedback, conflict detection with amber badges

### Server
Port 8888, started from:
```
cd D:/OneDrive/Claude_code/NBIAI_TEAM/dashboard-server && node server.js
```
Access at: `http://localhost:8888/nbi_project_dashboard.html`

PostgreSQL: `postgresql://nbiai:NbiAi2026!SecureDb@localhost:5432/nbi_dashboard`

### Files
- **Frontend:** `D:\OneDrive\Claude_code\NBIAI_TEAM\nbi_project_dashboard.html` (~5500 lines, single-file vanilla JS)
- **Backend:** `D:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server\server.js` (Express.js, pg, bcrypt, multer, pdf-parse)

### Database Tables (current)
- users, sessions, tasks, clients, task_notes, client_notes, settings, audit_log
- finance_data (JSONB), task_comments, task_attachments, task_templates
- notifications, time_entries
- tasks has: start_date, end_date, dependencies columns

---

## What Needs Doing Next

### 1. Client Leads Tracker Page — PLAN FIRST, NO CODE YET

Glen uploaded `C:\Users\gpbea\Downloads\clean client list.xlsx` and wants a client leads tracker built into the dashboard. He explicitly said to plan before coding.

**Access control:** Tom (admin), Glen (admin), Magnus (producer)

#### Excel Template Analysis (completed)

The Excel has 41 data rows and 32 columns:

**Core columns:**
| Column | Type | Fill Rate | Examples |
|---|---|---|---|
| Prio | int (1-5) | 34% | 1, 2, 4, 5 |
| Client | text | 100% | Lighthouse Games, CDPR Studios, Epic Games |
| Work Type | text | 98% | Playtesting, Data Library Blueprint |
| Primary Contact | text | 46% | Alex Bertie, Jakub Rybinsky |
| ROM | currency | 34% | £75k - £3.25M, some "TBD" |
| Status | text | 98% | Signed, SoW client review, Will Sign, NDA, Exploring, Holding, We Declined |
| Liklihood | text | 98% | Signed, High, Favorable, Medium, TBD, No |
| Est start | text | 17% | May, June, July |
| Location | text | 88% | Leamington Spa, Warsaw, Cary NC |
| Notes | text | 2% | Free text |
| Time Est | text | 2% | "4 weeks per" |

**20 Resource/staffing columns (very sparse, 0-15%):**
UXR Lead, Researcher, Data Analyst, Snr Data Analyst, Analytics Manager, Data Scientist, Data Engineer, Snr Data Engineer, Data Architect, Financial Analyst, Process Analyst, Economist, Producer, AI Implementor, Telemetry Eng, GTM Specialist, Application Engineer, Designer, Process Engineering, SME

**Client segmentation:**
- Active pipeline (Prio 1-2): 6 deals, ~£1.14M ROM
- Exploratory/NDA (Prio 4): 5 deals, ~£5.95M ROM
- Early/Hold/Unprioritised: 30 entries
- Declined: 1 deal

**Data quality issues:** Typos in headers (Liklihood, Pricess Engineering), mixed types in ROM, no contact email/phone, no proper dates, no deal owner, no activity history.

#### CRM Best Practices Research (completed)

**Recommended pipeline stages:**
| Stage | Maps to Current Status | Default Win % |
|---|---|---|
| Lead | (new) | 5% |
| First Contact | NDA, Exploring | 10% |
| Discovery | Too early not funded | 25% |
| Proposal | SoW client review | 50% |
| Negotiation | Will Sign | 75% |
| Won | Signed | 100% |
| Holding | Holding | 10% |
| Lost | We Declined | 0% |

**Key fields to add beyond Excel:**
- Contact details (email, phone, LinkedIn)
- Deal owner / NBI lead
- Last contacted date, next follow-up date, next action
- Win probability % (numeric, auto-suggested by stage)
- Weighted pipeline value (ROM x probability)
- Lead source (Referral, Conference, Inbound, Existing Client)
- Activity log / interaction history
- Expected close date (proper date)
- Service line (Data & Analytics, UXR, AI, Production Consulting)

**UI patterns to implement:**
1. Kanban board — deals as cards, draggable across pipeline stages
2. Table view — sortable, filterable spreadsheet view
3. Pipeline summary — funnel with deal counts and values per stage
4. Client detail view — all deals, contacts, activity per client

### 2. QuickBooks Time API — ON HOLD

Pending API token from Bryan Rasmussen. Time tracking infrastructure already built. Email drafted with exact instructions for Bryan.

---

## Session Continuity System (NEW)

A new append-only logging system is in place. See `CLAUDE.md` for the rules. Key directories:
- `projects/nbi_dashboard/session_logs/` — per-session append-only logs
- `projects/nbi_dashboard/live_state/` — structured state files (decisions, work_completed, pending_tasks, conversation_context)

**Rule:** After EVERY substantive exchange, append to the session log and update live_state files. This is mechanical, not a judgement call. No more relying on timed handoffs.
