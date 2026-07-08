---
generated: 2026-07-08
cadence_run: brain-freshness
sources:
  - session_logs: 2026-07-01 through 2026-07-07 (12 session files)
  - brain_delta: intelligence/synthesis/brain_delta.md (2026-07-05 regeneration + 2026-07-06 and 2026-07-07 appendices)
  - pending_actions: brain/pending_actions.md
  - decisions_log: projects/nbi_dashboard/live_state/decisions.md
  - brain_decisions: brain/decisions_log.md
---

# Brain Freshness Proposal -- 2026-07-08

## Freshness Summary

| File | Last Verified | Days Stale | Status |
|---|---|---|---|
| NBI_Brain.md | 2026-07-03 | 5 | OK |
| brain/clients_detailed.md | 2026-07-03 | 5 | OK |
| brain/people_directory.md | 2026-07-03 | 5 | OK |
| brain/playsage.md | 2026-07-03 | 5 | OK |
| brain/pending_actions.md | 2026-07-03 | 5 | OK |
| brain/decisions_log.md | 2026-06-24 | 14 | OK |
| brain/nbi_hub.md | 2026-06-24 | 14 | OK |
| brain/processes_tools.md | 2026-06-23 | 15 | OK |
| brain/ead_framework.md | 2026-06-23 | 15 | OK |
| brain/services_ai_operations.md | 2026-06-23 | 15 | OK |
| brain/brand_website.md | 2026-06-23 | 15 | OK |
| brain/glen-working-profile.md | 2026-06-23 | 15 | OK |
| brain/salarysage.md | 2026-06-23 | 15 | OK |
| brain/personal.md | 2026-06-23 | 15 | OK |
| brain/career_history.md | 2026-06-23 | 15 | OK |
| brain/financial_resilience.md | 2026-06-09 | **29** | **WARN** |

**Summary:** One WARN (financial_resilience.md at 29 days -- see Module Verifications). All other modules within tolerance. Brain itself last updated 5 days ago (2026-07-03). Week was extremely busy: AIOS Phases 2+3 shipped, voice module started, CH NPE design locked, CH concept art restructured. 10 proposed updates.

---

## Proposed Updates (10 total)

### NBI_Brain.md (5 updates)

---

### Update 1: Primary AI model -- Fable 5 preferred, Opus 4.6 last resort

**Source:** 2026-07-05 session; feedback memory feedback_no_opus_47.md (Glen: "Fable far better job")
**File:** NBI_Brain.md, Section 3 "How Glen Works With AI"
**Current text:** `**Primary tool:** Claude Code, Opus 4.6, desktop client. This is the main working environment.`
**Proposed text:** `**Primary tool:** Claude Code, Fable 5, desktop client. This is the main working environment. Fable 5 is strongly preferred (Glen, 2026-07-05: "far better job"). Opus 4.6 is last-resort fallback only -- flag to Glen if a session runs on it. Opus 4.7 and 4.8 are banned.`
**Why:** Glen ruled Fable 5 the preferred model on 2026-07-05 after the AIOS Phase 2/3 coordination accidentally ran on Opus 4.6; this is a hard rule now committed to memory but not yet in the Brain.

---

### Update 2: WorkSage description -- test count, mock data, migrations

**Source:** 2026-07-06 session (Phase 3 merge verification)
**File:** NBI_Brain.md, Section 8 "NBI Hub (WorkSage)" paragraph
**Current text:** `Features built: Dashboard, Workload, Projects (board + tree views), People (calendar/roster), Reports, Bug Tracker (kanban), Hiring (kanban), Leads (kanban). Test infrastructure: Vitest + Playwright, 23+ tests. See \`brain/nbi_hub.md\` for architecture detail.`
**Proposed text:** `Features built: Dashboard, Workload, Projects (board + tree views), People (calendar/roster), Reports, Bug Tracker (kanban), Hiring (kanban), Leads (kanban), News, Command Centre, AIOS Queue, Client Portal. Running on real data and in daily use. 80 migrations applied. Test infrastructure: Vitest + Playwright, 89 test files / 1,151 tests (as of 2026-07-06). See \`brain/nbi_hub.md\` for architecture detail.`
**Why:** Section 8 says "23+ tests" and "currently has mock data" -- both have been untrue for months. Test count is now 50x higher after AIOS Phases 1-3, and several features are missing from the list.

---

### Update 3: AI Operations Capability -- add AIOS system

