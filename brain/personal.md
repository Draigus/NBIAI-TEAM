---
last_verified: 2026-05-16
---

# Personal and Family

**Last Updated:** 2026-04-20

---

## Family

### Heather Pryer - Wife

- Both doing keto together - combined weight loss of approximately 50 lbs
- Actively trying to be healthier overall
- Birthday: TBD
- Wedding anniversary: TBD

### Nick Pryer - Eldest Child

- Age 26, lives in the US
- Glen and Heather are estranged from Nick
- He is bipolar and the relationship has been very difficult and painful
- **SENSITIVE TOPIC** - do not raise casually, do not probe, do not reference unless Glen brings it up first

### Magnus (Kali) Pryer - Daughter

- Works at NBI as Producer (see team roster for work details)
- Glen describes the relationship as "strange, to be honest"
- Birthday: TBD

### Jacob Pryer - Youngest Child

- At university at Anglia Ruskin University, Cambridge
- Glen describes him as "awesome"
- Birthday: TBD

### Grendel - Family Dog

- Breed: Cane Corso
- Has hip problems

---

## Health and Wellbeing

| Condition | Detail |
|---|---|
| Pulmonary embolisms | Three PEs to date |
| Blood thinners | Currently on blood thinners (specific medication TBD) |
| Diet | Keto - doing it with Heather. Combined weight loss approximately 50 lbs |
| General direction | Actively trying to be healthier |

TBD: exercise routine, specific health goals, medication details if Glen wants them tracked.

---

## Important Dates

| Date | Event |
|---|---|
| TBD | Glen's birthday |
| TBD | Heather's birthday |
| TBD | Kali's birthday |
| TBD | Jacob's birthday |
| TBD | Wedding anniversary |

---

## D&D / Tabletop RPGs

- Glen is a DM (Dungeon Master) running a long-running AD&D campaign
- Uses Foundry VTT for running games
- Has built a huge corpus and lore for his D&D world
- Has a large library of original music for the campaign (Spotify folder with "by Carathul" tracks - songs, ballads, hymns all themed to the world)
- Considering writing a world book for the world he has built
- Considering writing one or two novels set in this world

TBD: campaign name, player group, frequency of sessions, world name.

---

## Astinus - Campaign Intelligence System (Claude Code Project)

Named after the chronicler from Dragonlance. A local-first Python system that processes session audio into structured world data, maintains a living world bible, and generates pre-session DM briefs.

### Project Locations

| Path | Status |
|---|---|
| `D:\OneDrive\Claude_code\Astinus` | **LIVE** - active project location (last modified 26 March 2026) |
| `C:\Users\gpbea\.claude\projects\d--OneDrive-Claude-code-Astinus` | Claude Code project config |
| `C:\Users\gpbea\Downloads\Astinus` | **STALE** snapshot from February 2026 - do NOT read from here |

### Tech Stack

- Python 3.11+
- SQLite + FTS5
- Claude API (anthropic SDK)
- Pydantic 2.6+
- FastAPI + uvicorn (fully operational)
- HTMX + custom Grimoire fantasy theme (Jinja2 templates)
- WhisperX + pyannote (speaker diarisation)
- pydub + static-ffmpeg (audio conversion)

### Build Status

All core phases COMPLETE. Currently polishing. 23+ phases built:

1. Data Models and World Bible Foundation (SQLite, CRUD, FTS5, review queue)
2. Audio Pipeline (WhisperX transcription, speaker diarisation, voice notes, CUDA GPU)
3. LLM Extraction and Entity Resolution (Claude API, Pydantic, resolver, review integration)
4. Calendar and Timeline Engine (CUSTOM calendars - not Harptos. Event registry, campaign state)
5. Pre-Session Brief Generator (context assembly, relevance filtering, Claude briefs)
6. Foundry VTT Integration (dual-mode: HTTP push + JSON file export)
7. Web Interface (FastAPI + HTMX, 8+ pages, FTS5 chatbot with Claude)
8. Polish (entity merge, name corrections, session search, player journal, relationship graph, backups)
9. Multi-Campaign Support (campaign_id isolation, settings, switching)
10. Authentication and Role-Based Access (DM/player login, content hiding, 14 granular permissions)
11. Player Characters as Entity Type
12. Calendar Events in World Bible
13. Visual Campaign Calendar (month grid, day detail, event images, game date formatting)
14. Wiki-Style Entity Auto-Linking (Jinja2 filter, all templates)
15. Universal Relationship Framework (junction table, auto-bidirectional, AI discovery)
16. Session Handout Generator (Claude API, print-ready HTML)
17. Bulk Document Import (DOCX parsing, sequential extraction)
18. Grimoire Fantasy Theme (dark leather/gold, animations, splash screen)
19. Factions as Entity Type (Excel import, World Bible integration)
20. Hover Preview Cards (API preview endpoint, JS hover cards)
21. Story Highlights (auto-extract pivotal moments, category badges)
22. Audio Pipeline Verification (CUDA GPU, speaker diarisation, speaker ID)
23. Split-Panel PC Browser (3D page-flip animations, keyboard nav)

Additional features: quest update merge, entity delete with impact analysis, DM/player todo lists, per-user permissions, per-page backdrops, session detail with transcript viewer, dashboard with activity feed, batch folder import, SQLite concurrency fix, performance optimisations (dashboard 65ms, world bible 16ms), database indexes, post-extraction entity enrichment, cross-session entity accumulation, PC name filter in extraction.

### Key Technical Details

- Calendar uses custom format with `GameDate.format_display()` - e.g. "Solik 4, 2316 IC". Configurable per campaign via `campaign_context.yaml`
- Entity types: NPCs, PCs, Locations, Quests, Items, Sessions, Calendar Events, Factions
- Full specs in `CLAUDE.md` and `FEATURES.md` at the live project location
