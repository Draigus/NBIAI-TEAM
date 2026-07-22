# WorkSage Hiring Plan and Approval Design

**Date:** 21 July 2026

**Status:** Approved visual and behavioural direction; written-spec review required before implementation planning

**Owner:** Glen Pryer

**Product area:** WorkSage Hiring

## 1. Purpose

Add a client-scoped Hiring Plan to WorkSage that gives Department Directors, the COO, Finance and Recruiting one authoritative record for every planned and active role. The same record must move from requirement through approval into recruiting and hiring without being copied into a second system.

The feature must answer four operational questions:

1. What roles does this client intend to hire, who owns them and when are they needed?
2. Which roles are pending, approved or denied, and why?
3. What is the monthly GBP cost of approved and pending headcount?
4. What candidate pipeline is attached to each approved role?

## 2. Product Boundaries

### Included

- A Hiring Plan destination inside the existing Hiring section.
- A role plan table, role-card view and monthly cost matrix as views of the same role records.
- Client-specific department configuration and named workflow owners.
- Headcount submission, approval, denial and material-change reapproval.
- Compensation, currency, FX and fully loaded cost planning.
- Candidate pipeline summaries and filtered navigation to the existing Candidates page.
- Finance-ready Excel exports.
- Existing WorkSage theme support.

### Not replaced

- **Candidates remains a separate person-level destination.** Existing candidate cards, filters and candidate detail sidebar are unchanged.
- Candidate interview, offer, rejection and stage-management workflows remain in Candidates.
- A role can have zero or more existing candidates. No candidate data is copied into the plan.

### Navigation decision

Hiring Plan replaces the current Positions/Roles navigation entry as the authoritative role-level destination. The useful position-card presentation remains available as a **Roles** view within Hiring Plan. The top-level Candidates entry remains separate.

## 3. Core Architecture

Extend the existing `hiring_positions` entity with structured planning fields. Do not introduce a separate headcount-request entity.

This keeps one identifier, one sidebar and one candidate relationship across the full lifecycle:

```text
Department requirement
        |
        v
Pending hiring_position -> Approved hiring_position -> Recruiting -> Hired
        |                         |
        +---- Denied              +---- Existing candidates linked by position_id
```

Supporting tables provide client configuration, departments and immutable approval history. Cost cells and totals are derived from structured role fields and stored assumptions; users cannot type directly into monthly cost cells.

## 4. Client Scope

- Every department, role, workflow setting, cost assumption and export is scoped by `client_id`.
- NBI is represented by an ordinary client record. There is no NBI-specific hiring schema.
- All reads and writes enforce scope on the server using the authenticated user's client access.
- NBI administrators can work across clients. Glen's account uses this authority and can perform every Hiring Plan action.
- The selected client must be explicit in the UI and export metadata.

## 5. People and Permissions

Capabilities are assigned by client configuration and existing WorkSage access, not by matching display names in code.

| Capability | Department Director | COO | Finance Director | Recruiting | Client user | NBI admin |
|---|---:|---:|---:|---:|---:|---:|
| View all roles in client | Yes | Yes | Yes | Yes | Yes | Yes |
| View advertised salary range | No | Yes | Yes | Yes | Existing ATS rule | Yes |
| View exact budget, FX, on-cost and totals | No | Yes | Yes | No | No | Yes |
| Create a requirement for own department | Yes | Yes | Yes | Yes | No | Yes |
| Edit requirements for own department | Yes | Yes | Yes | Yes | Existing role edit rule | Yes |
| Edit financial assumptions | No | Yes | Yes | No | No | Yes |
| Submit for approval | Own department | Yes | Yes | Yes | No | Yes |
| Approve or deny | No | Yes | No | No | No | Yes |
| Maintain candidate pipeline | No | No | No | Yes | Existing ATS rule | Yes |
| Configure departments and workflow owners | No | Client admin | Client admin | No | No | Yes |
| Export visible plan data | Yes | Yes | Yes | Yes | No | Yes |

