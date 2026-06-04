# Interview Tool Completion — Design Spec

**Date:** 2026-06-02
**Status:** Draft (v2 — post-audit)
**Branch:** feature/command-centre

## Overview

Complete the interview tool with five workstreams: discipline-based question filtering, focused scorecard mode, question bank management tab, question quality pass, and E2E testing.

## Dependency Graph

```
Migration 059 (discipline field on hiring_positions)
  ├── Position create modal + detail panel (discipline dropdown)
  ├── Position API changes (GET/POST/PATCH whitelist)
  ├── Question picker discipline filtering
  │     └── E2E: question picker tests
  ├── Question bank management tab
  │     └── E2E: bank management tests
  ├── Existing unit test updates (position fixtures)
  └── Question quality pass (parallel, content-only)

Focused interview scorecard (independent of discipline work)
  ├── Hash route + deep-link checks
  └── E2E: scorecard flow tests
```

Migration 059 must land first. Focused scorecard and quality pass are independent of each other and of the discipline work.

---

## 1. Discipline Field on Hiring Positions

### Schema change (migration 059)

Add `discipline TEXT` column to `hiring_positions`. No CHECK constraint — the standard 9 values (Engineering, Art, Narrative/Writing, Game Design, QA, Production, Audio, HR/People, Leadership) are enforced as a UI dropdown, but the DB accepts any text so custom disciplines work without a migration.

No automated backfill. Existing positions get `NULL`. The UI handles null gracefully (see Section 2).

### Backend changes (routes/hiring.js)

Three specific edits required:

**GET `/api/hiring-positions`** (line 251): Add `p.discipline` to the SELECT column list, after `p.jd_original_name`.

**POST `/api/hiring-positions`** (line 288): Add `discipline` as the 11th column in the INSERT statement. Extract from `req.body.discipline` and pass as `$11`. Add to the VALUES list.

**PATCH `/api/hiring-positions/:id`** (line 317): Add `'discipline'` to the `buildPatchQuery` allowed-fields array: `['client_id', 'sow_id', 'title', 'description', 'seniority', 'status', 'salary_range', 'employment_type', 'location', 'interview_panel', 'scorecard_criteria', 'discipline']`.

**GET `/api/interview-configs`** (line 222): Extend the SELECT to include `hp.discipline AS position_discipline` so the frontend knows the discipline when rendering configs.

### Create position modal (line 20321, `openCreatePositionModal`)

Add a discipline dropdown to the modal between the Seniority/Type row and the Salary Range field. Same layout style as the existing Seniority/Type row — a flex row with two dropdowns:

```
[Seniority ▾] [Type ▾]
[Discipline ▾] [Location ___]
[Salary Range ___]
```

Options: `— None —`, Engineering, Art, Narrative/Writing, Game Design, QA, Production, Audio, HR/People, Leadership.

In `submitCreatePosition()` (line 20361), add to the body: `discipline: (document.getElementById('cpDiscipline') || {}).value || null`.

### Position detail panel (line 21066, `openPositionDetail`)

Add a Discipline dropdown in the admin edit section alongside the existing Status and Seniority dropdowns (lines 21066-21081). Same pattern: `<select>` with `onchange="updatePositionField('${p.id}','discipline',this.value||null)"`. Show current value as selected. Show the discipline in the read-only (non-admin) view as a text label alongside seniority.

### Position card (line 20044)

Display the discipline badge on the position card in the Positions tab, below the title. Small pill badge, same style as the seniority badge.

---

## 2. Question Picker Discipline Filtering

### Data loading

The `openInterviewConfig(candidateId, clientId, positionId)` function (line 21772) loads ALL questions for the client via `/api/interview-questions?client_id=X`. This stays the same — no server-side discipline filter. All questions are loaded and grouped client-side. This allows the "Other disciplines" accordion to work without additional API calls.

### Position discipline lookup

Look up the position's discipline from `_hiringPositionsData` (already loaded in the hiring page):

```js
const position = (_hiringPositionsData || []).find(p => p.id === positionId);
const positionDiscipline = position ? position.discipline : null;
```

No fetch needed.

### Display when position HAS a discipline

