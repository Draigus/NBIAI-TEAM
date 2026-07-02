# Handoff: Configurable Work Item Hierarchy (Initiative Level) -- Planning Complete, Baseline Red

**Date:** 1 July 2026
**Session focus:** CH feature request -- Initiative level + clickable type pill + per-client hierarchy depth
**Resume in a fresh session**

## What's completed (this session)

1. **Spec written and self-reviewed:** `docs/superpowers/specs/2026-07-01-configurable-hierarchy-design.md`. All design decisions made with Glen (recorded in spec section 2 and in `projects/nbi_dashboard/session_logs/2026-07-01_session.md`). Spec is **UNCOMMITTED** -- see blocker below.
2. **Live-repo hierarchy surface mapped and verified** (do NOT trust `nbi-modularise` -- that is a stale copy; an exploration agent mapped it by mistake and every path had to be re-verified in NBIAI_TEAM):
   - Backend constants: `dashboard-server/lib/helpers.js:15-16` (ITEM_TYPES, VALID_CHILD_TYPE; VALID_PARENT_TYPE + inferItemType nearby; exports ~251-252)
   - Duplicate ITEM_TYPES Set: `dashboard-server/lib/slack-bot.js:17` (must be unified)
   - Validation: `dashboard-server/routes/tasks.js:169-177, 235-236, 715`; `dashboard-server/routes/sync.js:142`
   - Wiring: `dashboard-server/server.js:59, 485, 488`
   - Frontend constants + badge: `dashboard-server/public/js/nbi-utils.js:141-167`
   - Views: `nbi-detail.js` (type field 110, parent selector 257, creation 1200-1544), `nbi-kanban.js` (drag validation 595/670/687, quick-add pill 355-361), `nbi-tasks.js` (filters 72-77), `nbi-settings.js:680`, `nbi-docs.js:570-574`, `nbi-gantt.js`
   - Clients table: `dashboard-server/migrations/001_initial_schema.sql:6` -- per-client config goes on `clients.hierarchy_levels JSONB`
3. **Verification baseline run:** unit suite GREEN (72 files, 933 tests, `npm test`, 2026-07-01 ~23:24). E2e RED: 73 passed, **10 failed**, 1 skipped (`npm run test:e2e`).

## BLOCKER: red e2e baseline from prior uncommitted work

- 6 failures in `tests/e2e/quick-add.spec.js` (inline quick-add feature, built 2026-06-25/26, code uncommitted in working tree: `nbi-kanban.js`, `nbi-gantt.js`, `dashboard.css`, `nbi_project_dashboard.html`)
- 4 failures in `tests/e2e/ats-workflow.spec.js` (interview wizard; `nbi-hiring.js` also dirty)
- Diagnostic so far: page loads and authenticates, but `.task-row:has(.quick-add-btn)` never appears -- either tree rows don't render in the test context or quick-add buttons are missing from the DOM. Error contexts + traces in `dashboard-server/test-results/`.
- **Verification gate correctly blocks all commits** (including the docs-only spec commit) until frontend surfaces are verified. Do not bypass; fix the failures.

## Resume sequence (next session)

1. Read this handoff + `projects/nbi_dashboard/session_logs/2026-07-01_session.md` + the spec.
2. **Fix the red baseline first** (systematic-debugging skill; 10 e2e failures above). Get `npm run test:all` green. Commit or explicitly park the prior sessions' dirty work with Glen's direction.
3. Commit the spec (will pass the gate once green).
4. **Codex adversarial review of the spec:** `codex exec` with the spec path; iterate on findings. Open items for that review are listed in spec section 9 (Option A vs B descendant-order data model is the big one -- spec recommends B).
5. writing-plans skill -> implementation plan -> Codex review of the plan -> iterate.
6. Implement in a **git worktree** (mandatory: >3 files in dashboard-server/), TDD for server endpoints.
7. `npm test` + `npm run test:all` green -> Codex review of implementation (`codex review --base master`) -> fix ALL findings every severity.
8. QA: Playwright e2e + visual screenshots (full-depth CH config AND contracted NBI config), real browser through auth stack.
9. Glen UAT.

## Key decisions locked (do not re-litigate)

Initiative = mandatory root (data uniformly 5-level; visibility per client). Cascade on type change. Hide-don't-destroy on depth contraction. Per-client config (NBI stays 4-level visible, CH gets all 5). Same fields for initiatives. Clean skip rendering. Pill offers all active levels + ~10s undo toast. Migration wraps existing root projects in one 'General' Initiative per client + one for unassigned.