Rules:

- Department Directors may see all roles across their client, but server responses and exports remove advertised salary, exact budget, FX, on-cost and all cost totals.
- Recruiting may see advertised salary ranges but not exact budgeted compensation, FX, loaded cost or financial totals.
- The COO, Finance Director and NBI administrators see all financial data for clients they can access.
- Couch Heroes initial configuration sets Aris as COO and Lili Zhao as Finance Director. Lili has full Couch Heroes financial visibility.
- Existing ATS role-detail edit permissions remain in force for existing non-financial fields. New planning and financial fields use the stricter capability matrix above.
- Only existing close-authority users may close or shut down a role. Approval authority does not implicitly grant closure authority.
- Sensitive fields are omitted from API payloads for unauthorised users. Hiding a column in the browser is not sufficient.

## 6. Client Configuration

Each client maintains:

- A department list.
- One Department Director per active department.
- A COO approver.
- A Finance Director notification recipient.
- Zero or more Recruiting users.
- A default on-cost percentage for FTE, Contractor and PSC engagements.
- A permitted currency list, including GBP.

Departments support active/inactive state. A department cannot be deleted while roles reference it; it can be deactivated and remains visible on historical roles.

Configuration is managed from a client-scoped Hiring Settings panel. Only client administrators and NBI administrators can change it. Changes are audited.

## 7. Role Data

### Operational fields required to create a Pending requirement

- Role title.
- Priority, using the existing P0 to P4 convention.
- Department.
- Role description.
- Hiring manager.
- Target start month.
- Requirement type: New or Backfill.
- Engagement type: FTE, Contractor or PSC.

### Financial fields required before approval

- Advertised compensation minimum and maximum.
- Exact budgeted compensation.
- Paid currency.
- Compensation basis.
- FX rate to GBP, effective date and source note when the paid currency is not GBP. GBP uses a fixed rate of 1.

Approval status is system-managed. A Department Director can therefore submit the operational requirement without seeing or entering restricted financial values. The COO, Finance Director or an NBI administrator completes the financial fields before approval.

### Compensation rules

- FTE compensation basis is annual.
- Contractor and PSC compensation basis can be annual, monthly or daily.
- Daily rates require expected workdays per month.
- Paid currency is an ISO 4217 currency code and must be enabled for the client.
- Advertised minimum cannot exceed advertised maximum.
- Exact budgeted compensation must be greater than zero.
- The advertised range and exact budget are independent values because one is candidate-facing and the other is the approved planning assumption.

### Derived fields

- Days open.
- Recruiting status.
- Candidate count and stage summary.
- Monthly base cost in paid currency.
- Monthly base cost in GBP.
- Monthly fully loaded cost in GBP.
- Approval and change history.

### Existing role fields retained

The existing job description, seniority, discipline, location, interview panel, interview questions, attachments, close reason, filled candidate and ATS timestamps remain part of the same role record and existing detail sidebar.

Structured planning fields replace the current practice of encoding salary, currency, target start, priority and recruiting status in the role description. Migration must preserve the original description text and report any values that cannot be parsed confidently.

## 8. Status and Workflow

### Approval status

The user-facing states are:

- **Pending:** awaiting COO approval. Pending roles are visible in the plan and monthly matrix.
- **Approved:** authorised headcount and available to Recruiting.
- **Denied:** not authorised. Denied roles remain in the plan and history but do not contribute cost.

There is no separate Draft state in the first release. Creating a role with all required operational fields places it in Pending; financial fields may then be completed before approval.

### Submission

1. A Department Director or another permitted user completes the operational role fields.
2. WorkSage validates those fields and creates or updates the role as Pending.
3. The configured COO and Finance Director receive in-app notifications.
4. The COO, Finance Director or an NBI administrator completes any missing financial fields.
5. Recruiting can see the role but cannot begin the recruiting workflow until it is Approved.

