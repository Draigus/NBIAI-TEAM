# NBI Cadence Registry

Last verified: 2026-06-11

The single source of truth for every scheduled/autonomous run in the NBI system. If a routine is not in this file, it should not exist. The weekly system audit checks every entry here against actual run evidence.

## Architecture decision (2026-06-11)

All repo-mutating cadence runs LOCALLY on Glen's PC via Windows Task Scheduler, executing headless `claude -p` (Sonnet) in the working tree at `D:\OneDrive\Claude_code\NBIAI_TEAM`. Output lands directly in the repo and is committed; the post-commit hook pushes.

Why: the previous architecture used claude.ai cloud routines. Root-cause investigation (2026-06-11 session log) proved they fired on schedule for 27 days but delivered nothing: each run executed in an isolated cloud sandbox checked out from stale `master`, never pushed a branch, never sent an email or Slack message. Roughly 100 runs of work were discarded. Cloud routines are only appropriate here once a delivery path (push/PR or verified MCP send) exists.

## Active local tasks (Windows Task Scheduler, "NBI Cadence - *")

| Task | Schedule (UK local) | What it does | Output lands | Delivery |
|---|---|---|---|---|
| morning-brief | Weekdays 07:30 | Regenerates intelligence brief; pipeline pulse; WorkSage health check; Friday client digest; brain delta flag | intelligence/synthesis/intelligence_brief.md (committed) | Telegram (Saved Messages) + email to Gpryer@nbi-consulting.com (both verified 2026-06-11) |
| intel-research | Weekdays 12:30 | One web research cycle, domain of day (Mon pitch decks, Tue forecasts, Wed production, Thu/Fri industry) | intelligence/raw/web_research/ + research_log.md (committed) | none (feeds banks) |
| intel-ingest | Daily 19:00 | Granola meeting ingestion via REST API. Gmail/Slack ingestion SKIPPED pending connector credentials (see Gaps) | intelligence/raw/granola/ + pipeline_state.md (committed) | none (feeds banks) |
| recompile-banks | Daily 21:30 | Threshold-gated bank recompilation + Brain Delta per .claude/skills/recompile-banks | intelligence/banks/, brain_delta.md, compilation_log.md (committed) | none (surfaced in morning brief) |
| system-audit | Monday 08:30 | Full system audit incl. cadence-health layer (checks THIS registry against run logs) | projects/nbi_dashboard/system_audits/ (committed) | none (surfaced in morning brief) |
| brain-freshness | Wednesday 08:30 | Proposes Brain updates from week's logs/deltas. Never edits the Brain | intelligence/synthesis/brain_freshness_proposal_*.md (committed) | none (surfaced in morning brief) |
| financial-reconciliation | 1st of month 09:00 | Cross-source revenue/payroll/margin reconciliation per skill | intelligence/synthesis/financial_reconciliation_*.md (committed) | none (surfaced in morning brief) |
| harness-improvement | Weekly Mon 09:00 | LOCAL Task Scheduler | Diagnosis + proposal cycle. Reads captured events, selects coreset, diagnoses patterns, auto-applies LOW proposals, generates digest for Glen. |

Mechanics:
- Runner: `scripts/cadence/run-cadence.ps1 -Task <name>`; prompts in `scripts/cadence/prompts/<name>.md`; logs in `scripts/cadence/logs/` (gitignored, last 30 kept per task).
- Re-register after changes: `scripts/cadence/register-tasks.ps1`.
- Tasks run as the logged-on user with StartWhenAvailable: if the PC is off/logged out at trigger time, the task runs at next logon. If the PC stays off all day, that day's run is skipped.
- All tasks abort if a git merge/rebase is in progress; they commit only their own files and never write session logs.

## Other scheduled automation (not Task Scheduler)

| Job | Schedule | Where | Notes |
|---|---|---|---|
| Granola → WorkSage meeting_items sync | Daily 07:00 | dashboard-server cron (PM2 `nbi-dashboard`) | Separate from intelligence ingestion. Manual trigger: POST /api/admin/granola-sync |
| Dashboard snapshot + PM report emails | Per dashboard-server/cron/index.js | dashboard-server cron (PM2) | Sends via Graph API as nbihub@nbi-consulting.com |

## Cloud routines (claude.ai) — ALL DISABLED 2026-06-11

17 routines at https://claude.ai/code/routines, all set `enabled: false` (the API cannot delete; Glen can delete them in the web UI). Kept for reference: Financial Reconciliation, Brain Freshness Guard, Pipeline Pulse, Bank Recompilation, intel-research x5, intel-ingest x3, intel-brief, Weekly System Audit, Weekly Client Digest, WorkSage Health Check, NBI Morning Briefing. Their jobs were absorbed into the local tasks above (Pipeline Pulse, WorkSage Health Check, intel-brief and Weekly Client Digest all folded into morning-brief).

Do NOT re-enable a cloud routine without first giving it a working delivery path and a branch pin, and verifying one run end-to-end.

## Gaps / pending

1. **Connectors credentials — PARTIALLY CLOSED 2026-06-11** per the connectors HANDOFF.md. Now SET and verified: msgraph/O365 (Azure creds from dashboard-server; sendEmail verified end-to-end, sends as Gpryer@nbi-consulting.com), Slack (dashboard bot token; sends + channel reads OK; search and Glen's DMs NOT possible with a bot token), Apify (token set, untested). Still pending Glen: GOOGLE_CLIENT_ID/SECRET (Google Cloud Desktop OAuth app per connectors SETUP.md step 7 — unlocks Gmail ingestion, calendar in brief, Drive), MIRO_ACCESS_TOKEN (SETUP.md step 5), Slack USER-level token if DM ingestion is wanted. TELEGRAM_BOT_TOKEN not needed (Telegram MCP covers messaging).
2. **Morning brief calendar/overnight-email sections**: still blocked on the Google OAuth credentials (gap 1). Email DELIVERY of the brief is now live.
3. **Live financials connection (QuickBooks)**: the one Tier-1 data domain with no live connection — financial_resilience.md is hand-maintained. To close it: Glen creates an Intuit developer app (developer.intuit.com, free on the existing QuickBooks subscription), provides client ID/secret, then a `quickbooks` connector gets added to ~/.claude/connectors and the financial-reconciliation task gains live P&L/invoice data instead of markdown-only cross-checks. Until then the monthly reconciliation reports on knowledge-base consistency only.
4. **Hermes agent**: approved 2026-05-10, blocked on machine specs. When deployed, becomes the team-facing answer channel and can take over delivery.
