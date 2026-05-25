# Intelligence Dashboard — Design Spec

**Date:** 2026-05-25
**Status:** Draft for Glen review
**Branch:** feature/command-centre
**Depends on:** Intelligence Pipeline (complete), Portfolio Dashboard v4 (live)

---

## What This Is

Two new components for the WorkSage Portfolio Dashboard that surface intelligence pipeline output:

1. **Morning Brief Card** — a panel on the main dashboard showing the current intelligence brief
2. **Intelligence Tab** — a dedicated view showing pipeline health, research findings, bank state, and the research log

Both are read-only mirrors of the markdown files the pipeline already produces. The intelligence pipeline continues to run via Claude Code skills and cloud routines — WorkSage just displays the output.

---

## Component 1: Morning Brief Card

### What Glen Sees

A panel on the Portfolio Dashboard (alongside Progress Status, Upcoming Milestones, etc.) that renders the current intelligence brief. When Glen opens WorkSage in the morning, the brief is right there — no Claude session needed to see what's new.

### Content Source

The server reads `intelligence/synthesis/intelligence_brief.md`, parses it, and serves it as structured JSON. The frontend renders it as a card with collapsible sections.

### Layout

Sits in the bottom panel row (3-column grid). Replaces nothing — added as a 4th column on wide screens, or stacks below on narrower viewports.

```
┌─────────────────────────────────────────────────────────┐
│  KPI Strip (existing)                                   │
├─────────────┬──────────────┬────────────┬───────────────┤
│  Progress   │  Milestones  │  Timeline  │  Work Types   │
│  Status     │              │            │               │
├─────────────┼──────────────┼────────────┼───────────────┤
│  Completing │  Team        │  Needs     │  Intelligence │
│  Soon       │  Workload    │  Attention │  Brief        │
└─────────────┴──────────────┴────────────┴───────────────┘
```

### Card Design

```
┌─ Intelligence Brief ──────────────── 25 May 2026 ─┐
│                                                     │
│  ▸ What's New (3 items)                            │
│    • industry_current updated: Google/Epic drops    │
│      Play Store commission to 20%                   │
│    • games_pitch_decks: 5 new research findings    │
│    • 27 local file extracts processed              │
│                                                     │
│  ▸ Pipeline Health                                  │
│    7 banks active · 104 extracts · 0 stale         │
│                                                     │
│  ▸ Actions Needed (2)                              │
│    • 4 new bank suggestions pending approval       │
│    • ~50 binary files need conversion              │
│                                                     │
│  ─── Last updated: 06:57 ──────────────────────── │
└─────────────────────────────────────────────────────┘
```

- Sections are collapsible (▸/▾). "What's New" expanded by default, others collapsed.
- "Actions Needed" gets a subtle amber indicator dot when items exist.
- If the brief says "Pipeline quiet since last session" — the card shows just that one line, compact.
- Date in the header is the brief's generation date. If older than 24 hours, show "(stale)" indicator.

### API Endpoint

```
GET /api/intelligence/brief
```

**Response:**
```json
{
  "generated": "2026-05-25T05:57:00Z",
  "stale": false,
  "sections": {
    "whats_new": [
      {"bank": "industry_current", "summary": "Google/Epic drops Play Store commission to 20%"},
      {"bank": "games_pitch_decks", "summary": "5 new research findings from mobile pitch deck cycle"}
    ],
    "pipeline_health": {
      "banks_active": 7,
      "banks_stale": 0,
      "total_extracts": 104,
      "pending_promotion": 0,
      "pending_sensitive": 0
    },
    "actions_needed": [
      "4 new bank suggestions pending approval",
      "~50 binary files need document conversion"
    ],
    "context": "Intelligence pipeline bootstrap session. Most relevant banks: industry_current, games_pitch_decks, client_couch_heroes"
  },
  "raw_markdown": "# Intelligence Brief — 2026-05-25\n..."
}
```

**Implementation:** Server reads `intelligence/synthesis/intelligence_brief.md`. Parses the markdown into sections using heading-level splits. Returns both structured JSON (for the card) and raw markdown (for a "view full brief" modal).

---

## Component 2: Intelligence Tab