**Source:** 2026-07-04 through 2026-07-06 sessions; AIOS Phases 1-3 complete
**File:** NBI_Brain.md, Section 8 "AI Operations Capability" paragraph
**Current text:** `NBI has built a context-engineered AI operations layer that enables a 7-person firm to deliver at the depth of a much larger team. This includes: persistent business context (the Brain), 33-role agent team as depth-skill assets, custom Claude Code skills for domain-specific workflows (/compile-client for client knowledge compilation, /autoresearch for document quality iteration, /gi for investment analysis), session continuity systems, model tier routing (Opus/Sonnet/Haiku), and approval gates. This architecture is now being offered as a service to game studios. See \`brain/services_ai_operations.md\` for full detail on the capability and client service offering.`
**Proposed text:** `NBI has built a context-engineered AI operations layer that enables a 7-person firm to deliver at the depth of a much larger team. This includes: persistent business context (the Brain), 13-role agent team as depth-skill assets (AGENT.md composites; 33 total roles but 20 archived from Paperclip era), custom Claude Code skills for domain-specific workflows, session continuity systems, model tier routing, and approval gates. **AIOS (AI Operations System):** three phases complete as of 2026-07-06. Phase 1 = delivery rail (Slack bot with button rail + persistent sessions, morning brief cadence, approval routing). Phase 2 = signal engine (headless Claude analyses Granola meetings, extracts business signals with dedup, creates approval actions). Phase 3 = widened inputs (lead-scan CLI, email draft executor via Microsoft Graph, midday nudge cadence, bank-delta routing). Voice module (Phase 4) in active development: native PC voice using FastAPI + RealtimeSTT + Kokoro TTS, not MCP or ElevenLabs. Three cadence schtasks registered (signal-engine 19:30, lead-scan 20:00, midday-nudge 14:00 weekdays). This architecture is now being offered as a service to game studios. See \`brain/services_ai_operations.md\` for full detail.`
**Why:** The AIOS system is the most significant infrastructure built this quarter. The Brain describes a generic "approval gates" capability but the actual system -- signal engine, executor, Slack bot, three cadence tasks, email drafts -- does not appear anywhere in the Brain. Four months of development are invisible.

---

### Update 4: NBI team -- remove "33-role agent team" reference (stale Paperclip count)

**Source:** brain/decisions_log.md 2026-06-09 (Paperclip archived; 13 AGENT.md roles retained)
**File:** NBI_Brain.md, Section 8 first paragraph
**Current text:** `33 role definitions in \`roles/\`. Originally from Paperclip architecture (which was vaporware/overhead). Role definitions retained as depth-skill assets...`
**Proposed text:** `13 active AGENT.md composites in \`roles/\` (retained as depth-skill assets after Paperclip orchestration was archived June 2026). 20 skeleton roles moved to \`roles/_archived/\`...`
**Why:** Section 8 still opens with "33 role definitions" but the 2026-06-09 decisions log formally archived the Paperclip layer and reduced the operational roster to 13.

---

### Update 5: Slack bot -- add to AI Infrastructure section

**Source:** 2026-07-04 session (Phase 1 delivery rail complete and accepted)
**File:** NBI_Brain.md, Section 8 -- new line to add after the AIOS paragraph
**Current text:** (no mention of Slack bot in Section 8)
**Proposed text:** Add after AIOS paragraph: `**nbi-slack-bot:** PM2 process (id 6) running alongside nbi-dashboard. Socket Mode connected to Glen's Slack. Capabilities: morning brief delivery with Block Kit button rail, immediate executor trigger on approval, persistent headless sessions per conversation (24h TTL, Postgres-backed), threaded replies with conversation context, CC AIOS Queue panel.`
**Why:** The Slack bot is live production infrastructure used daily for the morning brief and action approvals. It does not appear in the Brain at all.

---

### brain/nbi_hub.md (2 updates)

---

### Update 6: Test count + migration count

**Source:** 2026-07-06 session (Phase 3 merge, full suite run)
**File:** brain/nbi_hub.md, "Test Infrastructure" section and "Current State" section
**Current text:** `870 tests across 90 test files (69 unit/integration via Vitest + 21 Playwright E2E spec files). Test infrastructure landed 15 April 2026.`
**Proposed text:** `1,151 tests across 89 test files (after AIOS Phase 3, 2026-07-06). Test infrastructure landed 15 April 2026.`

