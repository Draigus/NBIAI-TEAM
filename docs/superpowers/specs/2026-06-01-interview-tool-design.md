# Interview Tool Design Spec

**Date:** 2026-06-01
**Status:** Approved
**Location:** Hiring page in WorkSage (NBI Hub)

## Overview

A structured interview tool integrated into the WorkSage hiring page. Hiring Managers configure interviews by selecting questions from a client-specific, AI-generated question bank. Interviewers conduct scored interviews through a focused, distraction-free view. Results are aggregated for HM decision-making.

## Core Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scoring model | 1-5 scale per question (Poor/Below/Average/Good/Excellent) | Industry standard, easy to aggregate and compare |
| Scorecard model | Independent per interviewer | Prevents anchoring bias; interviewers can't see each other's scores |
| Question bank population | AI-generated from JD + 5 categories, curated by HM | Less upfront work, tailored per role/JD |
| Custom questions | Yes, HM can add and they're saved to the bank | Full flexibility, bank grows over time |
| Results visibility | HM + HR + admin (Glen) only | Clean separation; interviewers see only their own submissions |
| Decision output | Aggregated dashboard with Advance/Hold/Reject | Formal decision point with audit trail |
| Architecture | Focused Interview Mode (Approach A) | Dedicated distraction-free view launched from candidate card |
| Initial seed scope | All Couch Heroes disciplines | Ready for any future hire across the organisation |
| Client scoping | Roles, people, and question banks are all per-client | Each client has its own question ecosystem |

## Data Model

### New Tables

#### interview_question_bank

Stores all interview questions, scoped per client and discipline.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| client_id | UUID, FK -> clients | Questions are client-specific |
| discipline | TEXT | e.g. "Engineering", "Art", "Narrative" |
| category | TEXT | culture, technical, collaboration, leadership, depth |
| question_text | TEXT | The full question |
| depth_type | TEXT, nullable | "code", "art_style", "narrative", null |
| source | TEXT | "ai_generated", "custom", "curated" |
| created_by | UUID, FK -> users | Who created/added it |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

Indices: (client_id, discipline), (client_id, category)

#### interview_configs

Links a specific set of questions to a specific candidate interview.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| candidate_id | UUID, FK -> candidates | |
| position_id | UUID, FK -> hiring_positions | |
| created_by | UUID, FK -> users | The HM who configured it |
| status | TEXT | "draft", "active", "completed" |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### interview_config_questions

Junction table linking configs to their selected questions with ordering.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| config_id | UUID, FK -> interview_configs | ON DELETE CASCADE |
| question_id | UUID, FK -> interview_question_bank | |
| sort_order | INTEGER | Display order for interviewers |

Index: (config_id, sort_order)

#### interview_sessions

One per interviewer per interview config. Tracks the interviewer's progress.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| config_id | UUID, FK -> interview_configs | ON DELETE CASCADE |
| interviewer_id | UUID, FK -> users | |
| status | TEXT | "assigned", "in_progress", "submitted" |
| notified_at | TIMESTAMPTZ | When email was sent |
| started_at | TIMESTAMPTZ | When interviewer first opened it |
| submitted_at | TIMESTAMPTZ | When they finalised |

Index: (config_id), (interviewer_id)

#### interview_scores

Individual question scores from each interviewer.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| session_id | UUID, FK -> interview_sessions | ON DELETE CASCADE |
| question_id | UUID, FK -> interview_question_bank | |
| score | INTEGER | 1-5, CHECK constraint |
| notes | TEXT, nullable | Interviewer's notes for this question |
| scored_at | TIMESTAMPTZ | |

Index: (session_id, question_id) UNIQUE

#### interview_decisions

Formal decision record per interview config.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| config_id | UUID, FK -> interview_configs | UNIQUE |
| decision | TEXT | "advance", "reject", "hold" |
| decided_by | UUID, FK -> users | |
| notes | TEXT | Required rationale |
| decided_at | TIMESTAMPTZ | |

### Relationship to Existing Tables

