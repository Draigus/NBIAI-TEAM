# Handoff — AIOS (Nate Herk four Cs) audit + cadence rearchitecture

**Date:** 2026-06-11
**Sessions:** 2026-06-10 (audit) + 2026-06-11 (fixes), one continuous conversation
**Branch:** feature/command-centre (all commits pushed via post-commit hook)
**Next session task:** pick up remaining AIOS work (see "What's Left" below). Reminder scheduled for 2026-06-12 08:00 (email + Telegram) plus pending_actions entry.

---

## 1. Context — how this started

Glen watched Nate Herk's AIOS video (youtube.com/watch?v=8QQ_INxAhRs) and asked whether NBIAI_TEAM implements his "four Cs" framework (Context, Connections, Capabilities, Cadence). Research found Nate's public repo **github.com/nateherkai/AIS-OS**, cloned to **D:\tmp\AIS-OS** (keep — contains the full 100-point audit rubric in `.claude/skills/audit/SKILL.md`, the Three Ms framework text, /onboard and /level-up skill templates). Scored NBIAI_TEAM ~95/100 on his structural rubric (Stage 3 "Autonomous") but found 6 functional gaps. Glen: "fix all the way up to Hermes."

## 2. The big discovery — cadence was write-only into a void

**Root cause (full evidence chain in session log 2026-06-11):** 17 claude.ai cloud routines existed (not 8 as memory claimed). All fired faithfully on schedule since 15 May (last_fired_at confirmed via RemoteTrigger API), but every run executed in an isolated cloud sandbox checked out from **stale master** (which lacks the skills and state they needed), **never pushed a branch** (zero routine branches on GitHub, master untouched since 6/4), and **never sent email/Slack/Telegram** (searched Gmail, MS365, Slack — clean). ~100 firings over 27 days, all output discarded. Even the original "NBI Morning Briefing" prompt said "Do NOT send messages".

The trigger symptom ("recompilation routine ran 9 June 01:23, produced empty files") was a misdiagnosis: those were local scaffold files created by the 9 June session; the brief misread mtimes.

**All 17 cloud routines DISABLED** via RemoteTrigger API (`enabled:false` verified per routine). The API cannot delete them — Glen can at https://claude.ai/code/routines. Rule established (in company/routines.md and decisions.md): never re-enable a cloud routine without a verified delivery path.

## 3. What was built — local cadence layer

**Canonical registry: `company/routines.md`** (single source of truth; the weekly audit checks it against run logs).

7 Windows Task Scheduler tasks ("NBI Cadence - *"), each running `scripts/cadence/run-cadence.ps1 -Task <name>` = headless `claude -p` (Sonnet, `--permission-mode bypassPermissions`, both verified) in the working tree, prompt from `scripts/cadence/prompts/<name>.md`, logs to `scripts/cadence/logs/` (gitignored, last 30 kept):

| Task | Schedule (UK local) | First scheduled run |
|---|---|---|
| morning-brief | Weekdays 07:30 | 2026-06-12 (manually VERIFIED 2026-06-11: exit 0, brief committed 49b6206, WorkSage 200, Telegram delivered) |
| intel-research | Weekdays 12:30 | 2026-06-11 |
| intel-ingest | Daily 19:00 | 2026-06-11 (Granola via REST only — see gaps) |
| recompile-banks | Daily 21:30 | 2026-06-11 (threshold-gated; banks fresh so expect "no banks flagged") |
| system-audit | Monday 08:30 | 2026-06-15 (includes cadence-health layer checking registry vs logs) |
| brain-freshness | Wednesday 08:30 | 2026-06-17 |
| financial-reconciliation | 1st monthly 09:00 | 2026-07-01 |

Re-register after edits: `scripts/cadence/register-tasks.ps1`. Tasks run as logged-on user with StartWhenAvailable (missed runs fire at next logon; PC off all day = day skipped).

**Key headless facts (verified):** claude.ai remote MCPs are NOT available headless; local .mcp.json MCPs (telegram MTProto, playwright, ppt, foundry) ARE. Granola headless = REST: `GET https://public-api.granola.ai/v1/notes?created_after={ISO}`, `Authorization: Bearer {GRANOLA_API_KEY from dashboard-server/.env}` (endpoints verified against dashboard-server/lib/granola-sync.js).