Questions are grouped into two sections:

**Primary section (expanded):** Questions matching the position's discipline, grouped by category (culture, technical, collaboration, leadership, depth) as before. Each category is a subsection with header and checkboxes.

**"Other disciplines" section (collapsed):** An accordion labelled "Other disciplines (N questions)". When expanded, shows each other discipline as a collapsible sub-section with a discipline header and question count. Each sub-section contains questions grouped by category. User can expand individual disciplines to cherry-pick cross-discipline questions.

Header shows the active discipline: "Showing questions for: **Engineering** (25 questions)" with a discipline badge.

### Display when position has NO discipline (null)

All questions shown, grouped by **discipline first, then category**. Each discipline is a collapsible section. Banner at top: "This position has no discipline set — showing all questions. Set a discipline on the position to filter."

### Custom question form fix

Line 21866 currently hardcodes `discipline: 'General'`. Change to use `positionDiscipline` when available. When no position discipline is set, add a discipline dropdown to the custom question form (inline form at line 21843), defaulting to 'General'.

---

## 3. Focused Interview Scorecard

### Hash route — two integration points

**1. `hashchange` listener (line 26408):** Add a clause for `#interview/`:

```js
if (hash.startsWith('#interview/')) {
  const sessionId = hash.replace('#interview/', '');
  openInterviewScorecard(sessionId);
  window.location.hash = '';
}
```

Clear the hash after handling (matching existing `#hiring/candidate/` pattern at line 26417).

**2. Deep-link check function:** Create `checkInterviewDeepLink()` matching the existing `checkExpenseReportDeepLink()` pattern. Call it at both post-login points:
- After `handleLogin` (line 3993, alongside `checkExpenseReportDeepLink()`)
- After session restore (line 27614, same)

This handles the case where an interviewer clicks the email link, lands on the login screen (hash in URL), logs in, and needs the scorecard to open automatically.

### `openInterviewScorecard(sessionId)` function

1. Hide the current view (nav, sidebar, page content) — set `document.getElementById('appContainer')` children to `display:none` except a new `#interviewScorecardView` container
2. Fetch `GET /api/interview-sessions/{sessionId}`
3. Error states:
   - 401: show "Please log in" with login link
   - 403: show "You are not assigned to this interview"
   - 404: show "Interview session not found"
   - All error states include a "Back to Dashboard" button that calls `closeInterviewScorecard()`
4. On success: render based on session status

### Session state handling

- **`assigned`** → "Start Interview" splash:
  - Candidate name and role (large, prominent)
  - Position title, client name
  - Number of questions and estimated time (~2 min per question)
  - "These scores are confidential — only the hiring manager will see aggregated results"
  - Large "Begin Scoring" button
  - Clicking sets session to `in_progress` via first score interaction

- **`in_progress`** → Resume at the first unscored question (scan questions array, find first without a score)

- **`submitted`** → Read-only review:
  - All questions listed with the score given and any notes
  - Category averages
  - Submission timestamp
  - "Your scorecard has been submitted — thank you" message

### Scorecard layout

Respects current theme (dark or light — uses CSS custom properties). Full viewport, no nav/sidebar.

**Header strip (fixed top, 56px):**
- Left: Candidate name · Role · Client
- Centre: Progress bar with "X of Y scored"
- Right: "Save & Exit" button (returns to hiring page, scores already auto-saved)

**Category progress (below header, collapsible):**
- 5 horizontal mini-bars showing scored/total per category
- Colour-coded: culture (blue), technical (purple), collaboration (green), leadership (amber), depth (coral)
- Click a category to jump to its first unscored question

**Question card (centred, max-width 700px, vertically centred in remaining space):**
- Category badge (pill, top-left)
- Discipline badge (pill, muted, top-right)
- Question text: 18px, line-height 1.6, var(--text-primary). Minimum readable per Glen's text size rules.
- Score buttons: 5 buttons in a row, each labelled with number and descriptor:
  - 1 (Poor), 2 (Below Average), 3 (Average), 4 (Good), 5 (Excellent)
  - Unselected: outlined, muted
  - Selected: filled background — red for 1-2, amber for 3, green for 4-5
  - **Mobile (<480px):** Stack into a 3+2 grid (top row: 1, 2, 3 / bottom row: 4, 5) or vertical list with full-width buttons
