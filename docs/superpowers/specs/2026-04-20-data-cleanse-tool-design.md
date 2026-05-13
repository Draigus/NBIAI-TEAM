# Data Cleanse Tool — Design Spec

## Purpose

Replace the stub "Clear All Tasks" button in Settings with a proper admin-only data cleanse tool. The tool allows granular selection of data categories to permanently delete, shows full dependency/cascade impact before confirmation, and executes deletions in a single transaction with full rollback on failure.

## Architecture: Server-Driven Dependency Graph

The server owns all knowledge about data relationships. The frontend renders what the server tells it — no hardcoded dependency maps in the UI.

- `GET /api/admin/cleanse/preview` returns the live manifest (categories, row counts, cascades, nullifications)
- `POST /api/admin/cleanse` receives ticked category IDs, validates a typed confirmation string, executes deletions in FK-safe order within one transaction

## Data Categories

| ID | Label | Tables deleted | Cascades into | Nullifies |
|---|---|---|---|---|
| `tasks` | Projects & Tasks | tasks | task_notes, task_comments, task_attachments, time_entries | — |
| `leads` | Leads & Pipeline | leads | lead_resources, lead_activities | — |
| `contacts` | Contacts | contacts | — | leads.primary_contact_id |
| `client_notes` | Client Notes | client_notes | — | — |
| `sows` | SoWs | sows | — | tasks.sow_id, hiring_positions.sow_id, teams.sow_id |
| `expenses` | Expenses | expenses, expense_reports, expense_receipts | — | — |
| `bugs` | Bug Reports | bug_reports | bug_report_comments | — |
| `hiring` | Hiring | hiring_positions, candidates | — | — |
| `calendar` | Calendar Events | calendar_events | — | — |
| `finance` | Finance Data | finance_data | — | — |
| `notifications` | Notifications | notifications | — | — |
| `audit_log` | Audit Log | audit_log | — | — |
| `clients` | Clients (nuclear) | clients | contacts, client_notes, leads, lead_resources, lead_activities, sows, client_activity_log | tasks.client_id, users.client_id, hiring_positions.client_id, candidates.client_id, calendar_events.client_id, bug_reports.reporter_client_id |

## Dependency Rules

- Ticking **Clients** auto-selects and locks: Contacts, Leads, Client Notes, SoWs (these cascade from clients)
- Unticking Clients re-enables those as independent categories
- All other categories are fully independent (no cross-dependencies)

## Config/Seed Data — Never Touched

These are invisible in the cleanse UI and always preserved:

- `lead_pipeline_stages` (8 stages)
- `lead_resource_types` (19 staffing roles)
- `lead_field_options` (all picklists)
- `expense_categories` (9 categories)
- `settings` (hourlyRate, expense_approver, fx_rates)
- `users`, `sessions`, `password_reset_tokens`
- `teams`, `team_members`
- `schema_migrations`
- `dashboard_snapshots`
- `task_templates`

## API Contract

### GET /api/admin/cleanse/preview

Auth: `requireAdmin`

Response (v2 envelope wraps automatically):

```json
{
  "categories": [
    {
      "id": "tasks",
      "label": "Projects & Tasks",
      "tier": "standard",
      "count": 312,
      "cascades": [],
      "nullifies": [],
      "children": {
        "task_notes": 45,
        "task_comments": 89,
        "task_attachments": 7,
        "time_entries": 134
      }
    },
    {
      "id": "clients",
      "label": "Clients",
      "tier": "nuclear",
      "count": 6,
      "cascades": ["contacts", "leads", "client_notes", "sows"],
      "nullifies": ["tasks.client_id", "users.client_id", "hiring_positions.client_id", "candidates.client_id", "calendar_events.client_id", "bug_reports.reporter_client_id"],
      "children": {
        "contacts": 24,
        "leads": 43,
        "lead_resources": 18,
        "lead_activities": 67,
        "client_notes": 12,
        "sows": 5,
        "client_activity_log": 89
      }
    }
  ]
}
```

### POST /api/admin/cleanse

Auth: `requireAdmin`

Request:

```json
{
  "categories": ["clients", "tasks", "expenses"],
  "confirmation": "DELETE ALL SELECTED DATA"
}
```

The `confirmation` field must be the exact string `DELETE ALL SELECTED DATA`. Reject with 400 if missing or wrong.

Response on success:

```json
{
  "deleted": {
    "clients": 6,
    "contacts": 24,
    "leads": 43,
    "lead_resources": 18,
    "lead_activities": 67,
    "client_notes": 12,
    "sows": 5,
    "client_activity_log": 89,
    "tasks": 312,
    "task_notes": 45,
    "task_comments": 89,
    "task_attachments": 7,
    "time_entries": 134,
    "expenses": 28,
    "expense_receipts": 14,
    "expense_reports": 3,
    "attachments": 11
  },
  "nullified": {
    "tasks.client_id": 312,
    "users.client_id": 2
  },
  "localStorageKeys": ["nbi_dashboard_tasks", "nbi_finance_data", "nbi_dashboard_settings", "nbi_dashboard_briefs"]
}
```

