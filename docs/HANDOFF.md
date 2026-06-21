# Handoff -- 2026-06-21 Interview Question Bank Rework

## Session Summary

Fixed the 55 failed SQL updates from the Jun 19 rework pass (all 692 now applied). Ran dual Claude+Codex critique across all 1,390 questions. Claude inflated scores (avg 7.82, 90% KEEP) -- third time this happened. Codex (GPT-5.5, Jun 19 scores) was the reality check (avg 6.94, 61% KEEP). Glen directed: Codex is the authority standard, rework all REWORK questions to 8+ with both scorers agreeing. Deleted 8 CUT questions. 536 REWORK questions remain across 8 disciplines.

## What Was Done This Session

### 1. SQL Fix Pass
- All 692 rework SQL UPDATEs from Jun 19 are now applied
- 684 were already correct, 8 newly applied (3 Art, 3 HR-People, 1 Art_batch2, 1 QA)
- 3 HR-People questions had longer/better text in DB from a later pass -- left as-is
- Script: `dashboard-server/scripts/fix-rework-questions.js`

### 2. Claude Scoring Pass (Fresh, Today)
- 10 agents scored 1,388 of 1,390 questions (2 Art + 1 Game Design missing)
- Files: `d:\tmp\question_review\claude_scores_*.md` (10 files including Art split into 3 batches + 3a/3b splits)
- Result: avg 7.82, 1,246 KEEP (90%), 141 REWORK, 1 CUT -- INFLATED, rejected by Glen

### 3. Codex Scoring Pass (Jun 19, Valid)
- Already existed at `d:\tmp\codex_scores_*.md` (8 files, 1,389 questions)
- These were scored by GPT-5.5 after the original rework SQL was applied
- Result: avg 6.94, 845 KEEP (61%), 536 REWORK, 8 CUT -- THIS IS THE AUTHORITY STANDARD

### 4. Comparison
- Agreement rate: 51.5% (714 agree, 673 disagree on verdict)
- 664 cases: Claude says KEEP, Codex says REWORK
- 9 cases: Claude says KEEP, Codex says CUT
- Report: `d:\tmp\question_review\SCORE_COMPARISON.md`

### 5. CUT Deletions
- 8 questions deleted from `interview_question_bank` table
- Art: 2c5c510b, a71dff09, 761cd428, 963b25ac
- Audio: e66f5e8f, 5b01089b, a61a6cef
- Engineering: 8babfaf9
- DB now has 1,445 questions (was 1,390 at start -- other sessions may have added questions)

## Completed -- HR/People (11 REWORK -> 11 KEEP at 8+)

All 11 HR/People REWORK questions rewritten and Codex-verified at 8+. Two rounds needed:
- Round 1: 7 scored 8+, 4 scored 6-7
- Round 2: remaining 4 rewritten with sharper employment-law and operational constraints, all scored 8-9

Scripts used: `scripts/rework-hr-people.js` (round 1), `scripts/rework-hr-round2.js` (round 2)
Codex outputs: `d:\tmp\question_review\codex_verify_HR_People.md`, `codex_verify_HR_People_r2.md`

## What Remains -- 525 REWORK Questions

Glen's directive: batch by discipline, rework each question to 8+ on Codex standard, get both Claude and Codex to agree at 8+. Do not ask permission, just do the work.

### REWORK counts by discipline (smallest first)

| Discipline | REWORK | KEEP | Total | Codex Avg |
|---|---|---|---|---|
| ~~HR/People~~ | ~~11~~ DONE | 50 | 50 | 8+ verified |
| QA | 20 | 30 | 50 | 6.96 |
| Audio | 28 | 69 | 97* | 7.22 |
| Leadership | 28 | 72 | 100 | 7.57 |
| Production | 62 | 128 | 190 | 6.97 |
| Engineering | 68 | 181 | 249* | 7.43 |
| Game Design | 96 | 103 | 199 | 6.96 |
| Art | 223 | 223 | 446* | 6.41 |
| **TOTAL** | **536** | **845** | **1,381** | **6.94** |

*Totals adjusted for deleted CUT questions

### Proven process (tested on HR/People)

1. Read `d:\tmp\codex_scores_{discipline}.md` -- extract REWORK IDs and Codex reasons
2. Run `node scripts/extract-rework-questions.js id1 id2 ...` to get current text from DB
3. Write a `scripts/rework-{discipline}.js` script with parameterised query rewrites (see rework-hr-people.js as template)
4. Run the script to apply rewrites
5. Extract reworked questions: `node scripts/extract-rework-questions.js id1 id2 ... > d:\tmp\question_review\{disc}_reworked.md`
6. Codex verify: `echo "" | codex exec "Read d:\tmp\codex_scoring_prompt.md for rubric. Read [file]. Score all N questions. Write to [output]. Be harsh."`
7. If any score below 8, iterate (round 2 script)
8. Update session log after each discipline

### CRITICAL: Codex stdin fix

Codex hangs on "Reading additional input from stdin..." in non-TTY environments. The fix is to pipe empty stdin:
```powershell
echo "" | codex exec "..."
```
Without the `echo "" |` prefix, Codex will hang forever and the process must be killed manually. Do NOT run `codex exec` without this prefix. Do NOT run Codex as a background task -- it fails with exit 255.

### Codex prompt length

Short prompts work. Long inline prompts (>500 chars) cause failures. Reference files in the prompt, do not embed question text.

## Key File Locations

| What | Where |
|---|---|
| Question bank DB table | `interview_question_bank` (PostgreSQL via DATABASE_URL in .env) |
| Codex authority scores | `d:\tmp\codex_scores_*.md` (8 files, Jun 19) |
| Claude scores (inflated, reference only) | `d:\tmp\question_review\claude_scores_*.md` |
| Score comparison report | `d:\tmp\question_review\SCORE_COMPARISON.md` |
| Scoring rubric | `d:\tmp\codex_scoring_prompt.md` |
| Extracted questions from DB | `d:\tmp\question_review\questions_*.md` (8 files) |
| Fix script template | `dashboard-server/scripts/fix-rework-questions.js` |
| Comparison script | `dashboard-server/scripts/compare-scores.js` |
| Codex verdict summary script | `dashboard-server/scripts/codex-verdict-summary.js` |
| Session log | `projects/nbi_dashboard/session_logs/2026-06-21_session.md` |

## Harness Interventions Logged

1. Claude inflated scores for third time despite explicit harsh rubric (rejection)
2. Asked Glen what to do with 536 REWORK questions instead of just doing the work (redirect)

## Resume Sequence

1. Read this handoff
2. HR/People is DONE (11/11 at 8+)
3. Start with QA (20 REWORK) -- extract IDs from `d:\tmp\codex_scores_QA.md`, follow proven process above
4. Then Audio (28), Leadership (28), Production (62), Engineering (68), Game Design (96), Art (223)
5. Handoff at 30% context between discipline batches
6. Remember: `echo "" |` before every `codex exec` command or it hangs

## Decision: Codex is Authority Scorer

Glen's directive (2026-06-21): Claude's scoring is systematically inflated and not to be trusted for quality evaluation. Codex (GPT-5.5) is the authority scorer. All questions must meet Codex 8+ standard. This is not a suggestion.