### Approval

1. The COO or an NBI administrator reviews the role, compensation and monthly cost impact.
2. WorkSage blocks approval until every operational and financial approval field is valid.
3. Approving records an immutable approval event with actor, timestamp and the approved field snapshot.
4. The role becomes available to Recruiting immediately.
5. The requester, hiring manager, Finance Director and Recruiting users receive notifications.

### Denial

The approver selects one reason:

- Beyond financial boundaries.
- Not the current priority.
- Lacks information.
- Other.

`Other` requires an explanation. Standard reasons may include an optional comment. The requester and hiring manager are notified; Finance receives the decision notification.

### Material changes and reapproval

Changing any of the following on an Approved role returns it to Pending:

- Role title, seniority or discipline.
- Department.
- Engagement type.
- Advertised compensation range.
- Exact budgeted compensation, basis or paid currency.
- Target start month.
- On-cost override.

The previous approval remains immutable in history. The change event records old and new values, actor and timestamp, and the COO and Finance Director are notified. Notes, job-description wording, interview content and candidate activity do not reset approval.

### Recruiting and hired state

Recruiting status is derived from existing ATS state rather than duplicated:

- Approved with no active recruiting: Not started.
- Open with recruiting activity: Recruiting.
- Paused: Paused.
- Closed with `filled`: Hired.
- Closed with `shut_down`: Closed.

Days open starts when the approved role enters active recruiting. It stops at closure. Pending and denied roles display no days-open value.

## 9. Hiring Plan Interface

### Header and controls

- Client selector using existing WorkSage client context.
- View selector: **Plan**, **Roles**, **Monthly costs**.
- Filters for department, approval status, recruiting status, priority, engagement type, hiring manager and target start month.
- Search across role title and hiring manager.
- Add role command, subject to permission.
- Export command, subject to permission.

Monthly costs is available only to the COO, Finance Director and NBI administrators. Other users do not receive its data or export sheet.

### Plan view

A dense, work-focused table lists all headcount with stable columns for:

- Role.
- Priority.
- Department.
- Target start month.
- New/Backfill.
- Approval.
- Hiring manager.
- Days open.
- Recruiting status.
- Engagement type.
- Candidate pipeline.
- Compensation fields available to the current user.

Frequent structured fields are edited inline when authorised. Narrative fields, approval decisions, audit history and sensitive finance assumptions are edited in the role sidebar. Inline material changes use the same reapproval rules as sidebar edits.

Rows are keyboard reachable. Validation failures remain attached to the relevant field and do not discard other edits. A stale update returns a conflict state and offers reload or deliberate overwrite to authorised users.

### Roles view

Preserve the current role-card presentation as another view of the same filtered data. Cards show the role, department, priority, status, start month, permission-appropriate compensation and pipeline summary. This is not a second dataset.

### Existing role-detail sidebar

Clicking a role in the Plan table, Roles cards or Monthly costs matrix opens the existing role-detail sidebar. The sidebar retains all current role and candidate information and adds:

- Planning details.
- Compensation and cost assumptions, permission-controlled.
- Approval action or current decision.
- Immutable approval/change history.
- Candidate pipeline summary and a link to Candidates filtered to this role.

Clicking a candidate still opens the existing candidate detail experience.

## 10. Monthly Cost View

### Layout

- Dense matrix with one role per row and one calendar month per column.
- Role information columns remain sticky while month columns scroll horizontally.
- Default horizon is 24 months; users can select 12, 24 or 36 months and choose the first month.
- Each row shows role, department, approval state, engagement type, target start and paid currency before the month columns.
- Base and fully loaded cost are selectable display modes. Summary totals show both values.

### Default ordering

1. Target start month ascending, so the soonest hire is at the top.
2. Priority ascending, P0 before P1 and so on.
3. Role title alphabetically.
4. Roles without a target start month appear last and cannot be submitted for approval.

Department is a column and filter, not the default grouping.