## 4. Intelligence pipeline — fully rebuilt

All 7 banks full-rebuilt 2026-06-11 (first compile since 25 May) by parallel Sonnet agents. Verified line counts: production_methods 335, forecast_models 342, client_couch_heroes 288, client_patterns 275, industry_current 238, games_pitch_decks 234, personal_insights 171. Summaries regenerated. compilation_log.md has real entries; pipeline_state.md rewritten with disk-verified counts (granola 112, web_research 85, gmail 10, slack 6, onedrive 25, chatgpt 34, claude_sessions 26, downloads 2).

**Restricted extracts skipped per policy (still unintegrated, need Glen's call):** granola_b8ea7c8c, granola_c105bb66, granola_156a5b5e, granola_42bdb273, granola_b3eed99d, granola_89fd69cd, gmail_19dfdf4dd46d86f7, gmail_19df79fb4b8683c3, sarge_telegram_export_2026-05-17 (mostly CH CTO search + compensation).

**Brain Delta** (intelligence/synthesis/brain_delta.md): 8 discrepancies, 20 new facts, 6 stale facts. Glen adjudicated the big ones live (see §5). **Still open:** Lorenza naming fix (3 files say "Lorenz"), CH headcount ~70 (Brain says ~55), Glen's title "fractional CPO" (Brain says "fractional C-level"), CH revenue 360K actual vs 300K contracted in Brain Section 5, Sarge funding figure conflict (bank says USD 1-2M, Brain says GBP 5-10M — needs Glen), Binni/Binnie spelling, WorkSage's external DOD-consultancy client paying USD 5K/month not in revenue tables, Dino/Lili/Graham/Hannah not in Brain contact tables.

## 5. Brain corrections from Glen (all committed)

- **USD 600K investor debt** (not GBP): RESOLVED — Tom selling his NSI stock to negate the debt he incurred (owed to Robert Pop and partners). financial_resilience.md "Investor Debt — RESOLVED" section.
- **NSI is owned by Robert Pop, NOT Tom** (Brain had "Tom's firm" — wrong). Tom was a senior employee, no longer is. **NSI and NBI completely separated** June 2026.
- **The GBP 620K "NSI wind-down cliff" — formerly the Brain's #1 risk — IS DISSOLVED:** Jeff Day and Jessica Williams LET GO; Bryan Rasmussen STAYED AT NSI and is **no longer part of NBI** (CFO seat vacant); Tom not currently drawing an NBI paycheck **though he would like to** (~GBP 200K/yr — now a threshold alert requiring explicit Glen decision; margin is ~GBP 2.9K/month).
- **CH Series B:** the 19 June decision deadline is DEAD; timing moved, no new date.
- Updated: NBI_Brain.md, people_directory.md, financial_resilience.md, clients_detailed.md, org_chart.md, brand_website.md, brain_delta.md adjudication header.

## 6. Connectors library — credentialed and live

**Why it was dead:** `~/.claude/connectors/.env` NEVER EXISTED. HANDOFF.md there (2026-05-13) says "code complete, awaiting credential setup"; the setup reminder was a cloud routine that delivered into the void. Created .env per that handoff's steps 1-4:

| Service | State |
|---|---|
| msgraph (O365) | LIVE, VERIFIED — Azure creds from dashboard-server/.env, sends as Gpryer@nbi-consulting.com (2 test emails in inbox). Bug found+fixed: graphFetch crashed on empty-body 202; commit 4449131 in the standalone connectors repo (C:\Users\gpbea\.claude\connectors, own git) |
| slack | PARTIAL — dashboard bot token; sends + channel reads OK; search API and Glen's DMs rejected (not_allowed_token_type — bot tokens can't; needs user token if DM ingestion ever wanted) |
| apify | token set, untested |
| gmail/gcalendar/gdrive | PENDING GLEN — Google Cloud Desktop OAuth app (connectors SETUP.md step 7, ~10 min) |
| miro | PENDING GLEN (SETUP.md step 5) |
| telegram bot | not needed — MTProto MCP covers, verified headless |