And: `73 migrations applied.`
→ `80 migrations applied (076-080 added during AIOS Phases 2-3, 2026-07-04 to 2026-07-06).`
**Why:** Test count jumped from ~870 to 1,151 across three week of AIOS work. Migration count moved from 73 to 80. Both figures are in the "Current State" paragraph and are used as reference points when reading CLAUDE.md.

---

### Update 7: Features table -- add AIOS Queue

**Source:** 2026-07-05 session (AIOS approval routing merged + verified)
**File:** brain/nbi_hub.md, "Features Built" table
**Current text:** (AIOS Queue is absent from the features table)
**Proposed text:** Add row: `| AIOS Queue | Approval panel | Pending AI-generated actions with Approve / Skip / Snooze buttons, routing modal (client + project cascade), editable title/description. Also embedded in Command Centre AIOS tab |`
**Why:** The AIOS Queue page shipped in Phase 1 (2026-07-05) and is in daily use for Glen to review and approve signal-engine actions.

---

### brain/clients_detailed.md (3 updates)

---

### Update 8: CH production state -- NPE design locked

**Source:** brain_delta appendix 2026-07-07, source: ch-npe-single-player-instancing; 4-stakeholder sign-off (Glen, Vardis, David, Robin)
**File:** brain/clients_detailed.md, CH "Production state" section
**Current text:** (Production state section does not mention NPE/Tutorial Cave design)
**Proposed text:** Add to production state section under a new "NPE Design" bullet:
`- **NPE design locked (7 July 2026, 4-stakeholder sign-off: Glen/Vardis/David/Robin):** Tutorial Cave = single-player instanced zone (no other players visible; isolation and mystery). Portal Peak = single-player phased cave exit with cloud cover as instance boundary; players never revisit. First balloon ride introduces the mechanic; second balloon ride is Portal Peak completion reward and provides the Downtime city flyover reveal. Drifters Cross faction owns the balloon mechanic narratively.`
**Why:** NPE design is a significant production milestone with four named stakeholders signed off. It defines the new player experience boundary conditions for VS1.

---

### Update 9: CH art department -- concept art team right-sized + concept-first gate

**Source:** brain_delta appendix 2026-07-07, source: ch-concept-first-gate-new-work (anonymised)
**File:** brain/clients_detailed.md, CH "Production state" section
**Current text:** Production state mentions art style locked and "art dept 3/10 → 7.5-8" but no information on concept art team headcount.
**Proposed text:** Add to production state section under art:
`- **Concept art restructured (7 July 2026):** Team right-sized from 5 to 2 concept artists. Mandatory concept-first gate for all new character and environment art -- no work proceeds without a concept pass. Root cause of prior style drift: teams bypassed concept by going directly to AI generation or 3D builds. One artist moved to creative department (marketing/pitch assets).`
**Why:** This is a material art department restructuring with a new process gate that will affect all future art work at CH.

---

### Update 10: CH people -- HR People Ops Specialist started

**Source:** brain_delta appendix 2026-07-06; carry-forward confirmed 2026-07-07
**File:** brain/clients_detailed.md (Key Contacts table) + brain/people_directory.md (CH section if it exists)
**Current text:** Key Contacts table does not include an HR People Ops Specialist
**Proposed text:** Add row to CH Key Contacts table: `| HR People Ops Specialist | HR People Ops | Name unconfirmed — started 6 July 2026 |`
**Why:** A new hire joined the CH HR function on 6 July 2026. Name not yet confirmed in session logs. Flag to Glen to confirm name and update.

---

## Items Requiring Glen Adjudication (do not apply to Brain)

### Adjudication 1: CH Tencent GBP 350K contract milestone

**Source:** Signal Engine first live run 2026-07-05; extracted from Couch Heroes Granola meetings (1-2 July)
**The issue:** Signal engine surfaced "Tencent GBP 350K contract milestone (NEW, not in Brain)" from a CH meeting. This could mean: (a) CH has a contract with Tencent worth GBP 350K and a milestone payment is in negotiation, or (b) a Tencent-related obligation at CH. The Brain's existing Tencent entry is "Level Infinite terms (if ever engaged)" -- suggesting Tencent is NOT an active CH partner yet. These conflict.
**Action required:** Glen to confirm: does CH have an active Tencent contract? If yes, the Brain needs a revenue/partnership entry under CH funding/commercial. If no, this was a signal engine false positive and should be suppressed.

### Adjudication 2: CH headquarters -- Greece vs Cyprus