---

# Handoff: CH Director Performance Reviews

**Date:** 1 July 2026
**Context consumed:** ~70%+ (deep context, many iterations)
**Resume in new session immediately**

## What exists

Performance review HTML file at:
`C:\Users\gpbea\AppData\Local\Temp\claude\d--OneDrive-Claude-code-NBIAI-TEAM\40c1ea42-9d1b-42fe-b98e-5b883d89f8ae\scratchpad\CH_Performance_Reviews.html`

Interactive tool with:
- 4 directors (David Luong, Robin Jubber, Mustafa Sibai, Graeme Monk)
- 6 competency areas each (Craft Skill, Leadership, Command Presence, Drive for Results, Communication, People Management)
- 1-5 rating per area (clickable, colour-coded, auto-averaged, localStorage persistent)
- Evidence items with checkboxes (toggle to remove, hidden when printing)
- Development actions (editable textareas)
- Cross-director calibration table (5th tab)
- Employee response section with sign-off lines
- Export to JSON, Print/PDF buttons

## What's done

- **David Luong: FULLY REWRITTEN** -- All Q() entries converted from raw conversational quotes to professional third-person assessment language. Raw verbatim preserved in smaller reference line underneath. All Aris quotes added.
- All reviewer fixes applied across the whole file: backup EP pipeline removed from Graeme, "I don't like working with Graham" removed, Valeria criticism removed from Graeme's craft, Graham/Graeme spelling standardised, Hannah "dropkick" paraphrased, Lorenza language cleaned, Robin empty Q items fixed, "what's working" paragraph added to David's leadership, Graeme probation stated, employee response section added, calibration table added.

## What remains

**Robin Jubber, Mustafa Sibai, Graeme Monk: Q() entries still have raw conversational quotes as the main text.** These need the same rewrite treatment David received:

For each Q() entry:
- **First parameter after index** (currently raw quote): Rewrite as professional third-person assessment language. E.g. "Sasha reported that David does not provide consistent follow-through..." not "my boss is super weak, super soft..."
- **Second parameter** (currently context): Change to the raw verbatim quote for reference traceability

The Q() function now takes: `Q(person, comp, index, source, assessment, verbatim)` where:
- `assessment` = professional language shown as main text
- `verbatim` = raw quote shown small underneath with "Verbatim:" prefix

### How to do it

Read the file from line 218 onwards (Robin starts there, Mustafa ~310, Graeme ~400). For each Q() entry:
1. Take the current quote text
2. Rewrite it as a professional observation: "Robin was assessed by production as estimating based on personal capability rather than team velocity" not "tends to estimate things as if he's delivering everything"
3. Move the original quote text to the verbatim parameter

### Source data

The deep research agent outputs (full narrative assessments with all evidence) are in the session scratchpad tasks directory:
- David: `tasks/a80a4895768bfcd73.output`
- Robin: `tasks/ad8103599a8077c22.output`
- Mustafa: `tasks/a7a02f9d69ecea90c.output`
- Graeme: `tasks/a6f7e1878c25c3208.output`
- Aris quotes: `tasks/ab758dd170b27a319.output`

### Reviewer feedback already applied

Three reviewers (HR/Head of People, CEO lens, COO lens) produced detailed reports. All findings actioned EXCEPT:
- Anchoring timelines to production milestones not calendar days (minor, in development actions text)
- Risk quantification ratings in the calibration tab (text exists, ratings need Glen to populate)

### Glen's requirements (confirmed across many iterations)

1. **Third person factual** voice -- "David was observed to..." not first person
2. **6 categories**: Craft Skill, Leadership, Command Presence, Drive for Results, Communication, People Management
3. **ALL quotes included** with ability to uncheck/remove ones not wanted
4. **Professional assessment language** as main text, raw verbatim as reference underneath
5. **Deep, robust content** -- narrative assessments with full context per competency
6. **Specific, measurable development actions** -- not generic advice
7. Interactive 1-5 ratings, localStorage persistence, export/print

### File structure

The HTML file uses JavaScript template functions:
- `S(person, comp, label, assessment_html, quotes_html, actions_text)` -- builds a competency section
- `Q(person, comp, index, source, assessment, verbatim)` -- builds an evidence item
- Content is injected via `document.getElementById('p-X').innerHTML += ...` in script blocks

### Decision: where to save final version

Glen hasn't specified a permanent location. The current file is in the session scratchpad (temporary). Once complete, ask Glen where he wants it saved.
