# Handoff: Intelligence Pipeline — Full Build + Dashboard Integration

**Date:** 2026-05-25 (into early hours 2026-05-26)
**Branch:** `feature/command-centre`
**Status:** Pipeline fully operational. All sources ingested. Dashboard built. Tests green.

---

## What Was Built

The complete NBI Intelligence Pipeline — from spec to live system in one session. Five-layer architecture: Ingestion → Compilation → Synthesis → Surfacing → Research.

### Pipeline Infrastructure
- `intelligence/` directory tree (14 directories)
- 5 agent prompts (ingestion, compilation, research, brief, topic detection)
- 7 bank schemas, 4 config files (registry, source config, pipeline rules, suppression rules)
- 5 research briefs (pitch_decks, forecast_models, production_methods, industry_current, competitors)
- Pipeline state tracking + research log

### 8 Skills Built
| Skill | Purpose |
|---|---|
| `/ingest-chats` | Claude handoffs + ChatGPT export |
| `/ingest-granola` | Granola meeting transcripts |
| `/ingest-local` | OneDrive + Downloads files |
| `/ingest-email` | Gmail business threads |
| `/ingest-slack` | Slack channel discussions |
| `/compile-bank` | Synthesise extracts into banks |
| `/intel-brief` | Generate daily intelligence brief |
| `/intel-research` | Web research cycles by domain |

### 129 Raw Extracts Across 8 Sources
| Source | Extracts | Key Content |
|---|---|---|
| Claude sessions | 26 | Decision patterns, architectural choices, working rules |
| ChatGPT | 34 | Forecast models, pitch decks, client engagement, salary data |
| OneDrive | 25 | Goals engagement data, CH offsite/strategy, brain modules |
| Downloads | 2 | CH materials index, Sarge materials index |
| Web research | 17 | Industry news (12), pitch deck exemplars (5) |
| Granola | 12 | VC/CTO calls, executive meetings, offsite days, game direction |
| Gmail | 7 | CH hiring wave — 5 candidate threads |
| Slack | 6 | Production council, contract flexibility, compensation, interviews |

### 7 Compiled Banks (632 total lines)
| Bank | Lines | Sources |
|---|---|---|
| client_couch_heroes | 143 | 40+ (deepest bank — org, game, production, hiring, creative) |
| production_methods | 90 | 45+ (decision process, estimation, offsite framework) |
| industry_current | 88 | 20+ (Google/Epic 20%, FTC loot box, Morgan Stanley AI, ASA) |
| forecast_models | 82 | 25+ (cohort F2P model, ARPU benchmarks, PlayGOALS beta) |
| games_pitch_decks | 81 | 20+ (a16z, Homa $50M, Games Fund template, Sarge pitch) |
| client_patterns | 74 | 30+ (proposal structure, facilitation, hiring scorecards) |
| personal_insights | 74 | 30+ (quality rules, no-scope-watering, Q2 strategy) |

### 9 Cloud Routines (persistent, via RemoteTrigger API)
| Routine | Schedule (UK) | ID |
|---|---|---|
| intel-brief | Daily 06:57 | trig_016BJaGFKYz2M8PFhk3ZUHuP |
| intel-research-industry | Daily 06:03 | trig_01NMfUUN2gzafXQJ9jLfZkz5 |
| intel-ingest-granola | Daily 20:03 | trig_01E7V26gG6kjsBAQr1zHV8Fi |
| intel-ingest-email | Daily 20:07 | trig_01SjhvzsDZ2tRQoKPEKz3JaD |
| intel-ingest-slack | Daily 20:12 | trig_012ecKF2DU6ZtQJysMDN9DbF |
| intel-research-pitchdecks | Monday 05:17 | trig_016CGHFxKLsKkAoV4ib8wiEX |
| intel-research-forecasts | Tuesday 05:27 | trig_0143tG2MvEsKtaoixuFW1r7r |
| intel-research-production | Wednesday 05:23 | trig_01NSCJSYeA53U2hdZwo3RCoS |
| intel-research-competitors | Friday 05:13 | trig_0161dkBwSLdqsAGPyukHsQg6 |

Manage at: https://claude.ai/code/routines

### CLAUDE.md Integration
- Session-start intelligence load (read brief, load bank summaries)
- Bank routing table (topic → bank mapping)
- Proactive surfacing rules (max 2 per session, directly applicable only)
- Suppression rules (no interrupts during coding/debugging, respect "not now")
- 6 role AGENT.md files updated with `knowledge_banks` field

### WorkSage Dashboard Integration
- `dashboard-server/lib/intelligence.js` — markdown file parser
- `dashboard-server/routes/intelligence.js` — 5 API endpoints (brief, banks, research, pipeline, extract)
- `server.js` — intelligence routes mounted
- `nbi_project_dashboard.html` — Intel tab in Command Centre + Intelligence tab in main nav
- CSS for both views (~90 rules)
- **Auth fix applied:** all fetch calls use `authFetch()` not bare `fetch()`
- Spec: `docs/superpowers/specs/2026-05-25-intelligence-dashboard-design.md`
- Mockup: `docs/superpowers/mockups/intelligence-dashboard-mockup.html`
- Plan: `docs/superpowers/plans/2026-05-25-intelligence-dashboard.md`