### What Glen Sees

A new tab in the Portfolio Dashboard navigation: "Intelligence" (or "Intel" if space is tight). Shows the full pipeline state — what the autonomous agents are doing, what they've found, and where the knowledge gaps are.

### Tab Structure

```
┌─ Intelligence ──────────────────────────────────────────┐
│                                                          │
│  ┌─ Bank Health ───────────────────────────────────────┐│
│  │                                                      ││
│  │  Bank              Lines  Sources  Updated   Status  ││
│  │  ──────────────────────────────────────────────────  ││
│  │  industry_current   207    18      Today     Fresh   ││
│  │  games_pitch_decks  183    15      Today     Fresh   ││
│  │  production_methods 174    35      Today     Fresh   ││
│  │  client_couch_heroes 139   19      Today     Fresh   ││
│  │  forecast_models    136    18      Today     Fresh   ││
│  │  personal_insights  131    20      Today     Fresh   ││
│  │  client_patterns    127    17      Today     Fresh   ││
│  │                                                      ││
│  │  Total: 1,097 lines across 142 source references     ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  ┌─ Recent Research ───────────────────────────────────┐│
│  │                                                      ││
│  │  Today — industry_current (cycle 2)                  ││
│  │  • Google/Epic 20% commission settlement      [R:9] ││
│  │  • UK ASA loot box enforcement begins         [R:8] ││
│  │  • Morgan Stanley AI $22B gaming report       [R:9] ││
│  │  • Grand Games $70M Series B                  [R:8] ││
│  │  • Midsummer Studios closure                  [R:7] ││
│  │  • Fortnite global App Store return           [R:8] ││
│  │  • Take-Two/Zynga mobile turnaround           [R:7] ││
│  │                                                      ││
│  │  Today — pitch_decks (week 1 mobile)                 ││
│  │  • Homa Games $50M Series A (13 slides)       [R:9] ││
│  │  • The Games Fund VC pitch template           [R:8] ││
│  │  • a16z Games Fund LP deck analysis           [R:8] ││
│  │  • Little Polygon 50+ pitch failure           [R:7] ││
│  │  • Voodoo fundraising trajectory              [R:8] ││
│  │                                                      ││
│  │  ▸ Show older research...                            ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  ┌─ Pipeline Activity ──────── ┌─ Pending Actions ─────┐│
│  │                              │                       ││
│  │  Sources         Last Run    │  Bank Suggestions (4) ││
│  │  ────────────────────────    │  ▸ consulting_framewks││
│  │  claude_sessions  Today      │  ▸ studio_staffing    ││
│  │  chatgpt          Today      │  ▸ salary_benchmarks  ││
│  │  onedrive         Today      │  ▸ investor_database  ││
│  │  downloads        Today      │                       ││
│  │  web_research     Today      │  Binary Files         ││
│  │  granola          Pending    │  ~50 files need       ││
│  │  gmail            Pending    │  conversion tooling   ││
│  │  slack            Pending    │                       ││
│  │                              │                       ││
│  │  Next scheduled:             │                       ││
│  │  20:03 — Granola ingestion   │                       ││
│  │  20:07 — Gmail ingestion     │                       ││
│  │  20:12 — Slack ingestion     │                       ││
│  └──────────────────────────────┴───────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

### Sub-panels

#### Bank Health Table
- Sortable by any column
- Status uses colour coding: Fresh (green), Approaching stale (amber), Stale (red)
- Click a bank row to expand and show its summary (from `intelligence/synthesis/bank_summaries/{slug}.md`)
- Bar indicator showing lines used vs 500-line max

#### Recent Research
- Groups by date and domain
- Each finding shows: title, relevance score badge, source URL link
- Expandable to show full extract content
- "Show older research" loads from the research log

#### Pipeline Activity
- Source list with last-run dates and status indicators
- Green = ran successfully today, Amber = pending first run, Red = failed or stale
- Shows next scheduled run times

#### Pending Actions
- Bank suggestions with approve/dismiss buttons (calls a new API endpoint to create the bank)
- Pending sensitive extracts with approve/reject
- Binary file count as informational

### API Endpoints

```
GET /api/intelligence/banks
```
Returns all bank metadata: slug, lines, sources, last_compiled, shelf_life, status, summary.

```
GET /api/intelligence/research?limit=20
```
Returns recent research log entries with findings, scores, and source URLs.

```
GET /api/intelligence/pipeline
```
Returns pipeline_state.md parsed as JSON: source run dates, bank compilation status, pending items.

```
GET /api/intelligence/extract/:id
```
Returns a single raw extract's full content (for the expandable view).

```
POST /api/intelligence/bank-suggestion/:slug/approve
POST /api/intelligence/bank-suggestion/:slug/dismiss
```
Creates a new bank (schema + registry entry) or dismisses the suggestion.

**Implementation:** All read endpoints parse the existing markdown files in `intelligence/`. No new database tables. The approve/dismiss endpoints modify `intelligence/config/bank_registry.md` and create the schema file.

---

## Server Implementation

### File Reader Utility

A shared utility that reads and parses intelligence markdown files:

```javascript
// dashboard-server/lib/intelligence.js

