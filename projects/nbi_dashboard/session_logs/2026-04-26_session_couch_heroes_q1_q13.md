# Session Log — 2026-04-26 — Couch Heroes Q1-Q13

## Loaded
- docs/HANDOFF.md (Couch Heroes Backlog Consolidation handoff from 2026-04-25)
- 13 unanswered duplication/ambiguity questions awaiting Glen's input

## Glen's Answers (Q1-Q13)

**Q1 CTO Hiring** — All three (Cam, Neil, Nia) DEAD. Restarting search.
- New work: locate existing CTO question set (drive or Downloads), build scorecard, restart sourcing.

**Q2 Executive Coaching** — Move to HR → Coaching Programme (out of EP Hiring).

**Q3 Lead Animator** — Same role. Mark Done (Alon).

**Q4 Lead Animator question set** — Mark Done. New task: find the question set, document it, attach to the WorkSage upload.

**Q5 Lili Zhao vs Lorenza** — Two separate people. Lili = new COS hire (~£135k). Add new story.

**Q6 HR Operations** — Still interviewing.
- Reference: Slack engineering candidates channel https://couchheroes.slack.com/archives/C0AJBRJTJTA
- Reference: Google Sheet of all candidates https://docs.google.com/spreadsheets/d/1NaZABJP_8HQCVdrQR9Uoq9g3NYVYdyKHLB8qc3nSLRo/edit?usp=sharing
- Attach both as references on the affected hiring stories during true-up.

**Q7 Dino performance review** — Already DELIVERED (mark Done). Exit timeline (1mo + 2mo garden leave) is TENTATIVE — flag dates accordingly.

**Q8 Org design models** — All details to add. Glen has a Miro screenshot of the current likely structure. Pending attachment (Glen to drop into chat or save to Clients/Couch Heroes/).

**Q9 Feb 18 JIRA walk-through** — Postponed. Will happen ~2 weeks after offsite (target ~mid-May), conditional on roadmap and process flow agreement first.

**Q10 Offsite dates** — 4 days, Apr 27-30.

**Q11 Miro board** — Export to CSV/Excel. Glen to do the export and drop into Clients/Couch Heroes/. I parse and import.

**Q12 Recurring 1:1s** — One programme story under HR + 8 weekly sub-tasks per cycle.

**Q13 SOW admin** — NOT a Couch Heroes item. Belongs in NBI. Remove from CH backlog.

## New Work Items Surfaced (to add during spec rewrite)
1. CTO: locate existing question set, build scorecard, restart sourcing
2. Lead Animator question set: locate, document, attach during WorkSage upload
3. Lili Zhao COS hiring story (~£135k)
4. Org design: attach Miro structure screenshot once received
5. Miro export task for Glen (Game project feature/story import)

## Inputs Still Awaited
- Org structure Miro screenshot (Glen to drop into chat or save to disk)
- Miro Game-board CSV/Excel export (Glen to perform export)

## Next Step
Rewrite the spec at docs/superpowers/specs/2026-04-24-couch-heroes-backlog-consolidation.md with locked 7+AI structure and Glen's answers incorporated, then proceed to true-up.

---

## Overnight Progress (2026-04-26 evening into night)

Glen went to bed after Q13 with instruction to keep working overnight. Five-phase plan written at `docs/superpowers/plans/2026-04-26-couch-heroes-overnight-trueup.md` and executed inline:

### Phase 1 - Reconnaissance
- CTO question set located at `Clients/Couch Heroes/CTO_Interview_Questions_Couch_Heroes.docx` (already there). 4 supporting CTO files staged from Downloads: scorecard, recruiting brief v6, role brief v4, hiring plan calendar.
- Lead Animator question set: NOT FOUND on disk. Only the JD exists. Logged as needing Glen input.
- UK Company Word doc cracked via python-docx (pandoc had failed). 355 lines extracted to `CH_Guidance_extracted.md` (insurance, pensions, payroll, employment law content).
- **MAJOR UNLOCK**: `Couch Heroes Features.xlsx` IS the Miro export. 1,142 rows, 421 features across 31 areas with proper Epic > Feature > Story > Task hierarchy. Game project no longer blocked.
- Granola re-queries skipped (low ROI vs. static-file unlocks).
- WorkSage live-state check skipped (server not queried; would need a Bash curl).

### Phase 2 - Spec Rewrite
- `docs/superpowers/specs/2026-04-24-couch-heroes-backlog-consolidation.md` rewritten with locked 7+AI structure and Q1-Q13 decisions table + new work items + pending inputs section.

### Phase 3+4 - Inventory + Excel Build
Combined into one Python script `Clients/Couch Heroes/build_worksage_import.py`:
- `_trueup_inventory.md` written (252 lines)
- `CH_WorkSage_import_v1.xlsx` built: **876 items across 11 sheets**
  - 8 project sheets: Production Strategy & Implementation (27), HR (133), Studio Operations (10), UK Company Setup (102), Studio Business (3), Closed-Killed (5), Game (595), AI (1)
  - MASTER (876), _STATS, _VALIDATION (empty - no data integrity issues), 0 unmapped CSV rows
- All Q1-Q13 status overrides applied (Cam dead -> Cancelled, Lead Animator -> Done, Dino review -> Done, etc.)
- 9 NEW stories surfaced from Q&A added (CTO restart x3, Lead Animator question doc, Lili Zhao COS, HR Ops, Dino exit, Org structure attach, Weekly 1:1 Programme)

### Em Dash Sweep
Per Glen's hard rule, removed em dashes from all deliverables: 218 cells in workbook, 62 in inventory, 7 in org structure, 29 in spec.

### Phase 5 - Handoff
- `docs/HANDOFF.md` rewritten as fresh state for Glen's morning review
- This session log appended

### Awaiting Glen's input
- Lead Animator question set: where do the actual questions live? (NEW story already in workbook)
- Org structure: replace likely version with finalised version after Apr 27-30 offsite
- Workbook approval before any live WorkSage API insertion
