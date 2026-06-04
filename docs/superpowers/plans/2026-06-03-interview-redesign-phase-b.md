# Interview UX Redesign — Phase B: Frontend Candidate Panel

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat interview round cards with an interactive candidate detail panel featuring expand/collapse round cards, admin decision bar, blind scoring display, round management (add/delete/cancel), staleness warnings, and density management.

**Architecture:** All changes in `nbi_project_dashboard.html` (monolithic SPA with inline JS/CSS). The Phase A API layer is complete — all endpoints work. This phase rewrites `buildCandidateInterviewsHtml` and supporting functions to use the new `interview_configs` API response shape. No server changes needed.

**Tech Stack:** Vanilla JS (no framework), CSS custom properties, existing modal/focus-trap infrastructure, Playwright E2E tests.

**Spec:** `docs/superpowers/specs/2026-06-03-interview-ux-redesign.md` (v3)

**Phase sequence:** Phase A (DB + API) complete. This is Phase B of 3. Phase C = Add/Edit modals + calendar.

---

## Task 1: Rewrite buildCandidateInterviewsHtml with expand/collapse round cards

**Files:**
- Modify: `nbi_project_dashboard.html` (buildCandidateInterviewsHtml function, ~line 22588)

- [ ] **Step 1: Rewrite the function with compact/expanded card states**

Replace the existing `buildCandidateInterviewsHtml` function with a version that:
- Compact view (~45px): round type, date, outcome badge, aggregate score (if all submitted). Click to expand.
- Expanded view: full detail with schedule metadata, session progress, outcome notes, action links.
- Blind scoring: show "N of M scored" until all sessions are submitted/declined, then show aggregate.
- Staleness warning: amber indicator if `scheduled_at` is past and no sessions have started scoring.
- Density: after 5 rounds, collapse remaining under "Show N more" toggle.
- Admin-only delete button (×) and cancel button on expanded cards.
- "View Results" link on expanded cards for scored types with submitted sessions.

The function signature stays the same: `buildCandidateInterviewsHtml(candidateId, rounds, disabledStyle)`.

Window functions for card interaction:
- `window._ivExpandRound(configId)` — toggle expand/collapse
- `window._ivDeleteRound(configId)` — admin delete with themedConfirm
- `window._ivCancelRound(configId)` — set outcome=cancelled via PATCH
- `window._ivShowMore()` — expand density collapse

- [ ] **Step 2: Add "+ Add Round" button at the top**

In the section header, add a button visible to NBI users only:
```html
<button class="btn btn--sm" style="background:#7c3aed;color:white;border:none;font-size:0.75rem" onclick="openAddRoundModal('${candidateId}')">+ Add Round</button>
```

- [ ] **Step 3: Verify by restarting PM2 and checking a candidate with interview rounds**

```powershell
pm2 restart nbi-dashboard
```

Open http://localhost:8888/nbi_project_dashboard.html, navigate to Hiring → click a candidate with interviews → Interviews tab should show compact cards that expand on click.

- [ ] **Step 4: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(interview): expand/collapse round cards with blind scoring, staleness, density"
```

---

## Task 2: Decision bar — admin-only advance/hold/reject

**Files:**
- Modify: `nbi_project_dashboard.html` (add decision bar below round cards in buildCandidateInterviewsHtml, and new async function for decision submission)

- [ ] **Step 1: Add buildDecisionBarHtml function**

New function below `buildCandidateInterviewsHtml`:
```js
async function buildDecisionBarHtml(candidateId) {
  if (_currentUser?.role !== 'admin') return '';
  const decisions = await apiCall('/api/hiring-decisions?candidate_id=' + candidateId);
  // ... renders previous decisions + advance/hold/reject buttons + notes textarea
}
```

Returns HTML with:
- Previous decisions listed (newest first) with color-coded badges
- Three action buttons: Advance (green), Hold (amber), Reject (red)
- Notes textarea (required)
- Reject shows additional rejection_category dropdown

- [ ] **Step 2: Wire up window._ivDecideCandidate function**

```js
window._ivDecideCandidate = async function(candidateId, decision) {
  // Validate notes required
  // If reject: validate rejection_category
  // POST /api/hiring-decisions
  // Toast success
  // Re-render candidate detail
}
```

- [ ] **Step 3: Integrate decision bar into openCandidateDetail**

After the interviews section renders, load and append the decision bar asynchronously (like activity/comments loading pattern).

- [ ] **Step 4: Verify and commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(interview): admin decision bar — advance/hold/reject with history"
```

---

## Task 3: Add Round modal — Phone Screen

**Files:**
- Modify: `nbi_project_dashboard.html` (new openAddRoundModal function)

- [ ] **Step 1: Implement openAddRoundModal**

Function creates a modal (reusing existing modal infrastructure) with:
- Round type dropdown: Phone Screen, Technical, Cultural, Final, Other
- When Phone Screen selected: simple form with date, time, duration, interviewer name (text), location
- When scored type selected: redirects to `openInterviewConfig` (existing function) with the round_type pre-set
- Create button calls POST /api/interview-configs with appropriate fields
- For Phone Screen: single POST (no activate needed, status=completed)
- For scored types: POST (draft) → POST activate → sends emails

- [ ] **Step 2: Update openInterviewConfig to accept round_type parameter**

Modify `openInterviewConfig(candidateId, clientId, positionId, roundType)` to pass `round_type` in the POST body when creating the config. Default to 'Technical' if not provided for backward compatibility.

- [ ] **Step 3: Remove old scheduling functions**