**Morning brief now delivers via Telegram (Saved Messages) AND email** — prompt updated, both paths individually verified.

## 7. Commits (NBIAI_TEAM, feature/command-centre, all pushed)

`dd02336` cadence layer + bank rebuild (32 files) · `49b6206` brief (by the verified cadence run itself) · `b03ce54` session log · `634017a` debt/Series B adjudication · `940d556` debt resolved USD · `bdb4c8a` NSI separation/cliff dissolved · `9d24ea0` Bryan departed · `3631e6d` connectors credentialed + email delivery. Connectors repo: `4449131` graphFetch fix.

Unrelated dirty files left untouched on purpose: dashboard-server/routes/documents.js, _tmp_fix.js, migration 068, ATS e2e spec (separate ATS handoff in docs/HANDOFF.md), deliverable PNGs, Couch Heroes JD files.

## 8. What's left (the pickup list)

1. **Watch the first full cadence cycle** — first real test of each task at its scheduled time (table in §3). Check `scripts/cadence/logs/` for non-zero exits. Monday's system-audit automatically flags any task with no recent log.
2. **Google OAuth credentials (GLEN, ~10 min)** — connectors SETUP.md step 7. Unlocks Gmail ingestion, calendar + overnight-email sections in the brief, Drive.
3. **QuickBooks live financials (GLEN)** — create Intuit developer app (free on existing subscription, developer.intuit.com), then build `quickbooks` connector + wire into financial-reconciliation. Last unticked Tier-1 domain in Nate's framework.
4. **Apply remaining brain delta items** (§4 list) — small, mostly mechanical; Sarge funding figure and Binni/Binnie spelling need Glen's word.
5. **Restricted extracts** (§4) — Glen decides: integrate into banks or stay raw-only.
6. **Delete 17 disabled cloud routines** at claude.ai/code/routines (cosmetic; they're inert).
7. **Hermes** — Glen NOT ready; do not start. Machine specs pending.
8. **Optional, from Nate's repo worth adopting:** /level-up weekly ritual; weekly scored audit using his 100-point rubric (adapt into system-audit); Matt Pocock's grill-me skill (github.com/mattpocock/skills) for knowledge extraction.
9. **To confirm with Glen sometime:** Lighthouse contracted 350K vs 300K actuals discrepancy; the GBP 5K/month gap in the 55K monthly total (per-client figures sum to 60K).

## 9. Key reference points

- Cadence registry: `company/routines.md` · Runner: `scripts/cadence/run-cadence.ps1` · Prompts: `scripts/cadence/prompts/`
- Nate's repo clone: `D:\tmp\AIS-OS` (audit rubric at .claude/skills/audit/SKILL.md)
- Connectors: `C:\Users\gpbea\.claude\connectors\` (cli.js; SETUP.md for remaining credentials; standalone git repo)
- Cloud routines (disabled): https://claude.ai/code/routines — RemoteTrigger API via /schedule skill
- Brain delta awaiting review: `intelligence/synthesis/brain_delta.md`
- WorkSage: localhost:8888, prod https://worksage.nbi-consulting.com, PM2 `nbi-dashboard`
- Session logs: 2026-06-10_session.md (audit day) + 2026-06-11_session.md (fix day, full evidence chain)

## 10. Next session directive (Glen, late 2026-06-11)

**Rework the cadence layer from "report what's wrong" to "fix what you can, report what you did, and list the decisions I need to make."**

Principle: automate everything that doesn't require Glen's judgement, Glen's relationships, or Glen's approval to send externally. The morning brief becomes a decision queue, not a status report. Each upstream task (recompile, ingest, freshness, etc.) should act within its authority first, then feed its results to the brief. The brief distils: what was done overnight, what's still open, and the specific decisions Glen needs to make to close items — framed with enough context to answer yes/no/redirect in one line.

This is a prompt rewrite across all 7 cadence tasks + adjustment to which tasks feed which.