function readBrief()        // Parses intelligence_brief.md → structured JSON
function readBankHealth()   // Reads all banks/*.md frontmatter → array
function readBankSummary(slug) // Reads bank_summaries/{slug}.md → object
function readResearchLog(limit) // Parses research_log.md → array of entries
function readPipelineState() // Parses pipeline_state.md → object
function readExtract(source, id) // Reads a raw extract → object
```

All functions are synchronous file reads with markdown parsing. No database involvement. The intelligence directory is outside `dashboard-server/` — use a relative path (`../intelligence/`).

### Route File

```javascript
// dashboard-server/routes/intelligence.js

router.get('/brief', requireNBI, ...)
router.get('/banks', requireNBI, ...)
router.get('/research', requireNBI, ...)
router.get('/pipeline', requireNBI, ...)
router.get('/extract/:source/:id', requireNBI, ...)
router.post('/bank-suggestion/:slug/approve', requireAdmin, ...)
router.post('/bank-suggestion/:slug/dismiss', requireAdmin, ...)
```

All endpoints require NBI authentication. Bank suggestion management requires admin.

---

## Frontend Implementation

### Brief Card

Added to `renderPortfolioDashboard()` in the bottom panel row. Fetches `/api/intelligence/brief` on dashboard render. Uses the existing `.pf__panel` pattern with collapsible sections via click handlers.

### Intelligence Tab

New tab added to the main tab list. Renders via a new `renderIntelligence(el)` function following the same module pattern as other tabs. Fetches all three endpoints on tab activation. Uses the existing grid layout classes (`.pf__panels`, `.pf__panel`).

### CSS

Extends existing dashboard CSS. New classes:
- `.intel__bank-bar` — progress bar showing lines/500
- `.intel__status--fresh/stale/pending` — status colour indicators
- `.intel__score` — relevance score badge
- `.intel__finding` — research finding row with expandable content

No new CSS file — added to the existing stylesheet section in `nbi_project_dashboard.html`.

---

## What This Does NOT Do

- Does not replace Claude Code's conversational surfacing. The dashboard is read-only visibility.
- Does not let Glen edit banks, modify extracts, or run pipeline operations from the UI. Those happen in Claude Code.
- Does not add new database tables. All data comes from reading intelligence/ markdown files.
- Does not change the pipeline itself. The same skills, routines, and compilation process continue unchanged.

---

## Implementation Estimate

- **Brief card:** 1 server endpoint + 1 frontend component. Small.
- **Intelligence tab:** 4 server endpoints + 1 tab module with 4 sub-panels. Medium.
- **Total:** ~200 lines server (routes + file parser), ~400 lines frontend (tab + card), ~50 lines CSS.

---

## Open Questions

1. Should the Intelligence tab be visible to non-admin users? The banks contain internal strategy. Recommendation: admin-only, same as the AIOS tab.
2. Should bank suggestion approve/dismiss work from the UI, or is that better left in Claude Code where the full context is available? Recommendation: UI for simple approve/dismiss, Claude Code for "approve with modifications."
3. Should the brief card auto-refresh, or only load on page open? Recommendation: load on page open, no polling. The brief changes once per day.