### Cost calculations

For a role in its paid currency:

```text
annual basis:  monthly base = annual budget / 12
monthly basis: monthly base = monthly budget
daily basis:   monthly base = daily rate * expected workdays per month

monthly GBP base = monthly paid-currency base * stored FX rate to GBP
monthly GBP loaded = monthly GBP base * (1 + applied on-cost percentage / 100)
```

The applied on-cost percentage is the role override when present; otherwise it is the client default for the engagement type. The stored FX rate is a role-level planning snapshot with effective date and source note so past approvals do not change when current exchange rates move.

Cells before the target start month are zero. Approved and Pending roles continue from target start through the selected horizon. Denied and shut-down roles are zero. A filled role continues as planned headcount and uses the candidate's actual start month when available, otherwise the target start month.

A Pending role without complete financial assumptions displays `Cost setup needed`, not zero. Approved, Total Pending and Combined Total show the subtotal that can be calculated and an explicit incomplete indicator until every included role has complete assumptions. This prevents an incomplete plan from appearing cheaper than it is.

### Summary language

The summary uses hiring language:

- **Approved:** total for Approved roles.
- **Total Pending:** total for Pending roles.
- **Combined Total:** Approved plus Pending.

Denied roles contribute to none of these totals. Summary values respond to active filters and display both monthly totals and the selected-horizon total.

Every cost value exposes an assumptions tooltip or sidebar link showing budget, basis, currency, FX rate, on-cost and start month.

## 11. Candidate Pipeline

The plan obtains pipeline data from existing candidates linked by `position_id`.

- Table and card summaries show total active candidates and counts by existing ATS stage.
- A role with no candidates shows `No candidates`, not a zero-only graphic.
- Selecting the summary navigates to Candidates with the role filter applied.
- Users may not move candidate stages from the Hiring Plan table or matrix.
- Candidate visibility remains governed by existing client scope and ATS permissions.

## 12. Excel Export

The export is generated from the server using the same scoped, permission-filtered query and cost engine as the UI. Sensitive values must not exist in a workbook issued to an unauthorised user, including hidden cells or sheets.

### Full financial workbook

For COO, Finance and NBI administrators:

1. **Hiring Plan:** role details, approval, ownership, recruiting state, advertised range, exact budget, paid currency, compensation basis, FX and on-cost.
2. **Monthly Costs:** role rows by month, ordered by target start month, with Approved, Total Pending and Combined Total rows.
3. **Pipeline Summary:** candidate stage counts by role without private candidate notes.
4. **Assumptions:** client, generated timestamp, reporting currency, date horizon, FX snapshots, on-cost defaults and role overrides.

### Restricted workbooks

- Recruiting receives Hiring Plan and Pipeline Summary with advertised range but no exact budget, FX, on-cost or cost totals.
- Department Directors receive Hiring Plan and Pipeline Summary without any compensation or financial fields.
- Filters apply to exports and are stated in workbook metadata.

### Formatting

- Clear workbook and sheet titles.
- Frozen header rows and identifying columns.
- Autofilters on tabular sheets.
- Useful column widths and wrapped long text.
- Real Excel date, percentage and GBP number formats.
- Visually distinct Pending and Approved states using restrained colours.
- No merged cells inside data tables.
- A generated-at timestamp and client name on every sheet.

## 13. Data Model

### `hiring_positions` additions

- `department_id` UUID, nullable only during migration.
- `priority` small integer constrained to 0 through 4.
- `target_start_month` date constrained to the first day of a month.
- `requirement_type` enum-like text: `new` or `backfill`.
- `approval_status` enum-like text: `pending`, `approved` or `denied`.
- `approval_submitted_at` timestamp.
- `requested_by_user_id` UUID, set from the authenticated user who creates the requirement.
- `hiring_manager_user_id` UUID.
- `compensation_min` numeric.
- `compensation_max` numeric.
- `budgeted_compensation` numeric.
- `compensation_currency` char(3).
- `compensation_basis` enum-like text: `annual`, `monthly` or `daily`.
- `expected_workdays_per_month` numeric, nullable except for daily basis.
- `fx_rate_to_gbp` numeric greater than zero.
- `fx_rate_effective_date` date.
- `fx_rate_source_note` text.
- `on_cost_override_pct` numeric, nullable.
- `recruiting_started_at` timestamp.
- `planning_version` integer for optimistic concurrency.

