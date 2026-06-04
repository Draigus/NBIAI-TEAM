# Meetings Intelligence — Command Centre Tab

**Date:** 2026-06-01
**Status:** Design approved (v2 — post-critique fixes)
**Author:** Glen Pryer + Claude

## Purpose

Add a "Meetings" tab to the Command Centre that surfaces structured intelligence from all Granola meeting notes — actions, decisions, people, learnings, numbers, timeline, and active threads. Replaces the static HTML consolidation with a live, filterable, editable view inside the dashboard.

## Data Architecture

### Three-Layer Flow

```
[Granola] → /ingest-granola (nightly) → intelligence/raw/granola/*.md
    → /compile-meetings (skill, LLM-based) → intelligence/compiled/meetings.json
    → GET /api/meetings/compiled (server reads JSON + DB overrides) → CC tab renders
```

### Layer 1: Ingestion (existing)

The nightly `/ingest-granola` cloud routine produces raw extracts in `intelligence/raw/granola/`. Each extract is a markdown file with YAML frontmatter (source_id, date, topics_detected, relevance_score, sensitivity_class, extract_type). Body contains extracted content.

**Important fidelity note:** Raw extracts are curated highlights, NOT full transcripts. The Granola API returns richer data (full summaries, private notes, attendee lists) than what the ingestion skill captures. The compile-meetings skill must read from Granola directly for full fidelity — raw extracts are a fallback source only.

No changes needed to this layer.

### Layer 2: Compilation (new)

#### Bootstrap (one-time, immediate)

The consolidation session on May 26 already produced complete structured extractions from all 142 meetings via 7 parallel agents. This data exists in my context and in the agent output files. **The bootstrap step converts this existing extraction into `meetings.json`** — no LLM calls needed for the initial dataset.

A script (`dashboard-server/scripts/bootstrap-meetings.js`) reads the consolidation HTML and/or the agent output files and writes the initial `meetings.json`. This gives us day-one data without waiting for a full recompilation.

#### Ongoing compilation

A new `/compile-meetings` skill handles future updates:

1. Reads the Granola meeting list via MCP (`list_meetings` with date range since last compilation)
2. Fetches full meeting content via MCP (`get_meetings` in batches of 10)
3. Extracts structured data (actions, decisions, people, learnings, numbers) using Claude
4. Merges new extractions into the existing `meetings.json` (append, don't rebuild)
5. Recalculates timeline and threads sections from the full dataset

**Incremental by default.** Only processes meetings newer than `compiled_at` timestamp. Full recompilation available via `--full` flag but expensive (~15 API calls + LLM extraction).

**Output file:** `intelligence/compiled/meetings.json`

**Schema:**
```json
{
  "compiled_at": "2026-06-01T12:00:00Z",
  "meeting_count": 142,
  "date_range": { "start": "2026-03-06", "end": "2026-05-22" },
  "sections": {
    "actions": [
      {
        "id": "act_20260521_glen_narrative-lead-jd",
        "date": "2026-05-21",
        "owner": "Glen",
        "owner_normalised": "glen_pryer",
        "description": "Write Narrative Lead job description",
        "workstream": "couch_heroes",
        "source_file": "2026-05-21_hr-weekly-meeting.md",
        "source_meeting_id": "93bc0089-ff97-4921-9332-2a558e7d15d4",
        "status": "open"
      }
    ],
    "decisions": [
      {
        "id": "dec_20260520_cosmetics-only",
        "date": "2026-05-20",
        "decision": "Cosmetics-only monetisation — no pay-to-win weapons",
        "rationale": "Foundational design pillar",
        "workstream": "couch_heroes",
        "source_file": "2026-05-20_game-direction.md"
      }
    ],
    "people": [
      {
        "id": "per_vardis",
        "name": "Vardis",
        "name_normalised": "vardis",
        "role": "CEO / Founder | Couch Heroes",
        "workstreams": ["couch_heroes"],
        "notes": ["Exceptionally receptive...", "Used inappropriate language 3x..."],
        "meetings_seen": 24,
        "last_seen": "2026-05-22"
      }
    ],
    "learnings": [
      {
        "id": "lrn_20260413_nia-validates-audit",
        "date": "2026-04-13",
        "insight": "Nia Kiigan's independent assessment validated Glen's internal audit exactly.",
        "context": "Team believed mid-production; Glen confirmed pre-production.",
        "workstream": "couch_heroes",
        "source_file": "2026-04-13_vc-nia-kiigan.md"
      }
    ],
    "numbers": [
      {
        "id": "num_20260504_nbi-revenue",
        "date": "2026-05-04",
        "figure": "55K/month",
        "context": "Current NBI revenue (Couch 30K + Lighthouse 25K + Activision 5K)",
        "workstream": "nbi",
        "category": "revenue"
      }
    ],
    "timeline": [
      {
        "period": "March 6-18",
        "label": "Post-GDC Activation",
        "summary": "Glen returns from GDC with 5-6 client leads..."
      }
    ],
    "threads": [
      {
        "id": "thr_cto-hire",
        "title": "CTO Hire — Still Open",
        "status": "active",
        "summary": "Pipeline: Maurizio, Per-Olof, Chris Southall, Pair, Otto...",
        "workstream": "couch_heroes"
      }
    ]
  }
}
```

#### ID strategy (stable across recompilations)

IDs are human-readable slugs, NOT content hashes. Format: `{type}_{date}_{slug}`.

- Actions: `act_20260521_glen_narrative-lead-jd` (type + date + owner + short slug)
- Decisions: `dec_20260520_cosmetics-only` (type + date + topic slug)
- People: `per_vardis` (type + normalised name — stable, never changes)
- Learnings: `lrn_20260413_nia-validates-audit` (type + date + topic slug)
- Numbers: `num_20260504_nbi-revenue` (type + date + topic slug)
- Threads: `thr_cto-hire` (type + topic slug)

When the compiler encounters an item it's seen before (same source meeting + same owner + similar description), it reuses the existing ID. This prevents status overrides from being orphaned on recompilation.

#### Workstream classification

Meetings are classified by a participant-based mapping table:

| Participant domain / name | Workstream |
|---|---|
| `@couch-heroes.com` | couch_heroes |
| `@lighthousegames.com` | lighthouse |
| `@nbi-consulting.com` only (no client participants) | nbi |
| `@playgoals.com` | playgoals |
| `@thesargeuniverse.com` | sarge |
| `@truesearch.com` + CH participants | couch_heroes |

If a meeting has participants from multiple workstreams, the majority wins. Items within a meeting can override if context is clear (e.g., NBI cash flow discussion in a CH executive meeting gets workstream `nbi`).

#### Person normalisation

The compiler maintains a canonical person registry:

```json
{
  "glen_pryer": { "display": "Glen Pryer", "aliases": ["Glen", "GP", "g.pryer"] },
  "vardis": { "display": "Vardis", "aliases": ["Vardy", "Varis"] },
  "lorenza_menna": { "display": "Lorenza Menna", "aliases": ["Lorenza", "Lorenzo"] }
}
```

Stored in `intelligence/compiled/person_registry.json`. Built during initial bootstrap from the consolidation data. The compiler matches mentions against aliases and writes `owner_normalised` / `name_normalised` fields for reliable filtering.

#### Compilation trigger

- **Bootstrap:** Run `node dashboard-server/scripts/bootstrap-meetings.js` once (generates initial JSON from consolidation data)
- **Incremental:** Run `/compile-meetings` skill after `/ingest-granola` or manually
- **Cache refresh:** "Refresh" button in CC hits `POST /api/meetings/refresh` which re-reads the JSON from disk

### Layer 3: Serving (new)

**Server components:**

1. **`dashboard-server/lib/meetings-intelligence.js`** — Reads `intelligence/compiled/meetings.json` into an in-memory cache on first request. Merges status overrides from Postgres. Cache invalidated by the refresh endpoint or on file change (fs.watch).

2. **`dashboard-server/routes/meetings-intelligence.js`** — API endpoints:
   - `GET /api/meetings/compiled` — Returns full compiled data with DB status overrides merged. Supports query params: `workstream`, `status`, `person`, `q` (full-text search), `date_from`, `date_to`
   - `PATCH /api/meetings/actions/:id` — Update action status (open/done/overdue). Writes to Postgres.
   - `POST /api/meetings/refresh` — Clears in-memory cache, re-reads `meetings.json` from disk (admin only). Does NOT run LLM extraction.
   - `GET /api/meetings/stats` — Summary counts for the header strip (cached, updates on refresh)

3. **Migration `0XX_meeting_action_status.sql`:**
```sql
CREATE TABLE meeting_action_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('open', 'done', 'overdue')),
  updated_by TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_meeting_action_status_action ON meeting_action_status(action_id);
```

**Caching strategy:** The compiled JSON is read into memory once and served from cache. Cache is invalidated by:
- `POST /api/meetings/refresh` endpoint
- `fs.watch` on `intelligence/compiled/meetings.json` (picks up external compilation)
- Server restart

For a ~200KB JSON file with hundreds of items, in-memory serving is fast and appropriate. No pagination needed at current scale; add if meeting count exceeds 500.

## Frontend Design

### Tab Registration

Add `'meetings'` to `_ccValidTabs` array and the tabs definition in `_ccRenderPage()`. Keyboard shortcut: `6` (following existing 1-5 pattern).

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ MEETINGS INTELLIGENCE                           [Refresh ↻] │
│ 142 meetings | Mar 6 - May 22 | Last compiled: 2h ago       │
│ ⚠ Data refreshed via /compile-meetings skill, not live.      │
├────────┬────────┬────────┬──────┬────────┬─────────┬────────┤
│Actions │Decisions│People │Learn │Numbers │Timeline │Threads │
├────────┴────────┴────────┴──────┴────────┴─────────┴────────┤
│ ┌─Filter Bar──────────────────────────────────────────────┐ │
│ │ [Date Range ▾] [Workstream ▾] [Person ▾] [Status ▾] 🔍 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─Content Area (swaps based on active sub-tab)────────────┐ │
│ │                                                         │ │
│ │  (tables, cards, timeline items, etc.)                  │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

The "Last compiled" timestamp and the info line make it explicit that this is batch-compiled data, not a live Granola feed. The Refresh button re-reads from disk (for when you've just run `/compile-meetings`).

### Sub-Tab Content

**Actions:** Table with columns: Date, Owner, Action, Workstream tag, Status tag (clickable — cycles open→done→overdue on click, sends PATCH). Sorted by date descending. Status tags use existing CC tag styling (green/yellow/red).

**Decisions:** Table with columns: Date, Decision, Rationale, Workstream tag. Sorted by date descending.

**People:** Card grid (2-3 columns). Each card shows name, role, workstream tags (can span multiple), bullet-point notes, meetings seen count, last seen date. Cards use the existing CC card pattern.

**Learnings:** Insight boxes (purple left-border, adapted to CC design tokens). Date, insight text, context, workstream tag.

**Numbers:** Grouped tables by category (NBI Financials, CH Financials, Compensation, Lighthouse). Figure highlighted in green. Date and context columns.

**Timeline:** Vertical timeline with date headers and narrative summaries.

**Threads:** Cards with title, status badge (active/resolved), summary text, workstream tag.

### Filter Bar

- **Date range:** Dropdown with presets (Last 7 days, Last 30 days, Last 90 days, All) + custom range
- **Workstream:** Multi-select chips: CH, Lighthouse, NBI, Sarge, PlayGOALS, All
- **Person:** Searchable dropdown populated from `person_registry.json` (canonical names)
- **Status:** (Actions sub-tab only) Open, Done, Overdue, All
- **Search:** Full-text search across all sections, highlights matches

Filters persist in localStorage per the existing CC pattern.

### Stats Strip

```
[142 Meetings] [78 Days] [XX Open Actions] [XX Decisions] [XX People]
```

"Meetings" count comes from `meeting_count` in the compiled JSON (distinct meetings, not extracts). Counts update based on active filters.

### Empty States

| State | Display |
|---|---|
| `meetings.json` doesn't exist | "No meetings data compiled yet. Run `/compile-meetings` in Claude Code to get started." + link to docs |
| JSON exists but section is empty | "No [actions/decisions/etc.] found for the current filters." with a "Clear filters" link |
| All actions filtered out | "No actions match your filters." + filter summary showing what's active |
| Recompile in progress | N/A — recompilation happens outside the server. Refresh button just re-reads from disk. |

### Styling

Use the CC's existing CSS custom properties (`--cc-card-bg`, `--cc-border`, etc.). Map consolidation patterns to CC equivalents:

| Consolidation | CC Equivalent |
|---|---|
| `.tag-green/yellow/red` | Existing CC status tags |
| `.person-card` | `.cc-card` with name/role header |
| `.insight-box` | Purple-bordered `.cc-card` variant |
| `.timeline-item` | New CSS, adapted to CC tokens |
| `table` | Existing CC table styles |

### Responsive Behaviour

- Desktop (>1200px): Full layout, 3-column people grid, full filter bar
- Tablet (800-1200px): 2-column people grid, filters stack
- Mobile (<800px): Single column, filter bar collapses to icon

## Implementation Scope

### Estimated frontend addition: ~600 lines

7 sub-tab renderers (~60 lines each = 420), filter bar (~80), status edit handler (~30), tab registration + data loading (~70). Significant but bounded. Each renderer is a self-contained function following the existing CC pattern. Does not push the monolith toward modularisation — that's a separate backlog item.

### Files to create:
- `dashboard-server/scripts/bootstrap-meetings.js` — One-time script to generate initial `meetings.json` from consolidation data
- `intelligence/compiled/meetings.json` — Compiled meeting intelligence (generated, not hand-written)
- `intelligence/compiled/person_registry.json` — Canonical person name mappings
- `dashboard-server/routes/meetings-intelligence.js` — API endpoints
- `dashboard-server/lib/meetings-intelligence.js` — File parser, cache, DB merge
- `dashboard-server/migrations/0XX_meeting_action_status.sql` — Status override table

### Files to modify:
- `nbi_project_dashboard.html` — Add Meetings tab to CC (tab registration, render function, sub-tabs, filter bar, 7 section renderers, status edit handler, empty states)
- `dashboard-server/server.js` — Mount meetings-intelligence routes

### Files NOT modified:
- Existing intelligence pipeline files
- Existing CC tabs
- Existing intelligence routes

## Testing

- Unit tests for `meetings-intelligence.js` (file parsing, filter logic, status merge, cache invalidation)
- API tests for all endpoints (GET with filters, PATCH status, POST refresh)
- E2E test: navigate to CC > Meetings tab, verify data loads, filter by workstream, edit action status, verify refresh
- Verify existing CC tabs unaffected
- Test empty state when `meetings.json` absent

## Known Limitations (v1)

1. **Data freshness depends on running `/compile-meetings` skill.** The CC tab reads from a file, not a live API. The UI makes this explicit with the "Last compiled" timestamp.
2. **Full recompilation is expensive** (~15 Granola API calls + LLM extraction for 142 meetings). Incremental updates (new meetings only) are the default.
3. **Person normalisation is best-effort.** The registry covers known participants from the initial consolidation. New names from future meetings may need manual addition.
4. **Workstream classification is participant-based.** Cross-workstream discussions (e.g., NBI financials in a CH executive meeting) may be misclassified at the meeting level. Item-level overrides handle this where the LLM extraction is context-aware.

## Out of Scope

- Live Granola API integration at render time
- Automated compilation scheduling (skill-triggered for now)
- Meeting transcript viewer (structured extracts only)
- Integration with other CC tabs (Financial Pulse, AIOS, etc.)
- The `/compile-meetings` skill itself (separate spec if needed; bootstrap script covers v1)