- Notes textarea below scores: collapsed by default, expand on click "Add notes" link. Placeholder: "Optional — add context for the hiring manager"
- **Auto-save:** PUT `/api/interview-scores/{sessionId}/{questionId}` fires on score button click. On success: brief green flash on the button. On failure: toast "Score not saved — check your connection", score button shows orange dot indicating unsaved state. Retry on next interaction.

**Navigation (fixed bottom, 48px):**
- Left: "← Previous" button (disabled on first question)
- Centre: Dot indicators — filled dot = scored, hollow dot = unscored, ring dot = current. Click a dot to jump to that question.
- Right: "Next →" button (disabled on last question)
- **Keyboard:** Left/Right arrows for navigation. 1-5 number keys for scoring. **Listeners attached to the scorecard container element, not document** — detached when scorecard closes via `closeInterviewScorecard()`.

**Submit (appears on last question when all scored):**
- "Submit Scorecard" button replaces "Next" button
- Confirmation dialog: "Submit your scorecard for [Candidate Name]? You won't be able to change your scores after submission."
- POST `/api/interview-sessions/{sessionId}/submit`
- On success: transition to read-only submitted view
- On error (e.g. "2 of 15 scored" validation): toast with the API error message

### `closeInterviewScorecard()`

- Detach keyboard listeners
- Remove/hide the scorecard container
- Restore normal app layout (nav, sidebar, page content)
- If came from a deep link (no previous view), navigate to hiring page

---

## 4. Question Bank Management Tab

### Location and visibility

New 6th tab in the hiring page. Add `'questions': 'Questions'` to `tabLabels` (line 20105).

**Visibility gating:** The tab appears in the tab bar for NBI users only. Inside the tab loop (line 20122), skip the 'questions' key if `isClientUser()`. This is separate from `canSeeTabs` — client admins can see Pipeline/Positions/etc but NOT the question bank.

**Tab dispatch:** Add `case 'questions': renderQuestionsTab(tabEl); break;` to the switch statement at line 20131.

### `renderQuestionsTab(container)` layout

**Filter bar (top row, horizontal flex):**
- Client dropdown: populated from `getContractedClientRecords()`. Defaults to `window._hiringFilterClient` (current hiring page filter) if set, otherwise "All clients".
- Discipline dropdown: the 9 standard values + "All disciplines" default.
- Category pills: All (default), Culture, Technical, Collaboration, Leadership, Depth. Active pill highlighted with accent colour.
- Search input: text field with magnifying glass icon, placeholder "Search questions...". Filters `question_text` client-side (case-insensitive substring match).

**Questions list (below filters):**
- Fetched via `GET /api/interview-questions` with client_id and discipline query params based on filter selections. Category and search are client-side filters.
- Each question rendered as a card/row:
  - Question text (full display, not truncated — wraps naturally, max-width constrained by card width)
  - Metadata row: discipline pill, category pill, source badge (curated/custom/ai_generated), "Created by [name]" text
  - Actions (right-aligned): Edit pencil icon, Delete trash icon (admin only, hidden for non-admin)
- Grouped by discipline with discipline headers (collapsible sections)
- Within each discipline, sorted by category order (culture → technical → collaboration → leadership → depth)
- Count in each section header: "Engineering (25 questions)"

**Empty state:** "No questions match your filters" with a suggestion to adjust filters.

**Pagination:** Client-side, 50 per page. "Showing 1-50 of 225" with Previous/Next page buttons. At current scale (225 questions per client) this is adequate.

**"+ New Question" button (top-right, primary style):**
Opens a modal (matching existing modal pattern — `.modal-overlay` > `.modal`):
- Question text: textarea, 4 rows, placeholder "Enter the interview question..."
- Discipline: dropdown (9 values, required)
- Category: dropdown (5 values, required)
- Depth type: dropdown (code / art_style / narrative / — None —), only shown when category is "depth"
- Client: dropdown, pre-filled from current filter
- Source: defaults to 'custom', not shown (set automatically)
- Buttons: Cancel, Create (primary)
- Saves via `POST /api/interview-questions`