Existing `salary_range` remains during migration for compatibility, then becomes a formatted projection of structured advertised range fields in API compatibility responses.

### `hiring_departments`

- `id`, `client_id`, `name`, `director_user_id`, `is_active`, timestamps.
- Department name unique per client, case-insensitive.

### `hiring_client_settings`

- `client_id` primary key.
- `coo_user_id`, `finance_director_user_id`.
- FTE, Contractor and PSC default on-cost percentages.
- Permitted currency list.
- timestamps and updater.

### `hiring_recruiters`

- `client_id`, `user_id`, timestamps.
- Unique pair of client and user.

### `hiring_approval_events`

Append-only records containing:

- Role and client identifiers.
- Event type: submitted, approved, denied, reopened_for_approval or legacy_imported.
- From/to approval status.
- Actor and timestamp.
- Structured denial reason and optional comment.
- Approved or changed field snapshot.

Updates and deletes are rejected at the application permission layer. Database privileges should also prevent ordinary application paths from mutating history.

## 14. API Boundaries

Keep existing candidate endpoints. Add focused Hiring Plan routes rather than expanding the already large Hiring domain handler.

- `GET /api/hiring-plan` returns scoped roles, derived pipeline summaries, permissions and cost-ready values.
- `POST /api/hiring-plan` creates a complete Pending role.
- `PATCH /api/hiring-plan/:id` updates permitted fields using `planning_version`.
- `POST /api/hiring-plan/:id/approve` approves the current version.
- `POST /api/hiring-plan/:id/deny` records a structured denial.
- `GET /api/hiring-plan/:id/history` returns permission-filtered history.
- `GET /api/hiring-plan/costs` returns the selected horizon and server-calculated totals.
- `GET /api/hiring-plan/export.xlsx` returns the permission-appropriate workbook.
- `GET/POST/PATCH /api/hiring-settings/departments` manages client departments.
- `GET/PATCH /api/hiring-settings` manages owners and cost defaults.

Responses include an explicit capability object so the frontend renders actions consistently. The server remains authoritative.

Validation errors return field-level details. Stale `planning_version` values return `409 Conflict` with the current version. Approval is transactionally rejected when required configuration or role fields are missing.

## 15. Notifications and Audit

Use the existing WorkSage notification infrastructure.

- Pending submission or material reapproval notifies the configured COO and Finance Director.
- Approval notifies requester, hiring manager, Finance Director and Recruiting users.
- Denial notifies requester, hiring manager and Finance Director.
- Configuration errors prevent submission and explain which client setting is missing.
- Notification failure does not roll back a committed approval; it is logged and retried through the existing notification mechanism.

All configuration changes, role planning changes, approvals, denials and exports write audit events with actor, client and timestamp. Audit records must not include private candidate notes.

## 16. Error Handling and Data Integrity

- All multi-table approval and denial operations use database transactions.
- Role and related configuration must belong to the same client.
- Department, hiring manager and workflow owners must be active users/entities accessible to that client.
- Server-side cost functions use decimal-safe numeric handling and round displayed GBP values to two decimal places only at output boundaries.
- Export and UI use the same cost calculation module.
- A failed export leaves no partial file on the server.
- Empty states distinguish no roles, no filter matches and insufficient permissions.
- API errors preserve unsaved browser input and offer retry where safe.

## 17. Themes, Accessibility and Responsive Behaviour

