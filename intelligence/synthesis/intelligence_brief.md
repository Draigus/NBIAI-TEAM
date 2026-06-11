# Intelligence Brief — 2026-06-11

Generated: morning cadence run (first local Task Scheduler delivery)

## What's New

All 7 banks fully rebuilt 2026-06-11 — resolves the 17-day backlog flagged in yesterday's brief.
Root cause fixed: cloud routines were firing on stale master with no write path; replaced with
local Windows Task Scheduler cadence (see decisions.md 2026-06-11).

Critical items surfaced by the rebuild:

- **CH Series B decision deadline: 19 June 2026 (8 days away)** — not in pending_actions [brain_delta]
- **CH game dev roadmap target: 12 June 2026 (tomorrow)** — may be passed; confirm with Vardis [brain_delta]
- **EU cancellation button regulation: 19 June 2026** — applies to CH subscription model [industry_current]
- **CH revenue actuals: GBP 30K/month (GBP 360K/year)** — Brain still shows GBP 300K contracted [brain_delta]
- **GBP 600K investor debt** (Bob, Brian + partners) — absent from financial_resilience.md entirely [brain_delta]
- **CH $5M round closed May 2026** — Series B at $10M target next; cap table full [brain_delta]
- **Alan/Alon (Head of Animation) termination decided** — backfill-first strategy in play [brain_delta]

Industry current gap: Summer Game Fest (5 June) and Xbox Showcase (7 June) not yet captured.
Bank breaches 7-day shelf life by 18 June without a web research run.

## Bank Suggestions Pending

5 awaiting Glen approval to create: consulting_frameworks, studio_staffing_models,
salary_benchmarks, investor_database, competitor_watch.

## Today's Context

Last session: CH hiring bands + interview plans for 5 roles delivered (awaiting Glen review before
Lorenza send). Cadence rearchitecture complete. Most relevant banks: client_couch_heroes,
production_methods, client_patterns.

## Pipeline Health

| Bank | Compiled | Status |
|---|---|---|
| client_couch_heroes | 2026-06-11 | Fresh |
| industry_current | 2026-06-11 | Fresh — SGF/Xbox gap, rerun web research by 18 June |
| client_patterns | 2026-06-11 | Fresh |
| forecast_models | 2026-06-11 | Fresh |
| production_methods | 2026-06-11 | Fresh |
| games_pitch_decks | 2026-06-11 | Fresh |
| personal_insights | 2026-06-11 | Fresh |

Ingestion blocked: gmail, slack (connectors not credentialed).
Pending restricted extracts: 10 (CTO + compensation; in raw/ unintegrated).

## Pipeline Pulse

| Lead | Last Contact | Days | Status |
|---|---|---|---|
| Jen MacLean (Dragon Snacks Games) | 19 Mar 2026 | ~84 | OVERDUE |
| Mike Palan (Enoma Capital) | GDC Mar 2026 | ~84 | OVERDUE |
| Jakub Rabinski (CD Projekt Red) | Unknown | — | AT RISK / UNKNOWN |
| James Clark (Creative Assembly) | Unknown | — | UNKNOWN |

Note: CDPR intelligence — Jakub's studio is in legacy IP mode (Witcher 3 DLC, not live-service).
Adjust approach framing before following up.

## WorkSage Health

**UP** — localhost:8888 returned 200.

## Brain Delta

brain_delta.md (2026-06-11): **8 discrepancies, 20 new facts, 6 stale Brain facts.**
Nothing applied — all await Glen review. Highest priority:
- CH contracted revenue: Brain GBP 300K → update to GBP 360K/year (actuals confirmed)
- Add GBP 600K investor debt to financial_resilience.md
- Correct "Lorenz" → "Lorenza Menna" across NBI_Brain.md, clients_detailed.md, people_directory.md
- Add 19 June Series B decision deadline to pending_actions.md
- Glen's role at CH: update "Fractional C-level" → "Fractional CPO"

Full detail: intelligence/synthesis/brain_delta.md

## Actions Needed

1. Review hiring bands doc before sending to Lorenza:
   Clients/Couch Heroes/hr_hiring/Hiring_Bands_and_Interview_Plans_2026-06-11.docx
2. Brain delta review — 8 discrepancies need confirmation before Brain files are updated
3. Jen MacLean (84 days unanswered) — she is offering NBI referrals to her exec/indie CEO network
4. Mike Palan / Enoma Capital (84 days since GDC) — no follow-up yet
5. CH Series B: 19 June decision deadline (8 days) — confirm Glen's involvement in framing
6. Schedule web research run for SGF + Xbox Showcase captures before 18 June
7. Credentials: provide Google OAuth or Azure creds to unblock email delivery + gmail/slack ingestion