Remove or update:
- `openScheduleInterviewModal` — replace with `openAddRoundModal`
- `submitScheduleInterview` — no longer needed (merged into modal)
- `addInterviewRound` — replaced by `openAddRoundModal`

Update references in Calendar tab buttons to use `openAddRoundModal()`.

- [ ] **Step 4: Verify and commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(interview): Add Round modal with Phone Screen and scored type flows"
```

---

## Task 4: Cleanup — remove old interview round code

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Remove dead functions**

Remove functions that reference retired endpoints and are no longer called:
- `loadAndRenderScorecards` — old scorecard loader
- `createScorecard` — old scorecard creator
- `updateInterviewOutcome` old version (already replaced, but verify no old references remain)

- [ ] **Step 2: Update buildCandidateStageSubHtml**

The spec says to merge the "Configure Interview" / "Interview Results" button into the round cards. Update `buildCandidateStageSubHtml`:
- For `interviews` stage: remove the standalone interview button (this is now handled by round cards + "View Results" links)
- Keep offer stage and onboarding stage logic unchanged

- [ ] **Step 3: Verify no remaining references to retired endpoints**

```bash
grep -n "interview-rounds\|/api/candidates.*interviews" nbi_project_dashboard.html
```
Should return zero hits (or only comments).

- [ ] **Step 4: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "refactor(interview): remove dead interview round functions and old endpoint references"
```

---

## Task 5: E2E Playwright tests

**Files:**
- Modify: `dashboard-server/tests/e2e/interview-results.spec.js`
- Modify: `dashboard-server/tests/e2e/interview-scorecard.spec.js`
- Create: `dashboard-server/tests/e2e/interview-rounds-panel.spec.js`

- [ ] **Step 1: Update existing E2E tests for new API shape**

The existing interview E2E tests use `createTestInterviewConfig` which now requires `round_type`. Update test fixtures and assertions.

- [ ] **Step 2: Write new E2E test: round cards display**

```js
test('candidate detail shows round cards with expand/collapse', async ({ page }) => {
  // Setup: create candidate with 2 rounds (Phone Screen + Technical)
  // Login as admin
  // Open candidate detail
  // Verify compact cards visible
  // Click first card → verify expanded with schedule details
  // Click again → verify collapsed
});
```

- [ ] **Step 3: Write new E2E test: decision bar**

```js
test('admin can record advance decision', async ({ page }) => {
  // Setup: create candidate in interviews stage
  // Login as admin
  // Open candidate detail → Interviews tab
  // Fill notes, click Advance
  // Verify decision badge appears
  // Verify candidate moved to offer stage
});
```

- [ ] **Step 4: Write new E2E test: add Phone Screen round**

```js
test('can add Phone Screen round via modal', async ({ page }) => {
  // Login as admin
  // Open candidate detail
  // Click "+ Add Round"
  // Select "Phone Screen", fill fields
  // Submit
  // Verify new round card appears
});
```

- [ ] **Step 5: Run all E2E tests**

```powershell
npm run test:e2e
```

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/tests/e2e/
git commit -m "test(interview): E2E tests for round cards, decision bar, and add round flow"
```

---

## Task 6: Persona-based UAT walkthroughs

**Files:**
- Create: `dashboard-server/tests/e2e/interview-uat-personas.spec.js`

- [ ] **Step 1: Create test data for 3 personas**

Seed data via fixture helpers:
- **Persona A — Hiring Manager (NBI Admin):** Has 3 candidates at various stages. One with completed Phone Screen + active Technical round (2 interviewers, 1 submitted). One with all rounds done. One new candidate with no rounds.
- **Persona B — Interviewer (NBI Member):** Assigned to score a Technical round. Has not submitted yet.
- **Persona C — Client User:** Can view candidates but not scores or internal data.

- [ ] **Step 2: Write Persona A walkthrough — Hiring Manager flow**

Tests:
1. Login as HM → Hiring page → click candidate with completed rounds
2. See round cards (compact by default, correct type colors)
3. Expand Technical round → see "1 of 2 scored" (blind — no aggregate shown)
4. Click "View Results" on completed round → see aggregated scores
5. Return to detail → use decision bar to Advance candidate
6. Verify candidate moved to offer stage
7. Open new candidate → see "No interviews scheduled"
8. Click "+ Add Round" → create Phone Screen → verify card appears

- [ ] **Step 3: Write Persona B walkthrough — Interviewer flow**

Tests:
1. Login as interviewer → open assigned candidate
2. See round cards but NO decision bar (not admin)
3. Expand Technical round → see "1 of 2 scored" (blind)
4. Cannot see aggregate scores (own session not submitted)
5. Open scorecard via deep link → score all questions → submit
6. Return to detail → now see aggregate score

- [ ] **Step 4: Write Persona C walkthrough — Client user**

Tests:
1. Login as client user → open candidate
2. See round cards (type, date, status only — no scores, no session details)
3. No decision bar
4. No "+ Add Round" button
5. Cannot access interview results

- [ ] **Step 5: Run full E2E suite including persona tests**

```powershell
npm run test:e2e
```

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/tests/e2e/
git commit -m "test(interview): persona-based UAT — HM, interviewer, and client user flows"
```

---

## Task 7: Final verification + PM2 restart

- [ ] **Step 1: Run full unit test suite**

```powershell
cd dashboard-server && npm test
```

- [ ] **Step 2: Run full E2E test suite**

```powershell
npm run test:e2e
```

- [ ] **Step 3: Restart PM2**

```powershell
pm2 restart nbi-dashboard
```

- [ ] **Step 4: Update session log and live state files**

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(interview): Phase B complete — frontend candidate panel with round cards, decisions, and persona UAT"
```