**Source:** brain_delta appendix 2026-07-06 (still open as of 2026-07-07)
**The issue:** NBI_Brain.md says "UK + Cyprus." client_couch_heroes.md bank mentions "Greek-headquartered entity", "Athens Mayor meeting", "Ellinikon site", "Digital Nomad Visa (7% tax)" -- all pointing to Greece. The Saybrook Legal engagement note (memory) says "Cyprus not Greece" but that refers to Saybrook's jurisdictional scope, not studio location. It is plausible that CH has both: a parent/holding entity in Greece and employment contracts via Cyprus.
**Action required:** Glen to confirm: is the operating parent entity Greek? Are employees in both Greece and Cyprus? Brain should say "UK + Greece (parent entity) + Cyprus (employment contracts)" or whichever combination is accurate.

### Adjudication 3: CH GDD-first pipeline -- confirm as applied

**Source:** brain_delta appendix 2026-07-06: "Glen to address dev team by EOD 7 July 2026"
**The issue:** GDD-first pipeline was flagged as a non-negotiable production policy. It was proposed that Glen would address the dev team by 7 July. Not confirmed in session logs whether this happened.
**Action required:** Glen to confirm: was the GDD-first policy communicated to the dev team? If yes, it should be added to CH production state as a confirmed gate.

---

## Module Verifications

### Requires manual review before bumping last_verified

| Module | Last Verified | Days | Recommendation |
|---|---|---|---|
| brain/financial_resilience.md | 2026-06-09 | 29 | **Manual review required.** Revenue table shows Lighthouse GBP 350K + CH GBP 360K + Activision GBP 60K + Goals USD 10K + WorkSage DOD USD 5K/month. No changes to contracted figures this week, but DOD access status and Goals Studio progress should be confirmed before bumping the date. Do not bump last_verified without reading the file and checking against current known state. |

### Safe to bump last_verified (content reviewed this run, no changes found)

| Module | Last Verified | New Date |
|---|---|---|
| brain/nbi_hub.md | 2026-06-24 | 2026-07-08 (after updates 6-7 above are applied) |
| brain/clients_detailed.md | 2026-07-03 | 2026-07-08 (after updates 8-10 above are applied) |

All other modules: content not reviewed this run. Do not bump dates without reading them.

---

## Pending Actions Requiring Attention

### URGENT (carried from pending_actions.md, >14 days)

1. **EU Withdrawal Button compliance (CH + PlaySage):** First flagged 2026-06-25 (13 days; approaching URGENT threshold). Hard pre-launch gate for CH EU DLC/subscription and PlaySage before first EU subscriber. Non-compliance = 12-month refund window + 4% global turnover fines. No evidence of resolution in session logs.

2. **SalarySage: API key off Jeff's personal card:** Flagged 2026-03-26 (104 days, URGENT). Jeff was let go June 2026 -- the card may be inactive. No evidence of resolution.

3. **SalarySage: Expose/hash API keys in code:** Flagged 2026-03-26 (104 days, URGENT). Devin was working on it. Status unknown.

4. **15+ restricted CH extracts pending Glen review:** Oldest 2026-06-11 (27 days). Blocking bank compilation for HR terminations, art team capability, CTO pipeline. No evidence of action in session logs.

5. **VDR first-pass target ~22 July 2026:** 14 days away. Blocked on Lili Zhao P&L. Lili started 1 July. Check whether she has the cash flow/burn projections in hand.

### Completed in session logs but not marked resolved in pending_actions.md

1. **Google OAuth for connectors:** Completed 2026-07-07 (GCP project created, Gmail/Calendar/Drive APIs live, tokens saved). The pending action "Pick up AIOS Nate Herk work (Google OAuth creds for connectors)" item in pending_actions.md can be updated.

2. **AIOS cadence cycle logs:** Phase 3 complete and verified. The "First cadence cycle logs" item in pending_actions.md can be updated.

---

## Summary

| Category | Count |
|---|---|
| Proposed Brain updates | 10 |
| Files affected | NBI_Brain.md, brain/nbi_hub.md, brain/clients_detailed.md |
| Items for Glen adjudication | 3 |
| Pending actions overdue | 5 |
| WARN staleness flags | 1 (financial_resilience.md, 29 days) |

**Most impactful update:** Update 3 (AIOS system in Brain Section 8) -- four months of infrastructure work is invisible in the Brain. This is the highest-priority item to apply before the next session.

**Highest risk open item:** VDR first-pass target ~22 July 2026 is 14 days away with no confirmed progress in session logs.