- `interview_question_bank.client_id` -> `clients.id` (questions scoped per client)
- `interview_configs.candidate_id` -> `candidates.id` (interview for a specific candidate)
- `interview_configs.position_id` -> `hiring_positions.id` (linked to the role)
- `interview_sessions.interviewer_id` -> `users.id` (interviewers must have accounts)
- All FKs use ON DELETE CASCADE from configs down, ON DELETE SET NULL from clients/candidates

## Workflows

### Workflow 1: HM Configures an Interview

1. **Trigger:** HM opens a candidate card in the hiring kanban (candidate in "interviews" stage). Clicks "Configure Interview" button.
2. **Question generation:** If no questions exist in the bank for this client + discipline combination, the system offers to generate from the JD.
   - Server calls Claude API with: JD text, client name, discipline, 5 category definitions, seniority level
   - Generates ~25 questions across the 5 categories
   - Depth questions tailored to discipline (code for engineers, art style for artists, narrative for writers)
   - Questions saved to `interview_question_bank` tagged `source: ai_generated`
   - Generation is explicit (HM triggers it), never automatic
3. **Question picker GUI:** HM sees all available questions for this client/discipline, grouped by category. Can:
   - Check/uncheck to include
   - Drag to reorder
   - Add custom questions inline (saved to bank with `source: custom`)
   - Filter by category
   - See running count ("18/25 selected")
   - Regenerate suggestions (adds new questions, doesn't replace existing)
4. **Assign interviewers:** HM selects users from the team. Multiple interviewers per candidate supported.
5. **Activate:** HM clicks "Send Interviews". System:
   - Creates `interview_configs` record (status: active)
   - Creates `interview_config_questions` rows with sort order
   - Creates `interview_sessions` per interviewer (status: assigned)
   - Sends email to each interviewer with direct session link
   - Updates candidate's `stage_assignees` to include interviewers

**Reuse path:** For subsequent candidates in the same position, the system offers to clone the previous config's question selection.

### Workflow 2: Interviewer Conducts Interview

1. **Notification:** Email sent via existing `sendEmailAsync` + Microsoft Graph. Contains: candidate name, role, question count, direct link (`/interview/session/{session_id}`), HM name.
2. **Focused interview view:** Clean, distraction-free screen. No kanban, no sidebar. Shows:
   - Header: candidate name, role, client
   - Category progress bars (5 bars showing completion per category)
   - Current question with category badge and question number
   - Score input: 5 buttons labelled 1 (Poor) through 5 (Excellent)
   - Notes textarea (optional per question)
   - Navigation: Previous / Next / Skip
   - Dot navigation showing scored (teal) vs pending (grey)
3. **Scoring behaviour:**
   - Score in any order (skip and return)
   - Auto-save every field change (no lost work)
   - Session status -> "in_progress" on first interaction
   - Can close and resume later (progress persisted)
   - Can revise any score before submission
4. **Submission:** "Submit Interview" enabled when all questions scored. On submit:
   - Session status -> "submitted"
   - Scores become immutable
   - `submitted_at` timestamp recorded
   - Email sent to HM (or "all scorecards in" email if this was the last)

### Workflow 3: HM Reviews Results and Decides

1. **Access:** Same "Interview" button on candidate card, now shows results.
2. **Summary panel:** Overall average score, submission status ("3 of 3 submitted"), per-category horizontal bar charts with averages.
3. **Scorecard comparison table:**
   - Rows = questions grouped by category
   - Columns = interviewers
   - Cells = colour-coded scores (green 4-5, amber 3, red 1-2) + notes icon
   - Click cell to read interviewer's notes
   - Category subtotals per interviewer
4. **Divergence flagging:** Questions where interviewer scores differ by 3+ points are highlighted with a "DIVERGENT" badge. These are discussion points.
5. **Decision:** Three buttons at bottom:
   - **Advance** -> moves candidate to "offer" stage in kanban
   - **Hold** -> keeps in "interviews" with a note
   - **Reject** -> archives candidate
   - Notes field required for all decisions
   - Creates `interview_decisions` record (full audit trail)

## API Endpoints

All endpoints require `requireNBI` authentication.

### Question Bank

| Method | Path | Description |
|---|---|---|
| GET | /api/interview-questions?client_id=&discipline= | List questions, filtered |
| POST | /api/interview-questions | Create a question manually |
| PATCH | /api/interview-questions/:id | Edit question text/category |
| DELETE | /api/interview-questions/:id | Remove from bank (requireAdmin) |
| POST | /api/interview-questions/generate | AI-generate questions from JD |

### Interview Configs

| Method | Path | Description |
|---|---|---|
| GET | /api/interview-configs?candidate_id= | Get config for a candidate |
| POST | /api/interview-configs | Create config (questions + interviewers) |
| PATCH | /api/interview-configs/:id | Update config (draft only) |
| POST | /api/interview-configs/:id/activate | Activate and notify interviewers |
| POST | /api/interview-configs/:id/clone | Clone config for a new candidate |

### Interview Sessions

| Method | Path | Description |
|---|---|---|
| GET | /api/interview-sessions/:id | Get session with questions (interviewer's view) |
| GET | /api/interview-sessions/mine | List sessions assigned to current user |
| PATCH | /api/interview-sessions/:id | Update status (in_progress) |
| POST | /api/interview-sessions/:id/submit | Submit completed scorecard |

### Scores

| Method | Path | Description |
|---|---|---|
| PUT | /api/interview-scores/:session_id/:question_id | Upsert a score + notes (auto-save) |
| GET | /api/interview-scores/:session_id | All scores for a session |

### Results & Decisions

| Method | Path | Description |
|---|---|---|
| GET | /api/interview-results/:config_id | Aggregated results (HM/admin only) |
| POST | /api/interview-decisions | Record decision (advance/hold/reject) |

## Email Notifications

Three email types, all using existing `sendEmailAsync` + `buildEmailHtml`:

1. **Interview Assigned** (to interviewer)
   - Subject: "Interview assigned: {candidate_name} - {role}"
   - Body: candidate name, role, client, question count, direct link, HM name
   - Triggered by: config activation

2. **Scorecard Submitted** (to HM)
   - Subject: "{interviewer_name} submitted scorecard for {candidate_name}"
   - Body: interviewer name, candidate name, link to results
   - Triggered by: session submission (when other sessions still pending)

3. **All Scorecards In** (to HM)
   - Subject: "All interviews complete for {candidate_name} - ready for decision"
   - Body: candidate name, interviewer count, overall average, link to results
   - Triggered by: final session submission

## UI Components

### Focused Interview Mode

Full-page view at `/interview/session/{session_id}`. Launched from candidate card or email link. Dark theme matching WorkSage. Responsive for tablet use.

- Header bar: candidate info + progress count + "Save & Exit"
- Category progress bars (5 horizontal bars)
- Question display: category badge, question number, question text (20px)
- Score buttons: 5 labelled buttons (1-5), selected state highlighted
- Notes textarea: optional, auto-saves
- Navigation: Previous / Skip / Next + dot indicator
- Submit button: enabled when all questions scored

### HM Question Picker

Modal or panel within candidate detail. Two tabs: Questions | Interviewers.

**Questions tab:**
- Filter chips: All, Culture, Technical, Collaboration, Leadership, Depth
- "+ Add Custom Question" button
- Question list grouped by category with:
  - Checkbox (selected/unselected)
  - Question text
  - Source tag (ai_generated / custom)
  - Drag handle for reorder
  - Per-category count
- Running total in header ("18/25 selected")
- Bottom bar: "Regenerate Suggestions" + "Next: Assign Interviewers"

**Interviewers tab:**
- User picker (searchable list of team members with accounts)
- Selected interviewers with remove button
- "Send Interviews" activation button

### Results Aggregation View

Accessed from candidate card when interview config exists and has submissions.

- Summary: overall average (large number), submission status badge
- Category bar chart: 5 horizontal bars with averages
- Comparison table: questions (rows) x interviewers (columns)
  - Colour-coded score cells (green/amber/red)
  - Notes icon on cells with notes (click to expand)
  - "DIVERGENT" badge on high-variance questions (3+ point spread)
  - Category headers and subtotals
- Decision bar: Advance / Hold / Reject buttons + required notes field

## AI Question Generation

### Prompt Design

The generation endpoint calls Claude API with structured context:

- **JD text** from the `hiring_positions.description` field
- **Client context:** client name, industry (gaming), working model (e.g. "fully remote")
- **Discipline:** maps to the depth_type for role-specific questions
- **Seniority level:** extracted from JD or position title
- **Category definitions:**
  - Culture: values alignment, working style, remote collaboration habits
  - Technical: domain knowledge, tools, methodologies
  - Collaboration: teamwork, communication, conflict resolution
  - Leadership: initiative, mentoring, decision-making (scaled to seniority)
  - Depth: discipline-specific mastery questions (code architecture, art direction, narrative craft, etc.)

### Quality Requirements

Questions must be:
- Specific to the role, client, and discipline (no generic "tell me about a time")
- Probing for demonstrable competency, not self-assessment
- Calibrated to seniority (junior vs senior vs lead)
- Relevant to the client's context (remote studio, specific tools, team structure)

### Depth Type Mapping

| Discipline | Depth Type | Question Focus |
|---|---|---|
| Engineering | code | Architecture, algorithms, debugging, code review, system design |
| Art | art_style | Visual direction, pipeline, style adaptation, technical art |
| Narrative/Writing | narrative | Story structure, world-building, dialogue, editorial process |
| Game Design | code (hybrid) | Systems design, player psychology, balance, prototyping |
| QA | code (process) | Test strategy, automation, regression, pipeline integration |
| Production | process | Scheduling, risk management, stakeholder communication |
| Audio | art_style (technical) | Sound design, implementation, middleware, mix process |
| HR/People | process | Policy, employee relations, compliance, culture building |
| Leadership | leadership | Vision, team building, cross-functional collaboration, strategy |

## Couch Heroes Initial Seed

Generate question banks for all 9 disciplines listed above, scoped to `client_id` = Couch Heroes. Each discipline gets ~25 AI-generated questions across the 5 categories, informed by:

- Couch Heroes is a ~55-person fully remote game studio (UK + Greece)
- The questions should reflect their specific operating context
- Depth questions should be genuinely role-specific, not generic

This seed runs once during implementation. Future roles use the same generation flow triggered by the HM.

## Permissions

| Action | Who |
|---|---|
| Generate questions | HM, HR, Admin |
| Curate question bank | HM, HR, Admin |
| Configure interview (pick questions, assign interviewers) | HM, HR, Admin |
| Conduct interview (score + notes) | Assigned interviewers |
| View own scorecard | Assigned interviewers |
| View all scorecards + aggregated results | HM, HR, Admin |
| Make decision (advance/hold/reject) | HM, HR, Admin |
| Delete questions from bank | Admin only |

## Testing Strategy

- **Unit tests:** API endpoints (CRUD for all new tables, permission checks, score validation 1-5)
- **Integration tests:** Full workflow (create config -> assign -> score -> submit -> aggregate -> decide)
- **E2E tests (Playwright):** Interview mode navigation, scoring, submission, results view
- **Edge cases:** Partial submissions, browser crash recovery (auto-save), concurrent scoring, deleted interviewer mid-interview

## Edge Cases

- **Deactivated interviewer mid-interview:** If an interviewer's account is deactivated after assignment but before submission, their session remains in "assigned" status. The HM can remove them from the config and proceed with remaining interviewers. The "all scorecards in" notification fires based on remaining active sessions only.
- **Candidate moved out of interviews stage:** If the candidate is dragged out of the "interviews" kanban column before all scorecards are in, the interview config remains accessible but a warning banner shows on the results view ("Candidate has been moved to {stage}").
- **Configure Interview button logic:** The button appears on candidate cards only in the "interviews" stage. Shows "Configure Interview" when no config exists, "View Interview" when a config is active, and "Interview Results" when the config is completed.
- **No JD uploaded:** If the hiring position has no description, the AI generation option is disabled with a message: "Upload a job description to the position to generate questions." The HM can still add custom questions manually.

## Migration Plan

Single migration file: `dashboard-server/migrations/NNN_interview_tool.sql`
Creates all 6 tables with indices, constraints, and FK relationships.
