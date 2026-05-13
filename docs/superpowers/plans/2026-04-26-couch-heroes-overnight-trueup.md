# Couch Heroes Backlog — Overnight True-Up & Spec Rewrite Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, since this is solo overnight work — no Glen review checkpoints possible until morning).

**Goal:** With Q1-Q13 answered, do everything possible to advance the Couch Heroes backlog consolidation overnight: gather missing data, rewrite the spec, true up every CSV item against Granola intel, build a WorkSage import Excel for 6 of 7 projects, and hand off cleanly.

**Architecture:** Five phases — Reconnaissance → Spec Rewrite → True-Up → Excel Build → Handoff. Each phase produces a concrete artifact on disk. Context budget is the binding constraint: stop and handoff at 75% even if mid-phase.

**Tech Stack:** Filesystem (Glob/Read/Grep), Granola MCP, openpyxl (xlsx skill), python-docx fallbacks for the Word doc.

---

## Hard Constraints (re-stated for the agent reading this overnight)

- **No live WorkSage API insertion.** Build Excel only. Glen approves before insertion.
- **No fabrication.** If Granola has no intel on an item, mark its status `Unknown — needs Glen` and move on. Never guess.
- **Context budget:** at ~75% context, stop the current task, write to `docs/HANDOFF.md`, and exit cleanly.
- **British English. No em dashes. No timelines in deliverables.**
- **Never let the system auto-compact.** Hand off first.

---

## Phase 1: Reconnaissance

Goal: Resolve as many open data gaps as possible before touching the spec.