Response on failure: full rollback, 500 with error message explaining what failed.

## Transaction Deletion Order

Within a single `BEGIN` / `COMMIT` transaction, deletions execute in FK-safe order:

```
 1. DELETE FROM client_activity_log  (RESTRICT FK on clients — must go first)
 2. UPDATE bug_reports SET reporter_client_id = NULL  (RESTRICT FK on clients)
 3. DELETE FROM attachments WHERE entity_type IN (selected types)  (soft-ref orphan cleanup)
 4. UPDATE leads SET primary_contact_id = NULL  (if contacts selected without leads)
 5. DELETE FROM lead_resources  (if leads selected — belt & braces before leads)
 6. DELETE FROM lead_activities  (if leads selected)
 7. DELETE FROM leads  (CASCADE handles resources/activities anyway)
 8. DELETE FROM contacts
 9. DELETE FROM client_notes
10. UPDATE tasks SET sow_id = NULL  (if sows selected)
11. UPDATE hiring_positions SET sow_id = NULL  (if sows selected)
12. UPDATE teams SET sow_id = NULL  (if sows selected)
13. DELETE FROM sows
14. DELETE FROM tasks  (CASCADE: task_notes, task_comments, task_attachments, time_entries)
15. DELETE FROM clients  (CASCADE: any remaining contacts, client_notes)
16. DELETE FROM expense_receipts  (belt & braces)
17. DELETE FROM expenses
18. DELETE FROM expense_reports
19. DELETE FROM bug_report_comments  (belt & braces)
20. DELETE FROM bug_reports
21. DELETE FROM candidates
22. DELETE FROM hiring_positions
23. DELETE FROM calendar_events
24. DELETE FROM finance_data
25. DELETE FROM notifications
26. DELETE FROM audit_log
```

Steps only execute for the categories the user selected. The server skips irrelevant steps.

After COMMIT:
- Invalidate all server-side config caches
- Delete orphaned files from `dashboard-server/uploads/` — query the deleted attachment/receipt filenames before the transaction, then unlink from disk after commit succeeds. Do NOT unlink inside the transaction (if rollback happens, files would already be gone).
- Log the cleanse action (to audit_log if audit_log was NOT selected for deletion, otherwise to PM2 stdout)

## Frontend UI

### Entry Point

Settings tab → Danger Zone section (admin only). The current "Clear All Tasks" button is replaced with a "Data Cleanse Tool" button.

### Modal Behaviour

Opens a full-screen modal (consistent with import modal pattern). On open, calls `GET /api/admin/cleanse/preview` and renders the category list with live counts.

Layout:
- Header: warning icon + "Data Cleanse Tool"
- Description: "Select data categories to permanently delete. Config data (pipeline stages, expense categories, users, teams) is always preserved."
- Category list: checkboxes with record counts, indented cascade children, warning labels for nullification side-effects
- Nuclear section: separated by a visual divider, "Clients" with red styling
- Footer: Select All / Deselect All buttons, confirmation text input, Cancel + Permanently Delete buttons

### Interaction Rules

- Ticking Clients auto-ticks and disables: Contacts, Leads, Client Notes, SoWs (label: "included in client deletion")
- Unticking Clients re-enables those categories
- "Permanently Delete" button disabled until confirmation input matches exactly "DELETE ALL SELECTED DATA"
- While deleting: progress overlay ("Deleting... do not close this tab"), all controls disabled
- On success: modal closes, summary toast, frontend clears listed localStorage keys, app calls `renderAll()` to show empty states
- On failure (rollback): modal stays open, error toast, nothing was deleted

### Select All / Deselect All

- "Select All" ticks every category including Clients (nuclear). The confirmation field remains the gate.
- "Deselect All" unticks everything.

## Error Messaging Improvement (App-Wide)

After a partial cleanse (e.g., contacts deleted but leads retained), views that reference deleted data via nullified FK columns must show specific labels:

| Field | Current behaviour | Required behaviour |
|---|---|---|
| Task with `client_id = null` | Blank or omitted | Shows "(no client)" |
| Lead with `primary_contact_id = null` | Blank | Shows "(contact removed)" |
| Task with `sow_id = null` | Blank or omitted | Shows "(no SoW)" |
| Hiring position with `client_id = null` | Blank | Shows "(no client)" |

Most views already handle nulls gracefully (nullable fields render as empty). An audit pass during implementation confirms which views need explicit labels vs which already work.

## What This Replaces

- `clearAllTasks()` function (line 18899) — removed entirely
- "Clear All Tasks" button HTML (line 16644) — replaced with "Data Cleanse Tool" button
- `finResetData()` function (line 10880) — finance reset is now handled by the cleanse tool's "Finance Data" category; the standalone button in Finances view is removed

## Security

- Admin-only (`requireAdmin` middleware on both endpoints)
- Typed confirmation string required (programmatic safeguard)
- Full transaction (nothing partial on failure)
- Audit logged (if audit_log not being deleted)
- Not exposed to client-portal users (NBI-internal only, `requireNBI` middleware added)
