---
source: granola
source_id: not_9nQcKcphTysGNd
source_path: https://notes.granola.ai/d/6ad30ef0-667c-4c82-9268-58fceef957b6
ingested: 2026-07-21
topics_detected: [qa-process, build-cadence, bug-triage, animation-velocity, perforce-jira, couch-heroes]
relevance_score: 9
novelty_score: 7
actionability_score: 8
bank_candidates: [client_couch_heroes, production_methods]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# CH Production: QA Build Cadence, Bug Triage Process, and Animation Velocity Gap

## Key Content

**Build stability:** Two builds active -- stable QA build (running but behind) and current dev build (frequently broken). QA lead was pinging engineering directly with bugs multiple times daily, breaking engineering flow.

**Bug triage fix:** Bug triage spreadsheet being set up; QA files bugs there; EP triages with engineers in standups. Spreadsheet migrates to Jira when ready. EP meeting QA lead 1-on-1 to align on process. EP monitoring whether direct-to-engineer bug rate drops after process is live. Target: weekly build cadence agreed with tech lead; goal is daily.

**Jira/Perforce integration:** Goal is to auto-lock assets on checkout and block task closure until P4 check-in confirmed, eliminating "forgot to check in" delays cascading across pipeline steps. Free Perforce Jira plugin being evaluated first; open-source bridge API as fallback. Maintenance cadence on open-source tools flagged as a risk to vet.

**Animation velocity gap:** Only 4 animations delivered in 6 months against a team of 1.5 animators (lead + one animator + rigger). Stated causes: insufficient brief, unclear workflow, no process. Lead spending time coaching juniors rather than producing. Projection at current rate: ~2031 for VS completion.

Mitigation: outsource and source short-term contractors; convert strong performers to long-term. Keywords and Virtuos flagged as AAA-grade options (Keywords ~30-40% more expensive). Evolution Recruitment flagged as contractor specialist. MPG and Arctic 7 also in scope.

**Associate Producer joining:** Glen bringing on an NBI Associate Producer to cover operational gaps: document upkeep, meeting coordination, supporting EP.

## Decisions / Insights

- Glen decided: bug triage spreadsheet with EP triaging in standups replaces direct-to-engineer bug pinging; Jira when ready.
- Glen decided: weekly build cadence target; working toward daily cadence with Mustafa.
- Pattern: QA-to-engineering direct bug pinging without a triage layer breaks engineering flow at scale; a triage spreadsheet is the interim fix before Jira onboarding.
- Glen concluded: animation velocity at 4 animations/6 months is a project-critical risk; outsource blitz is the only path to VS1 readiness.
- Glen decided: 12 open roles total; hiring list not to be shared externally; Ryan meeting to confirm priorities.

## Context

Production meeting at Couch Heroes, 20 Jul 2026. Attendees: Glen Pryer (CPO/NBI), Graeme (EP), Sean Samborski (Producer), Fatima Dossola (Art-side). Meeting covered Jira/Perforce integration, documentation standards, AI policy, animation velocity, build stability, and roadmap prerequisites.

## Applicability

Relevant when: reviewing CH production process -- bug triage spreadsheet and build cadence are new processes being established as of 20 Jul 2026; check against Jira migration status.
Relevant when: assessing CH animation risk for VS1 -- 4 animations in 6 months vs. VS1 requirement; contractor outsource blitz is the active mitigation; check whether contractors have been sourced.
Relevant when: advising studios on QA process at pre-Jira scale -- the triage spreadsheet with EP ownership is the lowest-friction fix before a full PM tool is live.
Relevant when: evaluating Perforce-Jira integration options -- free Perforce plugin is the preferred first option; maintenance risk on open-source bridge is the key concern.