- Use existing WorkSage design tokens and all eight themes: Dark, Light, Midnight, Nord, Solarized, Dracula, Emerald and Command.
- Do not introduce fixed colours that make status, text or focus indicators illegible in any theme.
- Approval state is communicated by text and icon as well as colour.
- Table headers, inputs, menus and sidebar controls are keyboard operable and visibly focused.
- Financial cells have accessible labels that include role, month, state and amount.
- On narrow screens, identifying role columns remain readable and the matrix scrolls horizontally. Controls wrap without overlapping.
- The interface retains WorkSage's dense operational character; it is not a marketing-style dashboard.

## 18. Migration and Rollout

1. Add new tables and nullable role columns in the next numbered migration available at implementation time.
2. Backfill structured values from existing position fields and the recognised planning lines currently stored in descriptions.
3. Mark pre-existing ATS positions Approved with a `legacy_imported` event so the migration does not interrupt active recruiting.
4. Write an auditable migration report for unparsed or conflicting records; do not guess uncertain financial values. A migrated role with missing cost assumptions displays `Cost setup needed`, and client rollout is blocked until its financial data is completed or the role is formally shut down.
5. Configure departments, COO, Finance Director, Recruiting users and on-cost defaults for each pilot client.
6. Keep existing position API compatibility while the frontend moves to Hiring Plan routes.
7. Release first to staging and verify with representative NBI and Couch Heroes accounts across permission levels.
8. Enable production navigation only after migrated records and exports are reconciled against source data.

The implementation branch must incorporate the corrected ATS access contract from `codex/fix-hiring-client-admin-controls` before final verification.

## 19. Test Strategy

### Unit and route tests

- Client scoping for every role, department, settings, approval, cost and export endpoint.
- Permission matrix, including response-field redaction.
- Compensation validation for all engagement types and bases.
- FX, on-cost and monthly calculations.
- Approved, Pending, Combined and denied-exclusion totals.
- Material-change detection and immutable reapproval history.
- Structured denial validation.
- Optimistic concurrency conflicts.
- Excel sheet presence, values, formats and sensitive-field absence.
- Migration parsing and exception reporting.

### End-to-end tests

- Department Director creates and submits a requirement.
- COO approves and the role becomes available to Recruiting.
- COO denies using each reason path, including required Other explanation.
- Finance sees all Couch Heroes financial data; Recruiting and Department Director do not.
- Material edit to an approved role returns it to Pending.
- Plan, Roles and Monthly costs all open the same role sidebar.
- Pipeline summary opens Candidates filtered to the role.
- Existing candidate cards and candidate sidebar still work unchanged.
- Monthly matrix sorts soonest target start first and calculates 12, 24 and 36 month horizons.
- Full and restricted Excel exports match permissions.
- All eight themes render without clipped controls, illegible states or overlap at desktop and mobile widths.

### Completion gate

- Run the complete Vitest suite.
- Run the complete Playwright suite.
- Perform Playwright screenshot review of Plan, Roles, Monthly costs, role sidebar and Hiring Settings in representative light and dark themes at desktop and mobile sizes.
- Reconcile a sample export and UI matrix against an independently calculated expected dataset.
- Do not merge or deploy while any required verification is failing.

## 20. Acceptance Criteria

The feature is accepted when:

- A client can configure departments and workflow owners without affecting another client.
- A Department Director can submit a complete role requirement and the correct COO can approve or deny it.
- Approval makes that same role available to Recruiting without duplication.
- Candidates remains separate and unchanged, while every role view links to its existing pipeline.
- Every role entry point opens the same extended role-detail sidebar.
- Authorised users can edit plan fields and material changes reliably trigger reapproval.
- Monthly costs are ordered by earliest target start, use explicit auditable assumptions and show Approved, Total Pending and Combined Total.
- Finance can export a well-formatted, reconcilable workbook.
- Restricted users cannot obtain sensitive compensation or cost data from the UI, API or exported files.
- The experience fits WorkSage's existing interaction patterns and all themes.
