# Handoff: ATS Single-Flow Interview Wizard -- Approved, Not Started

**Date:** 2 July 2026
**Session focus:** Reviewed and committed all dirty work from 2026-06-25 -> 2026-07-01 sessions; diagnosed the red e2e baseline
**Resume in a fresh session**

## State at handoff

- Working tree CLEAN except this handoff + `projects/nbi_dashboard/session_logs/2026-07-02_session.md`. 7 new commits on master (05dfae9 quick-add pill, 6952b3c gantt save fix, c89f23f hiring fix, dad02fa cache-busts, 211cabf AIOS docs, 56c5629 hierarchy spec, 2255395 chore).
- Unit suite: 933/933 GREEN. quick-add e2e: 6/6 GREEN (fixed this session -- tests now expand the default-collapsed tree via `expandToLevel('task')`).
- ats-workflow e2e: **4 tests still RED, by design of this handoff** -- see below.
- Branch is 16 commits ahead of origin; the 9 `snapshot:` cadence commits MUST be squashed before push (Gate 5 blocks push until then).

## THE TASK: build the ATS single-flow interview wizard

**Glen's decision 2026-07-02: build it now.** Evidence gathered this session:

- `tests/e2e/ats-workflow.spec.js` (committed 2026-06-14, d22b9bd) tests a "Wave 2" single-flow wizard using element IDs `#ivwScoredSections`, `#ivwDiscipline`, `#ivwQuestionList`, `#ivwInterviewerList`, `#ivwCount` and a `Send Interviews` submit path.
- That frontend has NEVER existed: searched `git log --all -S "ivwScoredSections"`, both stashes, and both worktrees (spa-modularise, nbi-modularise). Only the spec references those IDs. Tests 59/114 have been red since 2026-06-14.
- Tests 154 (scorecard deep link) and 194 (advance decision) are CASCADE failures -- they reuse the session test 59 creates. The scorecard (`openInterviewScorecard`, `_sc*` handlers) and decision endpoint code EXISTS and is presumed working once a session exists.
- Current UI: old two-step flow -- `openAddRoundModal` (nbi-hiring.js:4098) creates the round, then a separate Configure Interview panel adds questions/interviewers. The modal's own note (nbi-hiring.js:4157-4159) describes this. The spec header says this configure-after-create flow caused the duplicate-rounds bug.

**The e2e spec IS the design contract.** Wizard requirements encoded in tests 59/114/132:
- Round type select `#ivAddType` stays; Phone Screen = simple form (current behaviour, test 132 passes today).
- Scored types (Technical/Cultural/Final): `#ivwScoredSections` appears with question checklist `#ivwQuestionList` (filtered to position discipline, shows "Showing questions for: <discipline>"), interviewer checklist `#ivwInterviewerList` with a "Filter by name..." text filter that keeps focus while typing, live count `#ivwCount` ("N questions · M interviewers"), submit button text "Send Interviews", disabled until >=1 question and >=1 interviewer.
- Position without discipline: inline `#ivwDiscipline` select appears; choosing one filters questions AND PATCHes the discipline onto the position.
- Submit creates EXACTLY ONE interview_configs row (status active, scheduled_at, location) + interview_config_questions rows + one interview_sessions row per selected interviewer. No orphaned draft configs.

## Resume sequence

1. Read this handoff + `projects/nbi_dashboard/session_logs/2026-07-02_session.md`.
2. brainstorming skill (new feature) with qa_lead/senior_engineer context; the e2e spec constrains most decisions -- confirm backend shape (existing routes for configs/questions/sessions likely reusable; check `routes/` for interview endpoints and what `_ivSubmitAddRound` calls today).
3. writing-plans -> implement in a **git worktree** (nbi-hiring.js + possibly routes; >3 files mandatory worktree). TDD for any new/changed server endpoints.
4. Definition of done: `npm test` green AND full `npm run test:e2e` green INCLUDING all 6 ats-workflow tests (no fixme, no skip), Codex review (`codex review --base master`) clean or all findings fixed, cache-bust bump for nbi-hiring.js in nbi_project_dashboard.html, pm2 restart, Glen UAT.

## Also pending (do not lose)

- **Squash `snapshot:` commits before any push** (9 cadence snapshots + review whether to squash the 7 new real commits is Glen's call -- the real commits are fine to keep).
- **Configurable hierarchy (Initiative level):** spec committed at `docs/superpowers/specs/2026-07-01-configurable-hierarchy-design.md`. Next: Codex adversarial review of the spec (open items in spec section 9, Option A vs B descendant-order model -- spec recommends B), then writing-plans, worktree implementation, TDD. Key locked decisions are in spec section 2 and the 2026-07-01 session log. Hierarchy surface map (verified in live repo, do NOT trust nbi-modularise): helpers.js:15-16, slack-bot.js:17 (duplicate ITEM_TYPES to unify), routes/tasks.js:169-177/235-236/715, routes/sync.js:142, server.js:59/485/488, nbi-utils.js:141-167, nbi-detail.js:110/257/1200-1544, nbi-kanban.js:595/670/687 + pill, nbi-tasks.js:72-77, nbi-settings.js:680, nbi-docs.js:570-574, migrations/001:6 (clients.hierarchy_levels JSONB).

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