### Test Infrastructure Fix
- Root cause: `TRUNCATE CASCADE` on 40+ tables causing deadlocks between pool connections
- Fix: table existence check before truncation + retry with backoff
- Result: 600/600 tests passing (was 321 failing before fix)

---

## Server State

- **PM2:** `nbi-dashboard` restarted with intelligence routes loaded
- **Port:** 8888 (production)
- **Tests:** 600/600 passing
- **Intelligence endpoints live:**
  - GET /api/intelligence/brief
  - GET /api/intelligence/banks
  - GET /api/intelligence/research?limit=N
  - GET /api/intelligence/pipeline
  - GET /api/intelligence/extract/:source/:filename

---

## What Needs Attention Next Session

1. **Visual verification:** Glen needs to check the CC Intel tab and main Intelligence tab in the browser. The `authFetch` fix was applied but needs eyeball confirmation.

2. **Bank suggestions:** 4 new banks suggested by the pipeline (consulting_frameworks, studio_staffing_models, salary_benchmarks, investor_database). Glen to approve/dismiss.

3. **Binary file access:** ~50 .docx/.xlsx/.pptx/.pdf files on OneDrive couldn't be read by the ingestion agent. Setting up document conversion would unlock significant client deliverable content.

4. **ChatGPT export path:** Configured at `D:\OneDrive\CHATGPT HISTORY\conversations.json`. Script at `intelligence/scripts/extract_chatgpt.py`. 505 conversations filtered, 45 processed. ~460 remaining lower-priority conversations could be processed in future batches.

5. **Granola depth:** 12 of 119 meetings processed (priority batch). 107 meetings remain — the daily 20:03 routine handles new ones, but the backlog could be processed in a dedicated session.

6. **Slack permissions:** Subagents can't approve MCP tool permissions interactively. The daily Slack ingestion routine may need permissions pre-approved or run inline. Consider adding Slack MCP tools to the allow list.

7. **Gmail `get_thread` blocked:** The Gmail ingestion agent couldn't get full thread bodies (permission denied on `get_thread`). Extracts are based on search snippets only. Pre-approving this tool would improve email extract quality.

---

## Commit History This Session

```
e7a8b15 intel(bank): full recompile all 7 banks — 129 extracts across 8 sources
8118496 intel(raw): ingest slack + gmail — 13 extracts from 6 channels + email
58250f7 intel(raw): ingest gmail — 7 extracts from 30-day business threads
e3f4cb3 intel(raw): ingest granola — 12 extracts from 10 priority meetings
dfa9361 fix: test truncate checks table existence before truncating
00665b6 fix: truncate deadlocks in test suite — lock_timeout + 3 retries
4640d1d fix: use authFetch for intelligence API calls (was returning 401)
bf1c040 feat: add Intelligence to CC Intel tab + main nav Intelligence tab
0428d11 feat: add intelligence API — file parser, routes, server mount
eecb9fa feat: intelligence dashboard implementation plan — 6 tasks
9739f65 feat: intelligence dashboard mockup + spec update (brief in CC, not portfolio)
46ac727 feat: intelligence dashboard design spec — brief card + intel tab
5dc9654 intel(brief): daily brief 2026-05-25
bb28467 intel(bank): recompile games_pitch_decks (+5 research) and industry_current (+7 research)
f32b9e8 intel(bank): full recompile — all 7 banks updated with local file extracts
c8ad963 intel: local file + industry research harvest — 32 extracts, 7 banks compiled
75dd188 intel(research): pitch_decks cycle — 5 findings
2782f07 intel(research): industry_current cycle 2 — 7 findings
b1eefee intel: ChatGPT harvest complete — 34 extracts, 6 banks compiled
4de8c1d intel(config): update source config with ChatGPT path and Slack channels
8746f23 intel: integrate intelligence pipeline into CLAUDE.md + role AGENT.md files
fad677e intel(config): add research briefs for 5 domains
17f6fc0 intel: add 5 source connector skills (granola, local, email, slack, research)
40d8d34 intel: first harvest — Claude session handoffs ingested and compiled
737e398 intel: add /intel-brief skill
4731d69 intel: add /compile-bank skill
7597ac8 intel: add /ingest-chats skill (Claude sessions + ChatGPT export)
3d1cd8e intel(state): initialise pipeline state and research log
b2ce0c4 intel(config): add bank schemas for 7 initial banks
354c1af intel(config): add bank registry, source config, pipeline rules, suppression rules
9e28b33 intel: add agent prompts (ingestion, compilation, research, brief, topic detection)
d003bec intel: create directory structure for intelligence pipeline
```
