# Intelligence Brief -- 2026-06-24

_Updated: 07:00 morning cadence run._

## What's New

Since the 2026-06-23 21:30 cadence run:

**Two outstanding brain items resolved (Glen decisions, 2026-06-24 session):**
- **WorkSage/PlaySage vocabulary confirmed:** WorkSage = current state of the codebase; PlaySage = the destination macro product suite. Same codebase, different labels for current vs future state. Brain/nbi_hub.md updated; incorrect "NOT PlaySage" critical note removed.
- **Riley Graebner dual role confirmed:** Same person at Saybrook Legal (CH fractional GC) AND Magna Capital (investor contact). people_directory.md updated; brain_delta 2026-06-23 entry marked RESOLVED.

**Code commits since last brief (3):**
- `bafced0` -- fix(sync): clear _serverUpdatedAt on conflict to prevent false echo-skip
- `a15b5ee` -- docs: update session logs with test fix details and Codex review
- `835273c` -- docs(brain): resolve WorkSage/PlaySage relationship + Riley Graebner dual role

**Unresolved code audit finding (046530d `fix(tests)`):** Baseline fixture records 72 schema_migration rows but repo has 71 numeric migration files -- `072_seed_interview_questions.sql` missing from count. nbi-init.js self-echo suppression has a real-conflict edge case when the server returns a conflict response and updates `_serverUpdatedAt`. Neither finding was actioned in the last session.

No bank compilations or new Granola extracts since 2026-06-23 19:00.

## WorkSage Health

**UP** -- localhost:8888 returned HTTP 200 at 07:00 (verified this run).

Pre-existing dirty surfaces: dashboard-server/public/js/nbi-api.js and nbi-init.js (Glen's uncommitted frontend changes from a separate CLI session). 5 snapshot commits outstanding; push gate blocked until Glen squashes them.

## Pipeline Pulse

Source: NBI_Brain.md Section 6. Reference date: 2026-06-24.

| Lead | Company | Last Contact | Days Since | Status |
|---|---|---|---|---|
| Jen MacLean | Dragon Snacks Games | 19 March 2026 | 97 days | **OVERDUE** |
| Mike Palan | Enoma Capital | ~March 2026 (GDC) | ~97 days | **OVERDUE** |
| James Clark | Creative Assembly | Not recorded | -- | UNKNOWN |
| James Dabrowski | Jagex | Not recorded | -- | UNKNOWN |
| Jakub Rabinski | CD Projekt Red | Not recorded | -- | UNKNOWN |

Jen MacLean's two unanswered emails from 19 March cover NBI referral positioning and the Farhaven seed round ($4M target, $500K committed from 1Up Fund contingent on a lead investor). Jakub at CDPR is pursuing legacy IP (Witcher 3 DLC co-dev) not new live service -- pitch framing should adjust. Both gaming GDC leads are going cold.

HC pipeline (Tom Rieger, from personal_insights bank): Tulane (~$150K/2mo), Sony ($76K/4mo, scalable to $700K+), DoD/Pentagon (~80% probability), SEC, AI Readiness Practice, WorkSage SaaS prospect ($60K add-on). Not yet in Brain Section 6.

## Brain Delta

`brain_delta.md` last appended 2026-06-23. Two items resolved 2026-06-24 (Riley Graebner, WorkSage/PlaySage). Remaining open items from 2026-06-11 through 2026-06-23:

**High priority -- straightforward corrections:**
- **Dino role**: COO departing, not "General Counsel" -- incorrect label persists in clients_detailed.md and people_directory.md
- **CH revenue**: GBP 360K/year (bank, May 2026 actuals) vs GBP 300K/year (Brain contracted figure)
- **CH headcount**: ~70 employees (bank, May 2026) vs ~55 (Brain)
- **Glen's CH title**: "Fractional CPO" (bank, May 2026) vs "Fractional C-level" (Brain)
- **Lorenza Menna**: Full name correction needed in NBI_Brain.md, clients_detailed.md, people_directory.md

**Pending Glen review (restricted):** 21+ CH restricted extracts (HR decisions and CTO pipeline, June 12-23). Most time-sensitive: June 22-23 batch (Dino termination, Ella, Charlie final payment, Kyron, Matt FTE decision, Daniel onboarding, CTO candidate assessments with salary expectations).

## Today's Context

Wednesday 24 June 2026. Active work streams:

- **Couch Heroes**: VDR prep (6 sections, 3 investor docs), combat critical path (Nadir, 13 months to VS-ready), CTO hire (Chris Southall leading), Greece leadership workshop (July). Dino's September fundraise-readiness horizon. VS = institutional Series B prerequisite confirmed externally.
- **Saybrook Legal (Riley Graebner)**: GBP 1,500/month + variable. Series B in scope.
- **NBI BD**: GDC gaming leads 97 days OVERDUE. HC pipeline review with Tom needed.
- **WorkSage code**: Two unresolved findings from 046530d audit (migration count discrepancy, nbi-init.js edge case).
- **Sarge Universe**: UK Games Fund up to £100K (expressions of interest open) is the recommended pre-VS non-dilutive first step before VC approach.
- **GTA 6**: Pre-orders open today (25 June) -- capture commercial scale data for forecast_models when volume figures emerge.

Most relevant banks: `client_couch_heroes` (88 extracts, 2026-06-18), `games_pitch_decks` (29 extracts, 2026-06-23), `personal_insights` (23 extracts, 2026-06-23).

## Pipeline Health

- All 7 banks current. Five compiled 2026-06-23; client_couch_heroes compiled 2026-06-18; forecast_models compiled 2026-06-17.
- Below threshold: client_couch_heroes (+2 new since 2026-06-18), forecast_models (0 new since 2026-06-17)
- Restricted extracts pending Glen review: 21+ items (June 12-23 CH HR and CTO pipeline)
- Granola: last ingest 2026-06-23 19:00. Gmail/Slack: blocked (connectors not credentialed)
- Web research: last run 2026-06-22
- Unregistered banks (5): competitor_watch, consulting_frameworks, investor_database, salary_benchmarks, studio_staffing_models -- not assessed by cadence. games_design has 4 new extracts pending Glen's approval to create

## Actions Needed

1. **Jen MacLean and Mike Palan: 97 days OVERDUE.** Reply this week or archive.
2. **WorkSage code audit findings (046530d):** Migration count discrepancy and nbi-init.js self-echo edge case -- both unresolved. Flag for next coding session.
3. **Brain delta adjudication**: Dino role, CH revenue, headcount, Glen's title, Lorenza surname -- all verifiable corrections, no ambiguity.
4. **Restricted extract review**: June 22-23 HR and CTO decisions most time-sensitive.
5. **Squash 5 snapshot commits** before pushing (5 commits: ce60030, 23ffe82, 7f8a286, 4911408, 188752d).
6. **Unregistered banks**: Register or archive the 5 unregistered banks.
7. **Sarge Universe / Steve Green**: Surface UK Games Fund (up to £100K, open now) as the pre-VS first step.
