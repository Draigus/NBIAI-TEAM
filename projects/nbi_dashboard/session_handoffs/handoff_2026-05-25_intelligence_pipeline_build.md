# Handoff: Intelligence Pipeline Build — 2026-05-25

**Branch:** `feature/command-centre`
**Status:** Pipeline fully operational. Dashboard integration built, needs visual verification.

---

## What Was Done

Built the complete NBI Intelligence Pipeline from spec through to WorkSage dashboard integration in a single session. 25+ commits.

### Phase 1: Infrastructure + First Harvest
- Created `intelligence/` directory tree (14 directories)
- Wrote 5 agent prompts (ingestion, compilation, research, brief, topic detection)
- Wrote 4 config files (bank registry, source config, pipeline rules, suppression rules)
- Wrote 7 bank schemas
- Built 3 core skills: `/ingest-chats`, `/compile-bank`, `/intel-brief`
- First harvest: 26 extracts from 61 Claude session handoffs
- Compiled 2 banks: personal_insights (131 lines), production_methods (174 lines)

### Phase 2: ChatGPT Harvest
- Located ChatGPT export at `D:\OneDrive\CHATGPT HISTORY\conversations.json` (664MB, 2,046 conversations)
- Built `intelligence/scripts/extract_chatgpt.py` to filter by title relevance
- 505 conversations filtered, 45 read, 34 extracts produced
- Compiled 4 new banks: forecast_models, games_pitch_decks, client_couch_heroes, client_patterns

### Phase 3-4: Additional Skills + Source Config
- Built 5 more skills: `/ingest-granola`, `/ingest-local`, `/ingest-email`, `/ingest-slack`, `/intel-research`
- Configured Slack channels (Lorenza, Valeria, Robin, Vardis, Aris, Product Council)
- Updated ChatGPT export path in source_config.md

### Phase 5: Research + Go-Live
- Wrote 5 research briefs (pitch_decks, forecast_models, production_methods, industry_current, competitors)
- Created 9 cloud routines via RemoteTrigger API (daily brief, 3 ingestion, 5 research)
- Integrated into CLAUDE.md (session-start load, bank routing, proactive surfacing, suppression)
- Updated 6 role AGENT.md files with knowledge_banks field

### Local File + Research Harvests
- Ran `/ingest-local`: 27 extracts from OneDrive (Goals, CH, brain modules) and Downloads
- Ran 2 industry research cycles: 12 extracts (Metacore/Supercell, Astrocade $56M, FTC loot box, Steam AI, Google/Epic 20%, UK ASA enforcement, Morgan Stanley AI $22B, etc.)
- Ran 1 pitch deck research cycle: 5 extracts (a16z, Homa $50M, Games Fund template, Little Polygon failure, Voodoo)
- All 7 banks recompiled with full source material

### Dashboard Integration
- Built `dashboard-server/lib/intelligence.js` (markdown file parser)
- Built `dashboard-server/routes/intelligence.js` (5 API endpoints)
- Added Intel tab to Command Centre (brief card, bank health, research, pipeline)
- Added Intelligence tab to main navigation (admin only, full dashboard view)
- CSS for both views (~90 rules)
- Spec at `docs/superpowers/specs/2026-05-25-intelligence-dashboard-design.md`
- Mockup at `docs/superpowers/mockups/intelligence-dashboard-mockup.html`

---

## Final Numbers

| Metric | Value |
|---|---|
| Raw extracts | 104 |
| Compiled banks | 7 |
| Total bank lines | 1,097 |
| Source references | 142 |
| Skills built | 8 |
| Cloud routines | 9 |
| API endpoints | 5 |

---

## Cloud Routine IDs

| Routine | ID |
|---|---|
| intel-brief | trig_016BJaGFKYz2M8PFhk3ZUHuP |
| intel-ingest-granola | trig_01E7V26gG6kjsBAQr1zHV8Fi |
| intel-ingest-email | trig_01SjhvzsDZ2tRQoKPEKz3JaD |
| intel-ingest-slack | trig_012ecKF2DU6ZtQJysMDN9DbF |
| intel-research-industry | trig_01NMfUUN2gzafXQJ9jLfZkz5 |
| intel-research-pitchdecks | trig_016CGHFxKLsKkAoV4ib8wiEX |
| intel-research-production | trig_01NSCJSYeA53U2hdZwo3RCoS |
| intel-research-competitors | trig_0161dkBwSLdqsAGPyukHsQg6 |
| intel-research-forecasts | trig_0143tG2MvEsKtaoixuFW1r7r |

Manage at: https://claude.ai/code/routines

---

## What Needs Attention

1. **Visual verification:** The CC Intel tab and main Intelligence tab need Glen to check in browser. Tests confirm no regressions but UI needs eyeball check.
2. **PM2 restart:** Server changes need `pm2 restart nbi-dashboard` to go live.
3. **Calibration:** Glen should review sample extracts across sources (Claude, ChatGPT, OneDrive) to tune scoring.
4. **Bank suggestions:** 4 new banks suggested (consulting_frameworks, studio_staffing_models, salary_benchmarks, investor_database) — awaiting Glen's decision.
5. **Binary files:** ~50 .docx/.xlsx/.pptx files on OneDrive couldn't be read. Document conversion tooling needed.
6. **Granola/Gmail/Slack:** First ingestion runs scheduled for tonight 20:00 UK. Will produce extracts from live sources for the first time.