### Task 1.1: Locate CTO question set
**Files:** Search across `D:\OneDrive\` and `C:\Users\gpbea\Downloads\`.

- [ ] **Step 1:** Glob for likely names — patterns to try in order:
  - `**/*CTO*question*.{docx,md,txt,xlsx}`
  - `**/*CTO*interview*.{docx,md,txt,xlsx}`
  - `**/*CTO*scorecard*.{docx,md,txt,xlsx}`
  - `**/*Couch*Heroes*CTO*`
- [ ] **Step 2:** If found, copy to `Clients/Couch Heroes/CTO_question_set_<source>.<ext>` and note the path. If not found, log "not located on disk" — Glen will provide.
- [ ] **Step 3:** Add a note to the running action-items list either way.

### Task 1.2: Locate Lead Animator question set
**Files:** Same search scope as 1.1.

- [ ] **Step 1:** Glob:
  - `**/*Lead*Animator*question*.{docx,md,txt,xlsx}`
  - `**/*Animator*interview*.{docx,md,txt,xlsx}`
  - `**/*Alon*` (in case it's filed under his name)
- [ ] **Step 2:** Copy to `Clients/Couch Heroes/Lead_Animator_question_set_<source>.<ext>` if found. Log result.

### Task 1.3: Re-attempt Word doc extraction
**Files:**
- Source: `Clients/Couch Heroes/CH_Guidance_Setting_Up_UK_Company_FINAL.docx`
- Output: `Clients/Couch Heroes/CH_Guidance_extracted.md`

- [ ] **Step 1:** Try the `anthropic-skills:docx` skill first (it's loaded).
- [ ] **Step 2:** If that fails, try Python `python-docx` via Bash: `python -c "from docx import Document; d=Document('path'); print('\n'.join(p.text for p in d.paragraphs))"`.
- [ ] **Step 3:** If still empty, try unzipping: docx is a zip, `document.xml` lives inside. Bash: `unzip -p "path" word/document.xml > raw.xml` then strip XML tags.
- [ ] **Step 4:** Save extracted text to the output path. Log how many paragraphs/sections found.

### Task 1.4: Re-query Granola for missing topics
**Files:** No file output — just gather intel for the true-up phase.

- [ ] **Step 1:** Try queries that timed out last session:
  - "JIRA implementation methodology Agilefall production"
  - "Hiring candidate names interview status April 2026"
  - "Game design gaps PVP guild trading day night"
  - "Studio Operations finance fundraising Alter Ego Picks Capital Enoma Madrona"
- [ ] **Step 2:** For any returning meeting IDs, fetch the transcript and extract relevant facts.
- [ ] **Step 3:** Record raw findings to `projects/nbi_dashboard/session_logs/2026-04-26_session_couch_heroes_q1_q13.md` under a "Granola overnight findings" section. Don't lose the data.

### Task 1.5: Check live WorkSage for existing CH records
**Files:** No file output — informational.

- [ ] **Step 1:** Bash: `curl -s http://localhost:8888/api/work-items | jq '.[] | select(.client_id // .practice_area // .title | test("Couch"; "i"))'` (or equivalent — first inspect the actual server endpoint).
- [ ] **Step 2:** If the server isn't running, skip — note in handoff.
- [ ] **Step 3:** Log any existing CH items so the Excel doesn't duplicate them.

---

## Phase 2: Spec Rewrite

### Task 2.1: Read the current spec
**Files:** `docs/superpowers/specs/2026-04-24-couch-heroes-backlog-consolidation.md`

- [ ] **Step 1:** Read it. Identify the sections that need replacement vs. preservation.

### Task 2.2: Rewrite the spec
**Files:** Same path — Edit (not Write — preserve any sections still good).

The rewrite must include:
- [ ] **Final 7+AI structure** (from HANDOFF.md), with Glen's confirmations folded in
- [ ] **Q1-Q13 answers** as decisions in a "Decisions" section, each citing the Q number and the chosen option
- [ ] **New work items surfaced by the Q&A** (CTO restart + question set + scorecard, Lead Animator question set, Lili Zhao COS hire, Org structure attachment pending, Miro export task)
- [ ] **References list** for HR Ops candidates (Slack channel + Google Sheet URLs)
- [ ] **Pending inputs** section: what's still owed by Glen (Miro screenshot, Miro CSV)
- [ ] **Out of scope:** SOW admin (moved to NBI), Gamescom (killed), AMA (closed), Salary Review Delivery (closed)

---

## Phase 3: True-Up

This is the heaviest phase. Process project by project.

### Task 3.1: Build the master inventory
**Files:** Create `Clients/Couch Heroes/_trueup_inventory.md`

- [ ] **Step 1:** Read every row of `Glen_work_list_v10.csv`.
- [ ] **Step 2:** For each row, write a line: `| Row N | Title | Original feature | Original status | Mapped to project | Mapped to feature | New status | Reason |`
- [ ] **Step 3:** Mapping rules apply Glen's Q&A answers (e.g., Coaching → HR → Coaching Programme; SOW → REMOVED).

### Task 3.2: True-up by project
For each of the 7 projects in turn, create a section in `_trueup_inventory.md`:

- [ ] **Studio Operations** — finance, fundraising, IT, legal items
- [ ] **HR** — hiring (30 roles), pay & performance, coaching, 1:1s, culture, staff changes (Dino exit, Rafael, Mustafa, Robin)
- [ ] **UK Company Setup** — all 5 phases + Red Team + Compliance Timeline
- [ ] **Production Strategy & Implementation** — JIRA, Agilefall, Gates, Roadmap, Offsite (Apr 27-30, 4 days)
- [ ] **Game** — placeholder only (Miro export pending)
- [ ] **Studio Business** — GTM, BD, PR, Community, Website
- [ ] **AI** — usage policy, tool selection, training, integration, IP

For each item, cross-reference Granola findings from Phase 1. Update status. Where uncertain, mark `Unknown — needs Glen` and list it in a "Needs Glen" section.

### Task 3.3: Surface duplicates and merges
**Files:** Append to `_trueup_inventory.md`

- [ ] **Step 1:** Walk the inventory looking for items that appear under multiple features (e.g., a hiring task that's both in EP Hiring and in HR).
- [ ] **Step 2:** Propose a single canonical home. Note the merge in the inventory.
- [ ] **Step 3:** No item should appear twice in the final Excel.

---

## Phase 4: Excel Build

### Task 4.1: Build the WorkSage import workbook
**Files:** Create `Clients/Couch Heroes/CH_WorkSage_import_v1.xlsx`

Schema (one sheet per project, plus a master sheet):
- Columns: `parent_path` (e.g., `Couch Heroes / HR / Hiring Pipeline`), `title`, `description`, `status`, `priority`, `health_state`, `work_type`, `assignees`, `due_date`, `dependencies`, `practice_area`, `notes`

- [ ] **Step 1:** Use the `anthropic-skills:xlsx` skill to create the workbook.
- [ ] **Step 2:** One sheet per project (6 sheets, Game gets a stub).
- [ ] **Step 3:** Master sheet aggregates all rows for ease of import.
- [ ] **Step 4:** Validate: every row has at least `parent_path`, `title`, `status`. Flag rows missing fields in a `_validation` sheet.

### Task 4.2: Self-review the Excel
- [ ] **Step 1:** Re-open the workbook, count rows per project, verify totals match the inventory.
- [ ] **Step 2:** Spot-check 10 random rows against the source CSV.
- [ ] **Step 3:** Confirm no SOW admin row, no Gamescom row, no duplicate hires.

---

## Phase 5: Handoff

### Task 5.1: Refresh HANDOFF.md
**Files:** `docs/HANDOFF.md` — overwrite with a fresh state.

- [ ] **Step 1:** Sections: What was done overnight, Artifacts produced (paths), What still needs Glen, Recommended next session steps, Context budget remaining.
- [ ] **Step 2:** Be specific about the "Needs Glen" list — every uncertain item from Phase 3.

### Task 5.2: Update session log + live state
**Files:**
- `projects/nbi_dashboard/session_logs/2026-04-26_session_couch_heroes_q1_q13.md` — append overnight progress
- `projects/nbi_dashboard/live_state/work_completed.md` — list deliverables
- `projects/nbi_dashboard/live_state/pending_tasks.md` — what's still pending

---

## Stop Conditions

Stop the loop and handoff IMMEDIATELY if any of these trigger:
- Context budget hits 75%
- A phase produces something unexpected that needs Glen's call
- An infinite-loop pattern (same query timing out 3x — give up, log it)
- Filesystem write failure that suggests a path or permission problem
