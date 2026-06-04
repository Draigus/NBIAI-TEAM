# Handoff — Interview Questions Expansion

**Date:** 2026-06-04
**Branch:** `feature/command-centre`
**Author:** Claude Opus 4.6

---

## What Was Done This Session

### 1. Root Cause Fix — Question Picker Bug
- All 30 positions had `discipline = NULL` — question picker showed "no discipline set" warning and dumped 450 generic questions
- Root cause: migration 060 added the column but no backfill was run

### 2. Role-Specific Questions (v1 → v2)
- 7 parallel research agents (one per role family) rewrote all questions using web research + NBI AI team AGENT.md domain expertise
- Each agent critically reviewed original questions and replaced generic ones with role-specific alternatives
- **Migration 065** applied: `position_titles text[]` column + GIN index on `interview_question_bank`
- Seed script: `dashboard-server/scripts/seed-role-questions.js` — parses markdown files from `deliverables/interview-questions/`, seeds DB with Couch Heroes client_id

### 3. API + Frontend Changes
- `GET /api/interview-questions` now accepts `position_title` param, filters with `@>` array contains
- `POST /api/interview-questions` accepts `position_titles` array
- `PATCH` allows updating `position_titles`
- Frontend `openInterviewConfig` looks up position *title* (not discipline), passes to API
- Questions shown grouped by category (culture/technical/collaboration/leadership/depth) instead of by discipline
- Warning banner: "This candidate has no position set" instead of "no discipline set"

### 4. Create Candidate Form Fix
- Removed free-text "Role" input entirely
- Position dropdown (from `hiring_positions`) is the role selector
- `role` field auto-set from position title on create

### 5. Expansion to 50 Questions Per Role (v2 → v3)
- Glen flagged culture questions as "not actual cultural fit questions" — they were process/workflow questions
- Expanded from 3 to 10 questions per category (50 per role)
- Complete culture rewrite across all roles for genuine cultural fit (values, interpersonal dynamics, self-awareness, motivation)
- 6 expansion agents ran (one per role family)

### 6. Current State — 892 Questions Seeded
22 of 30 roles have 50 questions each. Producer additional roles have 15 (old format). Art roles are missing entirely.

---

## What's Left

### MUST DO: Write Art Questions File
**File needed:** `deliverables/interview-questions/01-art.md`
**Roles:** Lead Animator, Lead Concept Artist, Snr Environment Artist, Snr Lighting Artist, Snr Technical Artist, Sr Character Modeler, Sr VFX Artist, Technical Animator
**Format:** 8 roles × 50 questions = 400 questions (10 per category: culture, technical, collaboration, leadership, depth)

The art expansion agent DID generate all 400 questions — the full content is in task notification `a0ed98bca8b4dc4e9` in the session JSONL. The file-writing agent failed with a socket connection error. The content needs to be extracted and written to the markdown file.

**Key requirement:** Culture questions must be ACTUAL cultural fit questions (values, interpersonal dynamics, self-awareness), NOT process questions. The expansion agent was explicitly instructed on this.

### MUST DO: Expand Production Questions
**File to fix:** `deliverables/interview-questions/04-production.md`
**Current state:** 42 questions (old 3-per-category format)
**Target:** Shared Producer: 30 questions (10 culture + 10 collaboration + 10 leadership), Art/Tech/Assoc Producer additional: 20 each (10 technical + 10 depth), Executive Producer: 50 unique

The production expansion agent DID generate all these questions — the full content is in task notification `aee57a279098d65b7` in the session JSONL. The file-writing agent extracted the wrong (old) version.

### SHOULD DO: Score Questions Against Web Research
Glen requested: "critique them on a scale of 1 to 10 against any of your questions you research online for each of the roles."
- Score each question 1-10 against web-researched best practices
- Flag anything below 7 for replacement
- Focus on culture questions specifically (since those were the problem area)

### SHOULD VERIFY: Design + Specialist Question Quality
- `03-design.md` was expanded by an agent that couldn't read the expansion agent output — it expanded from the OLD v2 questions (which had bad culture questions). Culture questions in this file need verification/rewrite.
- `06-specialist.md` was generated independently by the file-writing agent (250 questions) since the expansion output was 0 bytes. Quality may vary.

---

## Key Files

| File | Status |
|------|--------|
| `dashboard-server/migrations/065_question_position_titles.sql` | Applied ✓ |
| `dashboard-server/scripts/seed-role-questions.js` | Updated — reads from `deliverables/interview-questions/` directory |
| `dashboard-server/routes/interview.js` | Updated — `position_title` filter on GET, `position_titles` on POST/PATCH |
| `nbi_project_dashboard.html` | Updated — question picker uses position title, create candidate uses position dropdown |
| `dashboard-server/tests/unit/interview-questions.test.mjs` | 11 tests passing (2 new for position_title) |
| `dashboard-server/tests/helpers/fixtures.js` | Updated — `createTestInterviewQuestion` accepts `position_titles` |
| `deliverables/interview-questions/01-art.md` | **MISSING** — needs 400 questions |
| `deliverables/interview-questions/02-engineering.md` | ✓ 250 questions |
| `deliverables/interview-questions/03-design.md` | ✓ 200 questions (culture may need rewrite) |
| `deliverables/interview-questions/04-production.md` | **NEEDS EXPANSION** — 42 → 140 |
| `deliverables/interview-questions/05-audio-qa.md` | ✓ 150 questions |
| `deliverables/interview-questions/06-specialist.md` | ✓ 250 questions (independently generated) |

## After completing the remaining files:
1. Run `node scripts/seed-role-questions.js --dry-run` to verify counts
2. Run `node scripts/seed-role-questions.js` to seed
3. `pm2 restart nbi-dashboard`
4. Verify in frontend with test candidate

## Test Status
- Unit tests: 11/11 passing for interview-questions
- E2E: not re-run this session (UI changes need visual verification)
- bob th builder test candidate exists with position "Tools Engineer" (client: Couch Heroes)

## git push
Has been failing all session — commits are local only. Remote state needs investigation.