**Edit action:**
Opens same modal pre-populated with current values. Saves via `PATCH /api/interview-questions/:id`. Fields: question text, discipline, category, depth_type.

**Delete action (admin only):**
Confirmation dialog: "Delete this question? This cannot be undone. If this question is used in an active interview config, it will be removed from those configs too." Calls `DELETE /api/interview-questions/:id`.

### Why modal, not inline edit

The existing codebase uses modal/overlay panels for editing throughout (candidate detail, position detail, task detail). Inline editing would introduce a new pattern. Stay consistent.

---

## 5. Question Quality Pass

### Scope

Review all seeded questions for the Couch Heroes client. Verify count first via `GET /api/interview-questions?client_id=21be0772-73e5-4cca-8795-8b1a66f89ec2` (seed script header says 225 = 25 × 9 disciplines; commit message claimed 450 — may have been run twice).

### Criteria

Each question must:
1. Be specific to Couch Heroes context (fully remote, UK + Greece, multiplayer games, ~55 employees, cross-timezone)
2. Avoid generic "tell me about a time when..." phrasing — every question must require demonstrated competency, not storytelling
3. Be correctly categorised (culture/technical/collaboration/leadership/depth)
4. Have no near-duplicates within its discipline or across disciplines
5. Be calibrated for mid-level seniority (the default) — not too senior, not too junior
6. Have correct depth_type where applicable (code for Engineering/Game Design/QA, art_style for Art/Audio, narrative for Narrative/Writing, null for Production/HR/Leadership)
7. Be grammatically correct, use British English, no American spellings

### Deliverable

A change log listing every modification: questions edited (with before/after text and rationale), questions deleted (with reason), and any new questions added. Applied directly to the production database via API calls (PATCH, DELETE, POST). Glen reviews the change log as a finished deliverable.

---

## 6. E2E Testing

### Test files

New Playwright spec files in `dashboard-server/tests/e2e/`, following existing `.spec.js` pattern (not `.spec.mjs`):

- `interview-picker.spec.js` — discipline filtering in question picker, cross-discipline accordion, custom question creation
- `interview-scorecard.spec.js` — deep-link access, scoring flow, navigation, submission, read-only post-submit view
- `interview-results.spec.js` — aggregated results view, divergent score highlighting, decision recording
- `interview-bank.spec.js` — Questions tab visibility, CRUD, filtering, search

### Test data setup

Each spec seeds its own interview data via API calls in `beforeAll`:
- Client (use existing test client or create one)
- Hiring position (with `discipline` set)
- Candidate (linked to position)
- Questions in the bank (3-5 per category for the discipline)
- Interview config with questions and sessions (for scorecard/results tests)

Cleanup in `afterAll` via DELETE calls.

### Existing unit test updates

The 3 existing unit test files (`interview-questions.test.mjs`, `interview-configs.test.mjs`, `interview-scoring.test.mjs`) may need fixture updates if their position test data lacks the new `discipline` column. Verify and update fixtures if tests fail after migration 059.

---

## Files touched

| Area | Files | Changes |
|------|-------|---------|
| Migration | `migrations/059_hiring_position_discipline.sql` | Add `discipline TEXT` column |
| Backend | `routes/hiring.js` | GET SELECT list (+discipline), POST INSERT (+discipline as $11), PATCH whitelist (+discipline) |
| Backend | `routes/interview.js` | Config list query (+hp.discipline AS position_discipline) |
| Frontend | `nbi_project_dashboard.html` | Create position modal (+discipline dropdown), position detail panel (+discipline dropdown+display), position card (+discipline badge), question picker (discipline grouping+accordion), interview scorecard (new full-page view), question bank tab (new tab), hashchange listener (+#interview/ clause), deep-link check (+checkInterviewDeepLink at 2 call sites), custom question form (discipline inheritance) |
| Unit tests | `tests/unit/interview-*.test.mjs` | Fixture updates for discipline column if needed |
| E2E tests | `tests/e2e/interview-*.spec.js` | 4 new spec files |
| Data | Via API calls | Question edits applied to production DB |
