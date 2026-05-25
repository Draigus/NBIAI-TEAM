# NBI Intelligence Pipeline — Design Spec

**Date:** 2026-05-25
**Status:** Approved design, pending implementation plan
**Branch:** feature/command-centre
**Supersedes:** Karpathy capabilities build (2026-05-13) — extends /compile-client and /autoresearch into a full pipeline

---

## Problem Statement

NBI has an AIOS (33 roles, 14 brain modules, skills system, session continuity) and Karpathy-derived knowledge tools (/compile-client, /autoresearch). These systems don't feed each other. Knowledge is static, manually written, and reactive. Glen has years of accumulated intelligence across Claude chats, ChatGPT exports, Granola meetings, emails, Slack, OneDrive documents, and downloads — none of which is structured or accessible to the AIOS.

The system should proactively gather, structure, and surface knowledge without Glen having to go looking for it.

---

## Design Goals

1. **Proactive, not reactive** — the system goes out and finds things, surfaces them when relevant, suggests new knowledge domains as they emerge
2. **Comes to Glen, not the other way around** — intelligence pushes into active work sessions based on what's being worked on right now
3. **Dynamic knowledge banks** — not a fixed taxonomy; the system recognises new topic clusters and suggests/creates new banks
4. **Quality over quantity** — scoring gates prevent noise from polluting working knowledge
5. **Full source coverage** — Granola, Gmail, Slack, OneDrive, Downloads, ChatGPT, Claude sessions, web research
6. **Integrated with AIOS** — role dispatch auto-loads relevant banks; existing patterns extended, not replaced

---

## Worked Example: End-to-End Knowledge Flow

Before the architecture detail, here is one piece of knowledge traced through all five layers. This makes the system concrete.

**Source event:** Glen has a Granola meeting with Vardis (Couch Heroes CEO) on 2026-05-28. During the meeting, Vardis mentions they're considering switching from 2-week sprints to 6-week cycles based on Shape Up methodology, because their remote team struggles with the overhead of biweekly planning.

**Layer 1 — Ingestion:**

The `/ingest-granola` routine fires at 20:00 that evening. It pulls today's meetings via MCP, finds this one (Vardis is in `brain/clients_detailed.md`), and produces:

```markdown
---
source: granola
source_id: meeting_2026-05-28_vardis_production
source_path: granola://meetings/abc123
ingested: 2026-05-28
topics_detected: [production-methodology, remote-work, sprint-planning, shape-up]
relevance_score: 9
novelty_score: 7
actionability_score: 8
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitive: false
extract_type: insight
sensitivity_class: internal
---

# Couch Heroes Considering Shape Up (6-week cycles)

## Key Content
Vardis (CEO) raised that biweekly sprint planning is consuming too much overhead for their 55-person remote team. Considering switching to Basecamp's Shape Up methodology: 6-week build cycles with 2-week cooldowns. Motivation: reduce planning ceremony overhead while maintaining accountability. No decision made yet — exploring.

## Decisions / Insights
- CH team finds 2-week sprints too ceremony-heavy for remote work at their scale
- Shape Up's 6-week cycle is being evaluated as an alternative
- Key concern: will longer cycles reduce accountability or create drift?
- This is exploration, not a committed decision

## Context
Meeting: Glen + Vardis, 2026-05-28. Part of ongoing production advisory.
Related: CH is ~55 people, 100% remote, UK + Greece split.

## Applicability
Relevant when: advising CH on production methodology
Relevant when: comparing sprint lengths for remote studios at 40-80 headcount
Relevant when: building recommendations around Shape Up for game studios
```

**Layer 2 — Compilation:**

The ingestion run deposited 3 new extracts for `production_methods` bank (this meeting, plus 2 research findings from the weekly production research routine). Threshold met (>= 3). Compilation triggers.

The compilation agent reads the current `production_methods` bank, reads the 3 new extracts, and integrates:
- Adds to "## By Team Scale > 40-80 People" section: Shape Up as an evaluated option for remote studios, with CH's rationale as a real-world data point
- Adds to "## Framework Comparison" table: Shape Up row with pros/cons specifically for game studios
- Updates Executive Summary: "Now includes Shape Up evaluation data from a 55-person remote game studio"
- Source Index: adds `[source: meeting_2026-05-28_vardis_production]`

**Layer 3 — Synthesis:**

Bank changed significantly (new framework added). Brief regenerates:
```
## What's New Since Last Session
- production_methods bank updated: Shape Up methodology added with real evaluation data from Couch Heroes (55-person remote studio considering switch from 2-week sprints)
```

**Layer 4 — Surfacing:**

Two days later, Glen starts a session about a different client (hypothetical: a 40-person remote studio asking about production frameworks). The system:
1. Reads the intelligence brief → sees production_methods was recently updated
2. Detects the conversation topic → production planning for a remote studio
3. Loads `production_methods` bank
4. Proactively surfaces: "Worth noting — the production_methods bank was updated 2 days ago with real evaluation data from Couch Heroes (55 people, remote) considering Shape Up as an alternative to biweekly sprints. Their specific concern: ceremony overhead in remote context. Directly relevant to this client's situation."

**Layer 5 — Research (background):**

The weekly production methodology research routine notices Shape Up appearing in the bank and adjusts its next cycle's focus: "This cycle: look for game studios that have adopted Shape Up. Outcomes, adaptations, what worked/failed."

The following week, it finds a GDC talk and two blog posts from studios that actually implemented Shape Up. These flow through ingestion → compilation → the bank now has multiple data points instead of one.

---

This is the system working. One meeting insight → structured extract → compiled into a bank → surfaced when relevant → triggers deeper research → bank grows. The knowledge compounds.

---

## Architecture: Five-Layer Intelligence Pipeline

```
+-------------------------------------------------------------------+
|  LAYER 5: RESEARCH                                                |
|  Scheduled agents that proactively find new material              |
|  (web search, Apify scrapers, industry monitoring)                |
+------------------------------+------------------------------------+
                               |
                               v
+-------------------------------------------------------------------+
|  LAYER 1: INGESTION                                               |
|  Pull from sources -> raw extracts with metadata                  |
|  (Granola, Gmail, Slack, OneDrive, Downloads, ChatGPT, Claude)    |
+------------------------------+------------------------------------+
                               |
                               v
+-------------------------------------------------------------------+
|  LAYER 2: COMPILATION                                             |
|  Structure raw extracts into themed knowledge banks               |
|  Quality gate: score against criteria before promotion            |
+------------------------------+------------------------------------+
                               |
                               v
+-------------------------------------------------------------------+
|  LAYER 3: SYNTHESIS                                               |
|  Brain modules = lean executive summaries pointing to banks       |
|  Updated when banks change significantly                          |
+------------------------------+------------------------------------+
                               |
                               v
+-------------------------------------------------------------------+
|  LAYER 4: SURFACING                                               |
|  Role dispatch auto-loads relevant banks                          |
|  On-demand querying, morning briefs, proactive mid-session push   |
+-------------------------------------------------------------------+
```

---

## Directory Structure

```
intelligence/
  raw/                         # Layer 1 output (never loaded into context directly)
    granola/                   # {meeting-date}_{slug}.md
    gmail/                     # {date}_{thread-slug}.md
    slack/                     # {date}_{channel}_{slug}.md
    chatgpt/                   # {conversation-id}_{slug}.md
    claude_sessions/           # {date}_{session-slug}.md
    onedrive/                  # {date}_{filename-slug}.md
    downloads/                 # {date}_{filename-slug}.md
    web_research/              # {domain}/{date}_{slug}.md
  banks/                       # Layer 2 output (loaded by roles on demand)
    {dynamic -- created as topics emerge}
  synthesis/                   # Layer 3 output (loaded at session start)
    intelligence_brief.md      # Current state, what's new, what's relevant
    bank_summaries/            # One summary per bank (~50 lines max)
  config/
    bank_registry.md           # Master list of all banks with slugs, descriptions, criteria
    bank_schemas/              # Schema templates for each bank
    scoring_criteria/          # Quality gate rubrics per source type
    research_briefs/           # Instructions for research agents per domain
    source_config.md           # Source connector configuration (paths, filters, schedules)
    suppression_rules.md       # When NOT to surface knowledge
    pipeline_rules.md          # Orchestration triggers, thresholds, budget rules
  prompts/                     # Actual agent prompts (the system instructions)
    ingestion_agent.md         # Prompt for extraction agents
    compilation_agent.md       # Prompt for bank compilation
    research_agent.md          # Prompt for research agents
    brief_agent.md             # Prompt for brief generation
    topic_detection.md         # Prompt for topic classification
  research_log.md              # Audit trail: what was researched, when, outcomes
  pipeline_state.md            # Current state: last run per source, bank sizes, health
```

The `brain/` directory remains unchanged — business context, working state, people, decisions. The intelligence system feeds into brain modules via the synthesis layer but does not replace them.

---

## Layer 1: Ingestion — Full Connector Specifications

### Source Overview

| Source | Access Method | Content Type | Batch Size |
|--------|--------------|--------------|------------|
| Granola | MCP (mcp__claude_ai_Granola__*) | Meeting transcripts, decisions, action items | Last 30 days per run |
| Gmail | MCP (mcp__claude_ai_Gmail__*) | Business threads, client comms, industry newsletters | Last 14 days per run |
| Slack | MCP (mcp__claude_ai_Slack__*) | Team discussions, decisions, shared links | Last 14 days per run |
| OneDrive | Local filesystem (D:\OneDrive\) | Documents, presentations, spreadsheets, research | Changed since last run |
| Downloads | Local filesystem (C:\Users\gpbea\Downloads\) | PDFs, reports, decks, saved material | Last 90 days, filtered |
| ChatGPT export | Local file (JSON on OneDrive) | Past research, analysis, brainstorming, decisions | One-time bulk + delta |
| Claude sessions | Repo (session_logs/, session_handoffs/) | Decisions, work context, insights | Since last run |
| Web research | Web search + Apify | Industry reports, examples, methodologies | Per research brief |

### Raw Extract Format

Every raw extract follows this structure:

```markdown
---
source: {granola|gmail|slack|chatgpt|claude|onedrive|downloads|web_research}
source_id: {unique identifier within source}
source_path: {original file path or message ID or URL}
ingested: {YYYY-MM-DD}
topics_detected: [{topic-slug}, ...]
relevance_score: {1-10, scored by ingestion agent}
novelty_score: {1-10, scored by ingestion agent}
actionability_score: {1-10, scored by ingestion agent}
bank_candidates: [{bank-slug}, ...]
new_bank_suggestions: [{topic that doesn't match existing banks}]
sensitivity_class: {public|internal|client_scoped|anonymisable|restricted}
extract_type: {decision|insight|exemplar|methodology|data_point|contact|action_item}
---

# {Title / Subject}

## Key Content
{Structured extraction of the important information -- NOT a transcript dump.
This section contains only the distilled knowledge, structured for retrieval.
Maximum 200 words. Dense, factual, no filler.}

## Decisions / Insights
{Explicit decisions made, lessons learned, or patterns recognised.
Each item is one clear statement with the decision-maker identified.
Format: "- [Person] decided/concluded/observed: [statement]"}

## Context
{Who was involved, what prompted this, what it relates to.
Date, participants, project/client connection.
One paragraph max.}

## Applicability
{Specific conditions under which this knowledge is useful.
Format: "Relevant when: [specific scenario]"
Minimum 2, maximum 5 applicability statements.}
```

### The Topic Detection Algorithm

Topic detection is NOT keyword matching. It uses the following process, specified in `intelligence/prompts/topic_detection.md`:

**Step 1: Read the bank registry.** Before classifying any extract, the ingestion agent reads `intelligence/config/bank_registry.md` which contains:

```markdown
# Bank Registry

| Slug | Description | Accepts Content About |
|------|-------------|----------------------|
| production_methods | Studio production frameworks, sprint methodologies, milestone planning | How studios organise work: sprints, cycles, milestones, team coordination, remote work patterns |
| games_pitch_decks | Pitch deck examples, structures, what works by platform/stage | Investment pitches, deck structure, VC expectations, fundraising for games |
| forecast_models | Revenue and player forecasting methodologies | Financial models, player projections, LTV, retention curves, market sizing |
| industry_current | Current market state, trends, deals | Acquisitions, funding rounds, platform changes, market shifts |
| client_patterns | Cross-client learnings and engagement patterns | What worked across clients, engagement approaches, advisory patterns |
| personal_insights | Glen's decisions, preferences, working patterns | Glen's choices, reasoning, rejected approaches, strategic thinking |
| client_couch_heroes | Couch Heroes specific knowledge | Anything specific to CH: their team, their game, their decisions |
```

**Step 2: Classify against existing banks.** For each piece of content, the agent asks: "Which existing banks would benefit from this knowledge?" It assigns `bank_candidates` based on semantic match to the "Accepts Content About" column — not keyword matching, but meaning matching.

**Step 3: Detect novel topics.** If the content's primary topic doesn't fit well into ANY existing bank (confidence < 70% match to any bank's description), the agent assigns `new_bank_suggestions` with:
- A proposed topic slug
- A one-sentence description of what this topic covers
- Why it doesn't fit existing banks

**Step 4: Clustering happens at compilation time.** The compilation layer counts `new_bank_suggestions` with similar slugs. "Similar" means: same slug, OR slugs that a quick LLM judgment call says are the same topic expressed differently (e.g., "remote-work-practices" and "distributed-team-management" are the same topic). When 3+ extracts from 2+ sources cluster within 14 days → bank suggestion surfaces.

**The key insight:** Topic detection quality depends on the bank registry being well-described. A vague registry entry ("stuff about games") produces vague classification. A specific entry ("How studios organise work: sprints, cycles, milestones, team coordination, remote work patterns") produces accurate classification. The registry is the most important configuration file in the system.

### The Ingestion Agent Prompt

This is the system prompt that every ingestion agent receives (stored in `intelligence/prompts/ingestion_agent.md`):

```markdown
You are an intelligence extraction agent for NBI, a gaming advisory consultancy run by Glen Pryer.

Your job: read source material and produce structured extracts that capture the KNOWLEDGE
contained within — not the material itself. You are extracting signal from noise.

## What Constitutes Knowledge Worth Extracting

- Decisions made (by whom, what they chose, why)
- Insights or observations that would inform future work
- Methodologies or frameworks that could be applied elsewhere
- Data points or benchmarks with specific numbers
- Patterns recognised across situations
- Contacts, relationships, or organisational knowledge
- Commitments or deadlines with real consequences

## What to SKIP (not knowledge, just activity)

- Scheduling logistics ("let's meet Thursday")
- Pleasantries and small talk
- Status updates with no decision or insight ("still working on X")
- Repetition of already-known facts without new angle
- Purely personal content unrelated to business

## Scoring Rules

Score each extract honestly. These scores determine whether it enters the knowledge banks.

RELEVANCE to NBI's work (gaming advisory, client delivery, business operations):
- 9-10: Directly applicable to current client work or active engagement today
- 7-8: Applicable to NBI's services, clients, or markets within the next month
- 6-7: Generally useful for gaming consulting if the right project comes in
- 4-5: Tangentially related. Interesting but won't influence NBI decisions
- 2-3: Broadly about gaming/business but disconnected from NBI's work
- 1: Completely unrelated

NOVELTY (does NBI already know this?):
- 9-10: Completely new — no existing bank contains anything like this
- 7-8: Significantly extends or challenges current knowledge
- 5-6: Adds useful detail or better evidence for something partially known
- 3-4: Mostly confirms what's already in the banks
- 1-2: Near-duplicate of existing content

ACTIONABILITY (can NBI use this?):
- 9-10: Deployable today in current work. Specific and implementable
- 7-8: Applicable within the month. May need minor adaptation
- 5-6: Useful framework that shapes thinking for future work
- 3-4: Requires significant interpretation. "Good to know" not "good to use"
- 1-2: Purely theoretical. No practical application path

## Bank Assignment

You have access to the bank registry (provided below). Assign bank_candidates based on
SEMANTIC MATCH to the bank's "Accepts Content About" description. An extract can match
multiple banks. If it doesn't match any bank well, add to new_bank_suggestions.

## Sensitivity Classification

Classify sensitivity as:
- public: No restrictions. General industry knowledge, public information.
- internal: Fine in any NBI bank but shouldn't be shared externally. Internal decisions, strategy.
- client_scoped: Can ONLY go in that client's bank. Their specific data, their team details.
- anonymisable: Contains sensitive specifics but the PATTERN can be extracted and anonymised.
  Example: "Client X's revenue is £2M" is client_scoped, but "A 55-person studio generating £2M
  found that..." is anonymisable — the lesson is shareable, the identity isn't.
- restricted: Requires Glen's explicit approval. Salary figures, contract terms, legal matters.

## Output Format

Produce one extract per knowledge unit (see format specification).
Dense. Factual. No filler. Maximum 200 words in Key Content.
Every applicability statement must be a specific scenario, not a vague category.
```

### Connector: `/ingest-granola`

**MCP tools used:** `mcp__claude_ai_Granola__list_meetings`, `mcp__claude_ai_Granola__get_meeting_transcript`

**Process:**
1. Read `pipeline_state.md` for last Granola ingestion date
2. Call `list_meetings` with date filter (since last ingestion)
3. For each meeting, check attendees against known contacts:
   - Cross-reference with `brain/people_directory.md` (NBI team)
   - Cross-reference with `brain/clients_detailed.md` (client contacts)
   - Any match → business meeting. No match + title contains business keywords → include. No match + no business indicators → skip.
4. For included meetings: call `get_meeting_transcript`
5. Feed transcript to ingestion agent with source-specific context:
   > "This is a meeting transcript from Granola. Attendees: [names]. Date: [date]. Extract the knowledge — decisions, insights, action items, strategic direction. Skip scheduling, pleasantries, and repetitive status updates."
6. Agent produces one extract per meeting (or multiple if the meeting covered genuinely separate topics for >10 minutes each)
7. Deposit in `intelligence/raw/granola/{date}_{slug}.md`
8. Update `pipeline_state.md` with run date and extract count

**Deduplication:** Check `source_id` (meeting ID from Granola) against existing extracts. Skip if already ingested.

### Connector: `/ingest-email`

**MCP tools used:** `mcp__claude_ai_Gmail__search_threads`, `mcp__claude_ai_Gmail__get_thread`

**Search queries (executed in sequence, deduplicated by thread ID):**
```
from:vardis@couchheroes.com newer_than:14d
from:aris@couchheroes.com newer_than:14d
from:{any-domain-in-clients_detailed.md} newer_than:14d
label:nbi newer_than:14d
subject:(pitch OR investment OR forecast OR production OR hiring) newer_than:14d -category:promotions -category:social -category:updates
```

**Exclusion rules (applied before extraction):**
- Automated notifications (from: noreply@, notifications@)
- Calendar invites with no substantive body
- Newsletter/marketing (unless from a known industry source AND contains specific data)
- Social media alerts
- Threads where Glen's only contribution is "Thanks" or "OK"

**Process:**
1. Execute search queries, collect unique thread IDs
2. For each thread: call `get_thread`, read full content
3. Feed to ingestion agent with context:
   > "This is an email thread. Participants: [names]. Subject: [subject]. Extract decisions, commitments, new information, and any knowledge that would be useful if this topic comes up again in 3 months."
4. One extract per thread. Exception: threads with 20+ messages spanning multiple unrelated topics get split.
5. Long threads: summarise with key exchanges highlighted, not full transcript

**Sensitivity default:** Email is `internal` unless it contains contract terms (→ `restricted`) or client-specific data (→ `client_scoped`).

### Connector: `/ingest-slack`

**MCP tools used:** `mcp__claude_ai_Slack__slack_read_channel`, `mcp__claude_ai_Slack__slack_search_public_and_private`

**Channel configuration:** On first run, list channels via MCP and present to Glen:
> "Which Slack channels should the intelligence pipeline monitor? Here are your channels: [list]. I recommend including: [business-looking channels]. Excluding: [clearly social/off-topic channels]."

Store selection in `intelligence/config/source_config.md`.

**Process:**
1. For each configured channel: read messages since last ingestion date
2. Filter for substantive exchanges:
   - SKIP: emoji-only reactions, "ok", "thanks", scheduling ("what time works?")
   - KEEP: messages with >50 words, messages containing links with context, threaded discussions with 3+ replies
3. Feed substantive threads to ingestion agent
4. One extract per distinct topic thread

### Connector: `/ingest-local`

**Scans these paths (configured in `source_config.md`):**
```
D:\OneDrive\Claude_code\          # All NBI working files
D:\OneDrive\Documents\            # Business documents
C:\Users\gpbea\Downloads\         # Recent downloads (filtered)
```

**File type whitelist:**
`.md`, `.txt`, `.pdf`, `.docx`, `.pptx`, `.xlsx`

**Ignore rules:**
```
**/node_modules/**
**/.git/**
**/.planning/**                   # GSD internal state
**/session_logs/**                # Handled by /ingest-chats
**/session_handoffs/**            # Handled by /ingest-chats
**/*.exe, *.msi, *.dll, *.zip, *.7z, *.rar
**/*.png, *.jpg, *.gif, *.svg    # Unless filename contains: diagram, architecture, flowchart
**/*.mp4, *.mp3, *.wav, *.mov
**/package-lock.json, yarn.lock
```

**Change detection:** `pipeline_state.md` stores `{file_path: last_modified_timestamp}` for all previously processed files. Only process files where current modification date > stored date.

**Process:**
1. Glob for whitelisted file types in configured paths
2. Filter against ignore rules
3. Compare modification dates — only new/changed files
4. Sort by modification date (newest first)
5. Batch: maximum 30 files per session (to avoid context exhaustion)
6. For each file: read content, feed to ingestion agent with context:
   > "This is a document from Glen's local files. Path: [path]. Filename: [name]. File type: [type]. Extract any knowledge worth preserving — decisions, frameworks, research findings, data points. If this is purely operational (a script, a config file, a template with no filled content), output SKIP."
7. Agent can output "SKIP" for files with no extractable knowledge (empty templates, boilerplate, etc.)

**First-run special rules for Downloads:**
- Only process files modified within last 90 days
- Sort by file size (skip anything > 50MB — likely media/installers)
- Process maximum 50 files on first run
- After first run: track all processed files, only ingest new ones going forward

### Connector: `/ingest-chats`

**ChatGPT export structure:**

The OpenAI export is a ZIP containing `conversations.json` — an array of conversation objects:
```json
{
  "title": "string",
  "create_time": unix_timestamp,
  "update_time": unix_timestamp,
  "mapping": {
    "message_id": {
      "id": "string",
      "message": {
        "author": { "role": "user|assistant" },
        "content": { "parts": ["text content"] },
        "create_time": unix_timestamp
      },
      "parent": "message_id",
      "children": ["message_id"]
    }
  }
}
```

**Location:** The export ZIP/folder is on Glen's OneDrive. First run: ask Glen for the exact path. Store in `source_config.md`.

**Process:**
1. Parse `conversations.json`
2. Filter by title relevance (see below)
3. For relevant conversations: reconstruct message chain from mapping (follow parent→children)
4. Feed the full conversation to the ingestion agent (not individual messages):
   > "This is a ChatGPT conversation. Title: [title]. Date: [date]. Read the full exchange and extract: conclusions reached, research findings produced, frameworks developed, decisions made, insights that were novel. Do NOT extract the questions asked — only the knowledge generated."
5. One extract per conversation. Exception: conversations spanning multiple unrelated research topics (identifiable by sharp topic transitions) get split.

**Title relevance filter:**
- INCLUDE (high confidence): titles mentioning client names, "NBI", game titles, "pitch", "forecast", "production", "economy", "analysis", "research", "strategy", "pricing", "hiring"
- EXCLUDE (high confidence): "test", "hello", "help me with", single-word titles, titles that are clearly coding help ("fix this bug", "python error")
- UNCERTAIN: read first 5 user messages. If they contain business/gaming context → include. Otherwise → skip.

**Claude session extraction:**
1. Scan `projects/nbi_dashboard/session_handoffs/` for files since last ingestion
2. Each handoff is already structured. Extract: decisions Glen made, architectural choices, approaches rejected (and why), client insights, knowledge generated
3. One extract per handoff
4. These are highest-signal (already distilled) — ingestion agent preserves their structure rather than re-summarising

### Connector: `/ingest-research`

**Input:** Output from Layer 5 research agents.

Research agents already produce near-extract-format output. This connector:
1. Reads the research agent's output
2. Verifies formatting matches extract standard
3. Adds missing metadata if any
4. Deposits in `intelligence/raw/web_research/{domain}/{date}_{slug}.md`

Simplest connector — mostly a format validator and file mover.

### Sensitivity Classification Model

Five levels, not binary:

| Class | Definition | Bank Rules | Example |
|-------|-----------|-----------|---------|
| `public` | General knowledge, publicly available | Any bank, no restrictions | "Shape Up uses 6-week cycles" |
| `internal` | NBI-specific but not client-confidential | Any NBI bank, not for external sharing | "Glen prefers to price at day-rate not hourly" |
| `client_scoped` | Specific to one client's situation | ONLY that client's bank | "Couch Heroes revenue is £X" |
| `anonymisable` | Contains client specifics but the PATTERN is shareable | Pattern goes in general bank (anonymised), specific goes in client bank | "A 55-person remote studio found that..." (from CH data) |
| `restricted` | Requires Glen's explicit approval for any use | Stays in raw/ until approved | Salary figures, contract terms, legal matters |

**Anonymisation process for `anonymisable` content:**
The compilation agent creates TWO entries:
1. Full specific version → client-scoped bank (e.g., `client_couch_heroes`)
2. Anonymised pattern version → general bank (e.g., `production_methods`): strip client name, replace with descriptor ("a 55-person remote UK game studio"), keep the insight

---

## Layer 2: Compilation — The Algorithm in Full

### What Compilation Actually Does

Compilation is NOT appending extracts to a file. It is SYNTHESIS — taking multiple raw extracts and producing a coherent, structured knowledge bank that reads as a single authoritative document. Think of it like a textbook author incorporating new research: the research papers go in the bibliography, but the chapter reads as integrated prose.

### The Compilation Agent Prompt

Stored in `intelligence/prompts/compilation_agent.md`:

```markdown
You are a knowledge compiler for NBI, a gaming advisory consultancy.

Your job: take raw intelligence extracts and integrate them into a structured knowledge bank
that reads as a coherent reference document. You are writing a living textbook, not a
clippings file.

## Principles

1. SYNTHESISE, don't append. If three extracts say similar things about Shape Up methodology,
   the bank should have ONE well-written section on Shape Up that draws from all three —
   not three separate entries.

2. STRUCTURE by usefulness, not by source. Group knowledge by how it would be looked up:
   by topic, by situation, by framework. Never by "this came from email" or "this came
   from a meeting."

3. PRESERVE provenance without cluttering readability. Every factual claim gets a source
   tag [source: extract_id] at the end of the sentence or paragraph. But the text itself
   reads naturally — sources are reference marks, not the structure.

4. JUDGE quality. Not everything that passed the quality gate deserves equal weight in the
   bank. A detailed case study from a studio that actually implemented Shape Up matters
   more than a blog post that mentions it in passing. Allocate space and prominence
   accordingly.

5. CONTRADICT explicitly. When sources disagree, say so:
   "Studio A found 6-week cycles reduced overhead [source: X]. Studio B found they
   created accountability gaps for junior developers [source: Y]. The difference may be
   team seniority — A was mostly senior engineers."
   Never silently pick one side.

6. MAINTAIN the schema. Every bank has a defined section structure. Follow it. If new
   knowledge doesn't fit any existing section, propose a new section in your output
   (clearly marked as [NEW SECTION PROPOSED]).

7. STAY WITHIN 500 LINES. If the bank is approaching this limit, tighten prose, merge
   redundant sections, or flag that a split is needed. Never let quality suffer to fit
   the limit — flag the split instead.

## Your Inputs

- The current bank content (empty for new banks)
- The bank's schema (section structure with descriptions)
- New extracts to integrate (already passed quality gate)
- The bank registry entry (what this bank is for)

## Your Output

- The complete updated bank content (not a diff — the full document)
- A change summary: what was added, what was updated, what was tightened
- If applicable: split recommendation or new section proposals

## Contradiction Resolution (apply in order)

1. Newer source wins — unless older source has demonstrably higher authority
2. Primary source wins — Glen's stated decision > someone's interpretation
3. Specific wins over general — "55 employees" > "about 50 people"
4. Real outcome wins over prediction — "we tried Shape Up and X happened" > "Shape Up should work because..."
5. If genuinely unresolvable: include both with provenance, add to Open Questions
```

### The Compilation Process (step by step)

**For a NEW bank (first compilation):**

1. Read the bank's schema from `intelligence/config/bank_schemas/{bank-slug}.md`
2. Read the bank registry entry for this bank (what it accepts, its purpose)
3. Gather all raw extracts where `bank_candidates` includes this bank's slug
4. Filter: only extracts scoring >= 6 relevance AND >= 5 novelty AND >= 5 actionability
5. Sort extracts by relevance score (highest first — they get most space)
6. Feed to compilation agent with instruction: "Create this bank from scratch. Here is the schema, here are the extracts. Synthesise into a coherent reference document."
7. Agent produces the full bank document
8. Verify: line count <= 500. If exceeded, agent re-runs with instruction to tighten.
9. Write bank to `intelligence/banks/{bank-slug}.md`
10. Generate bank summary (50 lines) to `intelligence/synthesis/bank_summaries/{bank-slug}.md`
11. Update `pipeline_state.md`
12. Git commit: `intel: compile {bank-slug} ({N} sources, new bank)`

**For an EXISTING bank (incremental update):**

1. Read current bank content
2. Gather new raw extracts since last compilation (check ingestion date vs. bank's `last_compiled`)
3. Filter by quality gate (same thresholds)
4. Feed to compilation agent with instruction: "Update this existing bank with these new extracts. Integrate — don't append. Tighten existing content if the new material supersedes it."
5. Agent produces the complete updated bank
6. Verify line count. If approaching 500, flag for review.
7. Overwrite bank file
8. Regenerate bank summary
9. Update `pipeline_state.md`
10. Git commit: `intel: update {bank-slug} (+{N} extracts)`

**Trigger for FULL rebuild:**

- More than 30% of extracts are new since last compilation
- Bank schema modified by Glen
- Glen manually requests: `/compile-bank {slug} --full`
- Quality of incremental updates has degraded (compilation agent can flag this: "The bank has too many patches — recommend full rebuild for coherence")

### Quality Gate Scoring Rubric

**Relevance (threshold: >= 6/10)**

| Score | Definition | Example |
|-------|-----------|---------|
| 9-10 | Directly applicable to current client work today | Couch Heroes production framework evaluation |
| 7-8 | Applicable to NBI services/clients within the next month | New forecast model for mobile F2P |
| 6-7 | Generally useful for gaming consulting | GDC talk on milestone planning |
| 4-5 | Tangentially related, unlikely to influence decisions | Generic agile article |
| 2-3 | Broadly about gaming but disconnected from NBI | E-sports tournament results |
| 1 | Completely unrelated | Recipe blog post |

**Novelty (threshold: >= 5/10)**

| Score | Definition | Example |
|-------|-----------|---------|
| 9-10 | Completely new information | First encounter with Shape Up for game studios |
| 7-8 | Significantly extends/challenges known knowledge | Contradicts existing assumption about sprint length |
| 5-6 | Adds useful detail to partially known topic | Third data point for Shape Up outcomes |
| 3-4 | Mostly confirms what banks already contain | Another source saying sprints work for small teams |
| 1-2 | Near-duplicate of existing bank content | Same GDC talk already extracted |

**Actionability (threshold: >= 5/10)**

| Score | Definition | Example |
|-------|-----------|---------|
| 9-10 | Deployable in current work today | Template Glen can use in Monday's client call |
| 7-8 | Applicable within the month, minor adaptation needed | Framework needs customisation for client |
| 5-6 | Shapes thinking for future work | "Good to know for next time this comes up" |
| 3-4 | Requires significant interpretation to apply | Academic research without practical bridge |
| 1-2 | No practical application path | Historical interest only |

**Aggregate rule:** Must score >= 6 relevance AND >= 5 on BOTH novelty and actionability. Failing any dimension = stays in raw/.

### Bank Discovery and Creation

**The detection mechanism (no magic):**

1. Every ingestion run produces extracts with `new_bank_suggestions` where content didn't fit existing banks
2. After each ingestion run, a lightweight check runs:
   ```
   Count new_bank_suggestions by slug (with LLM similarity grouping)
   across all extracts from the last 14 days.
   If any topic has >= 3 extracts from >= 2 different sources: trigger suggestion.
   ```
3. "LLM similarity grouping" means: take all unique `new_bank_suggestions` slugs from the last 14 days, ask the model: "Group these into topics that are actually the same thing expressed differently. Return the groups." This prevents `remote-work`, `distributed-teams`, and `working-from-home` from counting as three separate topics when they're one.

**Suggestion format (surfaced to Glen):**

> **New knowledge domain detected: Remote Studio Operations**
>
> 7 extracts from 3 sources (Granola: 3, Gmail: 2, OneDrive: 2) in the last 10 days.
> Sub-topics: remote work cadence, distributed team communication, timezone coordination, async decision-making.
>
> Closest existing bank: `production_methods` (partial overlap on team coordination).
> Recommendation: Create separate bank — the content is more about org/ops than production methodology.
>
> If approved, I'll:
> 1. Generate a bank schema (sections, what goes where)
> 2. Set role associations (head_of_people, producer, production_consultant)
> 3. Compile the 7 existing extracts into the initial bank
> 4. Optionally set up a research routine for this domain
>
> Approve? [Yes / Yes with modifications / No, fold into production_methods / No, not worth tracking]

**Auto-create mode:** After Glen has manually approved 5+ banks and trusts the system's judgment, he can toggle auto-create for specific topic families. The system creates the bank, runs initial compilation, and reports what it did:
> "Auto-created bank: `remote_studio_ops`. 7 initial entries from 3 sources. Schema: [link]. Associations: head_of_people, producer. Review when convenient."

### Context Budget Rules

| Rule | Threshold | Enforcement |
|------|-----------|-------------|
| Maximum bank size | 500 lines | Compilation agent enforces. If exceeded: tighten or split. |
| Session-start context load | Intelligence brief (~50 lines) + 2-3 bank summaries (~50 lines each) = ~200 lines total | CLAUDE.md instruction specifies this limit |
| Mid-session full bank load | Maximum 2 full banks loaded at once (~1000 lines) | If a third is needed, present summary and ask "want the full bank?" |
| Bank summary size | 50 lines maximum | Summary generation enforces |
| Maximum banks surfaced in one session without request | 3 proactive + unlimited on-demand | Suppression rules enforce |

**When a bank exceeds 500 lines:**

1. Compilation agent detects at compile time
2. Identifies natural split points (e.g., `pitch_decks` → `pitch_decks_mobile` + `pitch_decks_pc_console`)
3. Proposes split to Glen with rationale
4. On approval: creates sub-banks, updates registry, updates role associations, migrates extracts

**What loads when:**
- **Session start:** Intelligence brief + bank summaries for top-3 relevant banks. ~200 lines. Negligible context cost.
- **Topic detection triggers:** Full bank loads (~500 lines). Model announces what it loaded and why.
- **Deep dive (Glen asks):** Full bank + relevant raw extracts for maximum depth. Explicitly requested, so context cost is acceptable.
- **Never:** All banks at once. Never load banks "just in case."

---

## Layer 3: Synthesis — Brief Generation in Full

### The Brief Generation Agent Prompt

Stored in `intelligence/prompts/brief_agent.md`. This is what the scheduled CronCreate routine runs:

```markdown
You are generating the daily intelligence brief for Glen Pryer, MD of NBI Gaming.

Your job: read the pipeline state, all bank frontmatter, and recent session context,
then produce a brief that answers: "What does Glen need to know before starting work today?"

## Inputs You Receive

1. pipeline_state.md — last run dates, pending compilations, bank health
2. All bank files' frontmatter (ls intelligence/banks/*.md, read first 10 lines of each)
3. Most recent session log (what Glen was working on last)
4. Google Calendar for today (if accessible) — what meetings/work is planned
5. Research log — what research ran since last brief

## Brief Structure (follow exactly)

# Intelligence Brief -- {today's date}

## What's New (since {last session date})
{Bullet list. Only items that CHANGED. For each: what changed, which bank, ONE sentence on why it matters.}
{If nothing changed: "Pipeline quiet since last session. No new intelligence."}

## Bank Suggestions Pending
{If any topics crossed the 3-extract threshold. Include the full suggestion block.}
{If none: omit this section.}

## Today's Context
{One sentence on what Glen is likely working on today, based on calendar + recent sessions.}
{Then: "Most relevant banks:" with 2-3 banks and one-line reasons.}

## Pipeline Health
- Banks: {N} active, {N} stale
- Pending: {N} extracts awaiting promotion, {N} sensitive awaiting review
- Research: {last run dates by domain, any failures}
{If everything healthy: "All systems nominal." — don't pad with unnecessary detail.}

## Actions Needed
{ONLY if there are actions requiring Glen's input. Omit entirely if nothing pending.}

## Principles

- BREVITY. The brief should be 30-80 lines. Glen reads this at session start — don't waste his time.
- RELEVANCE. Only surface what's relevant to current work or genuinely new.
- NO PADDING. If there's nothing new, say so in one line. Don't manufacture content.
- ACTIONABLE ITEMS ONLY in the Actions section. "Bank X is stale" is only an action if it's relevant to current work.
```

### Bank Summary Generation

Each bank summary is regenerated when its parent bank is recompiled:

```markdown
# {Bank Title} -- Summary

**Last compiled:** {date} | **Entries:** {N} | **Sources:** {M}
**Role associations:** {list}

## What This Bank Knows (top 5)
- {Most important knowledge area — one line}
- {Second most important — one line}
- {Third — one line}
- {Fourth — one line}
- {Fifth — one line}

## Most Recent Additions
- [{date}] {What was added — one line}
- [{date}] {What was added — one line}

## Gaps & Open Questions
- {What's missing or weak — one line}
- {What needs more research — one line}
```

Maximum 50 lines. If a bank summary can't fit in 50 lines, the bank is too broad and should split.

---

## Layer 4: Surfacing — Proactive and Reactive Mechanisms

### Honest Classification

| Mechanism | Type | How It Actually Works |
|-----------|------|---------------------|
| Scheduled research agents | Genuinely proactive | CronCreate fires, finds knowledge, deposits it. No human trigger. |
| Daily brief generation | Genuinely proactive | CronCreate fires at 07:00, regenerates brief. Ready before Glen. |
| Bank suggestion detection | Genuinely proactive | Pipeline notices patterns Glen hasn't asked about. |
| Session-start intelligence load | Configured reactive | CLAUDE.md instruction fires every session. Feels proactive to Glen. |
| Mid-session bank loading | Configured reactive | CLAUDE.md topic-routing triggers on conversation content. |
| Proactive interruption | Configured reactive | CLAUDE.md instruction: if loaded content scores high contextual relevance, surface it. |
| On-demand querying | Reactive | Glen asks, system answers from banks. |

The "comes to you" experience is achieved by the genuinely proactive elements (research, briefs) creating intelligence that the configured reactive elements (session-start, mid-session) then surface at the right moment.

### Mechanism 1: Session-Start Intelligence Load

**CLAUDE.md addition (after "Session Continuity — MANDATORY"):**

```markdown
## Intelligence Pipeline — Session Start

At the start of every session:

1. Read intelligence/synthesis/intelligence_brief.md
2. If the brief is older than 24 hours, regenerate it (run the brief generation process)
3. In your opening message, include the "What's New" section if there IS something new.
   If nothing is new, don't mention the pipeline at all — just start working.
4. Read the bank summaries listed in "Most Relevant Banks Right Now" — these give you
   awareness of what knowledge is available without loading full banks.
5. If there are pending actions (bank suggestions, sensitive extracts), mention them once.
   Don't nag — one mention per session maximum.
6. Do NOT load full banks at session start. Load them when the conversation topic matches.
```

### Mechanism 2: Mid-Session Bank Loading

**CLAUDE.md addition (extends topic-detected routing):**

```markdown
### Intelligence bank routing

When the conversation enters a domain covered by a knowledge bank, load the FULL bank
(not just the summary). Announce briefly what you loaded:

"Loading [bank name] — [one sentence on what it contains and why it's relevant now]."

| Conversation involves... | Load banks |
|---|---|
| Client pitch / proposal | games_pitch_decks, client_patterns, forecast_models |
| Production planning | production_methods, forecast_models |
| Couch Heroes specifically | client_couch_heroes + whatever domain banks match the topic |
| Hiring / team structure | hr_people_ops (if exists), personal_insights |
| Game economy / monetisation | industry_current + role knowledge |
| New client onboarding | client_patterns, games_pitch_decks |
| Forecasting / financial models | forecast_models, industry_current |

For banks not in this table: the bank's role_associations field in its frontmatter
determines routing. If the currently active role matches a bank's association, load it.

LIMIT: Maximum 2 full banks loaded per topic. If more are relevant, load the 2 most
relevant and mention the others: "Also available: [bank] and [bank] if you need them."
```

### Mechanism 3: Contextual Relevance Scoring

This is DIFFERENT from the static ingestion-time scores. Contextual relevance asks: "Given what Glen is discussing RIGHT NOW, how relevant is this specific bank entry?"

**When it triggers:** After a full bank is loaded mid-session, the model scans the bank entries against the current conversation context. Entries scoring high contextual relevance get surfaced proactively.

**How it works (CLAUDE.md instruction):**

```markdown
### Proactive intelligence surfacing

After loading a bank, scan its entries against the current conversation. If you find
an entry that is DIRECTLY applicable (not just topically related):
- Same team size as the client being discussed
- Same problem being solved
- Same methodology being evaluated
- Contradicts an assumption that was just stated

Then surface it naturally:

"The [bank] has something directly relevant here — [one sentence summary]. [Key fact
with source]. Want the full entry?"

RULES:
- Maximum 2 proactive surfaces per session. Don't be a constant interrupter.
- Only surface if contextual relevance is genuinely high — same situation, not just same topic.
- Never surface bank content that Glen just told you or that came from the current conversation.
- If Glen says "stop" or ignores surfaces, cease for the rest of the session.
```

### Mechanism 4: Suppression Rules

Stored in `intelligence/config/suppression_rules.md` and referenced by CLAUDE.md:

```markdown
# Suppression Rules — When NOT to Surface Intelligence

DO NOT proactively surface bank content when:

1. Glen is in deep technical work (writing code, debugging, running tests).
   Signal: conversation is about specific code files, error messages, test output.
   Exception: if a bank entry documents a SOLUTION to the exact bug being debugged.

2. The topic match is tangential, not primary.
   Signal: Glen mentioned "UI" in passing but the conversation is about database schema.
   Rule: only load a bank if the topic is the PRIMARY subject, not a passing mention.

3. The bank was already loaded and surfaced this session.
   Rule: never re-surface the same bank entry twice.

4. Glen is giving a directive and expects execution, not discussion.
   Signal: imperative instructions ("do X", "fix Y", "build Z").
   Rule: execute first, surface relevant intelligence only if it affects the approach.

5. The session is past 75% context and you're approaching handoff.
   Rule: don't load new banks when you should be wrapping up.

6. You've already surfaced 2 proactive items this session.
   Rule: hard cap. After 2, only surface if explicitly asked.

7. Glen explicitly says "not now", "focus", "skip the intelligence", or similar.
   Rule: no more proactive surfaces for the rest of the session.
```

### Mechanism 5: Periodic Briefs (pushed)

**Daily brief:** CronCreate routine fires at 07:00 UK time.
- Regenerates `intelligence/synthesis/intelligence_brief.md`
- If research completed overnight, includes findings
- Ready for first session of the day

**Weekly digest:** CronCreate fires Monday 07:30 UK time.
- Produces `intelligence/synthesis/weekly_{date}.md`
- Contents: all bank changes, research findings, emerging topics, usage stats, stale areas
- This file is referenced in Monday's intelligence brief: "Weekly digest available: [summary of highlights]"

---

## Layer 5: Proactive Research — Full Specification

### The Research Agent Prompt

Stored in `intelligence/prompts/research_agent.md`:

```markdown
You are a research agent for NBI, a gaming advisory consultancy. Your job: find specific,
high-quality knowledge in a defined domain and produce structured extracts ready for
ingestion into NBI's intelligence pipeline.

## Your Brief

You receive a research brief (below) that tells you:
- What domain you're researching
- What to look for specifically this cycle
- What counts as high-quality in this domain
- What to exclude
- Where to look

## Process

1. Read your research brief carefully. Understand what "best" means in this context.
2. Execute searches (WebSearch and/or Apify actors as appropriate).
3. For each finding, ask: does this meet the brief's quality criteria? Be harsh.
4. For findings that pass: extract the knowledge into standard extract format.
5. Score each extract: relevance, novelty, actionability (using the same rubric as ingestion).
6. Only keep findings scoring >= 6 relevance, >= 5 novelty, >= 5 actionability.
7. Target: 3-5 high-quality findings per research cycle. NOT a quantity game.

## Quality Over Quantity — Hard Rules

- 3 excellent findings is better than 10 mediocre ones
- If you can't find anything that meets the quality bar, report that honestly:
  "Searched [X sources] for [Y]. Found nothing meeting quality threshold.
   Suggestion: adjust focus to [Z] next cycle."
- NEVER pad with low-quality content to hit a number
- NEVER include listicles, generic advice articles, or content without specific examples/data
- NEVER include paywalled content you can't actually read

## Your Output

For each finding that passes quality:
- One raw extract in standard format (see extract specification)
- Source URL or citation
- One sentence: why this is valuable to NBI specifically

At the end: a research log entry summarising what you searched, what you found,
what you kept, and what you suggest for next cycle's focus.
```

### Research Domain Specifications

#### Game Pitch Decks

**What "best" means for NBI:**
- Decks that actually raised money (documented outcome with amount)
- Decks cited as exemplars by named VCs or industry figures
- Decks demonstrating structural innovation (not just pretty slides)
- From studios comparable to NBI's clients (indie-to-mid-tier, 10-100 people)
- Actual deck content or detailed structural breakdowns (not just "tips for pitching")

**What to EXCLUDE:**
- "Top 10 pitch deck tips" listicles
- Template generators and Canva templates
- Decks from mega-studios (EA, Activision, Tencent) — different context
- Paywalled content NBI can't access or reference
- Generic startup advice not specific to gaming
- Content older than 2022 (market has shifted)

**Focus rotation (4-week cycle):**
- Week 1: Mobile game pitch decks (F2P, hypercasual, mid-core)
- Week 2: PC/Console indie pitch decks (premium, early access)
- Week 3: Live service / GaaS pitch decks (any platform)
- Week 4: Seed-stage / studio formation decks (pre-game, team + concept)

**Where to search:**
- GDC Vault talks mentioning "fundraising" or "pitching"
- Medium/Substack posts by gaming VCs: Josh Chapman (Konvoy), Jon Jordan, Jason Calacanis gaming SPAC writings
- SlideShare/Speaker Deck gaming category
- Game developer post-mortems mentioning fundraising rounds
- r/gamedev, r/indiegaming threads about raising money
- a16z Games, Makers Fund, Play Ventures blog posts
- Specific Apify actors: web scraping for "game pitch deck" site:medium.com, site:substack.com

**What a bank entry looks like for this domain:**
```
### [Game Title] — [Platform] — [Stage] — Raised $[X]M from [Investor]

**Structure:** [N] slides: [section breakdown]
**What works:** [1-2 sentences on what made this effective]
**Key differentiator:** [What set this apart from generic decks]
**Applicable when:** [Specific scenario — e.g., "Mobile F2P studio at seed stage pitching to gaming-specialist VCs"]

[source: web_research_2026-05-25_gamedev_pitchdeck_01]
```

#### Forecast Models

**What "best" means:**
- Models with documented, replicable methodology
- Models with published validation or track record
- Adaptable frameworks (not black-box SaaS tools)
- Scaled to NBI's client size (not requiring enterprise data volumes)
- Models that accept inputs NBI's clients can actually provide

**What to EXCLUDE:**
- Black-box tools without methodology explanation (e.g., "use our AI predictor")
- Models requiring data NBI's clients won't have (10M+ DAU for statistical significance)
- Academic papers with no practical application path
- Revenue predictions based solely on genre averages without game-specific inputs
- Superseded methodologies (pre-F2P era models for modern games)

**Sub-domains (rotate focus):**
- Revenue projection (F2P conversion funnels, ARPDAU, whale economics)
- Player growth/retention forecasting (cohort analysis, LTV curves, D1/D7/D30)
- Production cost estimation (by team size, genre, platform, development phase)
- Market sizing for specific genre/platform intersections
- Live service event revenue modelling (seasonal events, battle passes, limited-time offers)

**Where to search:**
- GameAnalytics, data.ai, Sensor Tower published methodology docs
- GDC analytics/business track talks
- Deconstructor of Fun, GameRefinery, MobileGamer.biz analytical pieces
- Eric Seufert's Mobile Dev Memo (LTV, attribution, monetisation modelling)
- Academic game studies conferences (DiGRA, FDG) — practice-oriented papers only
- Newzoo, Niko Partners free methodology publications

#### Production Methodologies

**What "best" means:**
- Frameworks used by studios of 20-100 people
- Specifically designed for or adapted to game development (not generic agile)
- Documented with retrospectives, outcomes, or honest assessments
- Suitable for remote-first or hybrid teams
- Accounts for the creative + engineering coordination unique to games

**What to EXCLUDE:**
- Generic Scrum/agile certification content
- SAFe and enterprise frameworks (wrong scale entirely)
- Methodologies requiring proprietary tools NBI's clients don't use
- Pure theory without implementation evidence
- "How we do it at [300-person AAA studio]" — too different from NBI's clients

**Sub-domains (rotate focus):**
- Sprint/milestone planning for creative + engineering coordination
- Remote-first production for game studios (40-80 people)
- Pre-production to production transition frameworks
- Live ops cadence and update scheduling
- QA integration in continuous delivery pipelines
- Vertical slice and prototype milestone gates
- Shape Up and other alternative methodologies adapted for games

**Where to search:**
- GDC production track talks (particularly studios of similar size)
- Gamasutra/Game Developer post-mortems
- Studio blogs: Supergiant, Larian, Coffee Stain, Dodge Roll, Team Cherry
- "Blood, Sweat, and Pixels" and "Press Reset" case studies
- r/gamedev production discussions from actual studio leads
- Basecamp's Shape Up documentation (primary source) + game studio adaptations

#### Industry Intelligence

**What to capture:**
- Acquisitions, mergers, studio closures, layoffs (market shape changes)
- Platform policy changes (App Store rules, Steam algorithm, console certification)
- Funding rounds in gaming (who raised, how much, what for, from whom)
- Technology shifts relevant to NBI's clients (engine changes, AI tools for game dev)
- Regulatory changes affecting games (EU Digital Services Act, loot box regulation, age rating)
- Market data with actual numbers (not paywalled summaries without the data)

**Frequency:** Daily monitoring, weekly compilation
**Shelf life:** 7 days (this is current affairs, not reference material)

**Where to search:**
- GamesIndustry.biz, MobileGamer.biz, PocketGamer.biz
- VentureBeat gaming section
- Game Developer (formerly Gamasutra) news
- Crunchbase gaming deals
- Apify news monitoring actors configured for gaming keywords

#### Competitor Watch

**What to capture:**
- Services offered by gaming consultancies (Lightspeed, Execution Labs, GameFounders, game economy consultancies)
- Published pricing or pricing signals
- Case studies published (who they worked with, what outcomes they claim)
- New service launches or capability announcements
- Gaps they don't cover that NBI does
- Their positioning and messaging (how they describe what they do)

**Frequency:** Weekly
**Purpose:** Keep NBI's competitive positioning current. Inform `brain/services_ai_operations.md` and pitch materials.

### Research Scheduling

| Routine ID | Domain | Schedule | Focus Rotation |
|------------|--------|----------|---------------|
| `intel-research-pitchdecks` | Game Pitch Decks | Weekly, Monday 06:00 UK | 4-week platform cycle |
| `intel-research-forecasts` | Forecast Models | Fortnightly, Tuesday 06:00 UK | Rotate sub-domains |
| `intel-research-production` | Production Methods | Weekly, Wednesday 06:00 UK | Rotate sub-domains |
| `intel-research-industry` | Industry Intelligence | Daily, 06:00 UK | No rotation — capture all |
| `intel-research-competitors` | Competitor Watch | Weekly, Friday 06:00 UK | Full scan each time |

### Dynamic Research Expansion

When a new bank is created:
1. System asks: "Should I set up a research routine for [{bank_name}]? If yes, I'll need: what to look for, where to look, what counts as quality, what to exclude."
2. If Glen provides guidance: generates a research brief, proposes a schedule, creates the CronCreate routine
3. If Glen says "figure it out": generates a draft research brief based on the bank's content and schema, presents for approval before scheduling

---

## Orchestration: Trigger Chain + State Management

### What Triggers What (no orchestrator process needed)

```
Scheduled research fires (CronCreate)
  -> research agent runs, produces findings
  -> calls /ingest-research to format and deposit in raw/web_research/
  -> ingest-research checks: "pending compilation for any bank?"
     -> if bank has >= 3 new qualifying extracts since last compile: trigger compilation
     -> compilation runs
     -> checks: "did bank change significantly (>= 5 new entries OR 20%+ content change)?"
       -> YES: regenerate bank summary + update intelligence brief
       -> git commit: "intel: update {bank} (+N extracts)"
     -> NO: update pipeline_state.md only

Scheduled ingestion fires (CronCreate: granola/email/slack)
  -> connector runs, produces extracts
  -> deposits in raw/{source}/
  -> checks: "pending compilation threshold met for any bank?"
     -> same trigger chain as above

Manual /ingest-* invocation
  -> same as scheduled, just human-triggered

Daily brief generation fires (CronCreate, 07:00 UK)
  -> reads pipeline_state.md + bank frontmatter + last session log
  -> regenerates intelligence_brief.md
  -> git commit: "intel: daily brief {date}"
  -> done (no downstream trigger)

Session starts (human enters Claude Code)
  -> reads intelligence_brief.md (CLAUDE.md instruction)
  -> surfaces relevant items
  -> done (normal session behaviour takes over)
```

### Pipeline State Tracking

`intelligence/pipeline_state.md`:

```markdown
# Pipeline State

## Last Ingestion Run Per Source
| Source | Last Run | Extracts Produced | Extracts Promoted | Next Scheduled |
|--------|----------|-------------------|-------------------|----------------|
| granola | 2026-05-24 | 3 | 2 | 2026-05-25 20:00 |
| gmail | 2026-05-24 | 7 | 4 | 2026-05-25 20:00 |
| slack | 2026-05-24 | 2 | 1 | 2026-05-25 20:00 |
| onedrive | 2026-05-22 | 12 | 8 | manual |
| downloads | 2026-05-20 | 5 | 3 | manual |
| chatgpt | 2026-05-18 | 45 | 31 | one-time (complete) |
| claude_sessions | 2026-05-24 | 2 | 2 | 2026-05-25 20:00 |
| web_research | 2026-05-24 | 4 | 3 | per domain schedule |

## Bank Compilation Status
| Bank | Last Compiled | New Since | Threshold (3) | Action |
|------|---------------|-----------|---------------|--------|
| production_methods | 2026-05-24 | 4 | MET | compile next run |
| games_pitch_decks | 2026-05-23 | 1 | not met | waiting |
| forecast_models | 2026-05-20 | 2 | not met | waiting |
| industry_current | 2026-05-24 | 6 | MET | compile next run |
| client_patterns | 2026-05-22 | 0 | not met | waiting |
| personal_insights | 2026-05-24 | 3 | MET | compile next run |

## Bank Health
| Bank | Lines | Last Compiled | Shelf Life | Status | Sessions Used (30d) |
|------|-------|---------------|-----------|--------|---------------------|
| production_methods | 380 | 2026-05-24 | 60d | fresh | 8 |
| games_pitch_decks | 290 | 2026-05-23 | 30d | fresh | 4 |
| forecast_models | 220 | 2026-05-20 | 30d | fresh | 3 |
| industry_current | 450 | 2026-05-24 | 7d | fresh | 12 |
| client_patterns | 180 | 2026-05-22 | 14d | fresh | 6 |
| personal_insights | 340 | 2026-05-24 | never | fresh | 15 |

## Pending Review
- Sensitive extracts awaiting approval: 2
- Bank suggestions pending: 1 (remote_studio_ops)
- Stale banks: 0

## Local File Tracking
{path: last_modified_timestamp entries for all processed files}
```

### Git Commit Strategy

All pipeline output is committed to git for versioning and rollback:

| Action | Commit Message Format | When |
|--------|----------------------|------|
| New extracts ingested | `intel(raw): ingest {source} +{N} extracts` | After each ingestion run |
| Bank compiled (new) | `intel(bank): create {bank-slug} ({N} sources)` | On new bank creation |
| Bank compiled (update) | `intel(bank): update {bank-slug} (+{N} extracts)` | On incremental update |
| Bank split | `intel(bank): split {old} into {new-a} + {new-b}` | On bank split |
| Brief regenerated | `intel(brief): daily brief {date}` | Daily |
| Research completed | `intel(research): {domain} cycle — {N} findings` | After research cycle |
| Config change | `intel(config): update {file}` | On any config modification |
| Pipeline state update | `intel(state): pipeline status {date}` | After any state change |

**Rollback mechanism:** If a compilation produces a bad bank, `git log intelligence/banks/{slug}.md` shows history. `git checkout HEAD~1 -- intelligence/banks/{slug}.md` restores the previous version. Then investigate what went wrong in the compilation.

**Branch strategy:** All pipeline commits go on the current working branch (currently `feature/command-centre`). No separate branch — this is operational state, not experimental code.

---

## First-Run Strategy: Bulk Ingestion Plan

The initial population is different from steady-state. Thousands of files, years of chats — done in phases over ~7 sessions.

### Priority Order

| Priority | Source | Why First | Est. Volume | Sessions |
|----------|--------|-----------|-------------|----------|
| 1 | Claude session handoffs | Already structured, highest density | ~30 files | 1 |
| 2 | ChatGPT export | Years of research never captured | ~50 relevant conversations | 2-3 |
| 3 | Granola (last 60 days) | Recent meetings, current decisions | ~40 meetings | 1-2 |
| 4 | OneDrive work files | Active project documents | ~100 files (filtered) | 2-3 |
| 5 | Downloads (last 90 days) | Recently saved research/reports | ~50 files (after filter) | 1-2 |
| 6 | Gmail (last 30 days) | Recent business threads | ~30 threads | 1 |
| 7 | Slack (last 30 days) | Recent discussions | ~20 threads | 1 |

### Session-by-Session Plan

**Session 1: Bootstrap + First Harvest**
- Create full directory structure (`intelligence/` tree)
- Write initial config files: `bank_registry.md`, `source_config.md`, `pipeline_rules.md`, `suppression_rules.md`
- Write all agent prompts: `ingestion_agent.md`, `compilation_agent.md`, `research_agent.md`, `brief_agent.md`, `topic_detection.md`
- Create initial bank schemas for the 6 seed banks
- Ingest Claude session handoffs (Priority 1): ~30 files, already structured, fast
- Run first compilation: produces initial banks with 15-30 entries each
- Generate first intelligence brief
- **Deliverable:** Working pipeline with 6 populated banks. Glen can start using them immediately.

**Session 2-3: ChatGPT Harvest**
- Locate ChatGPT export on OneDrive (ask Glen for exact path if not obvious)
- Parse and filter conversations (likely 50-80 relevant out of hundreds)
- Process in batches of 20-25 per session
- After each batch: compile affected banks
- **Calibration point:** After first 10 ChatGPT extracts, present to Glen:
  "Here are 10 extracts. Score: useful/noise/borderline. This tunes the system."
  Adjust scoring criteria based on feedback.
- **Deliverable:** Banks enriched with years of Glen's research and thinking.

**Session 4-5: Meetings + Documents**
- Ingest Granola (last 60 days of meetings)
- Ingest OneDrive work files (most recent and most relevant first)
- Compile banks after each source
- **Calibration point:** After Granola batch, same review process
- **Deliverable:** Banks include recent meeting decisions and document knowledge.

**Session 6: External Comms + Calibration**
- Ingest Gmail (last 30 days, business threads)
- Ingest Slack (last 30 days, configured channels)
- Full calibration review: Glen looks at bank state holistically
  - "What's missing?"
  - "What's noise that got through?"
  - "Are the bank divisions right or should something be split/merged?"
- Adjust scoring criteria based on feedback
- **Deliverable:** All sources online. Scoring calibrated.

**Session 7: Research Activation + Go-Live**
- Create research briefs for all initial domains
- Set up CronCreate schedules for all routines (research + ingestion + brief)
- Run first research cycle manually to calibrate
- Verify end-to-end: research → ingest → compile → brief
- Modify CLAUDE.md: add intelligence pipeline session-start instructions + bank routing table
- Update role AGENT.md files: add `knowledge_banks:` fields
- **Deliverable:** Fully operational pipeline. Proactive research running. Intelligence surfaces in every session from here forward.

### Calibration Protocol (repeated for each new source)

1. Present 10 sample extracts (mix of high-scoring and low-scoring)
2. Glen marks each: "useful" / "noise" / "borderline"
3. For "noise" items: what made them not useful? Adjust criteria.
4. For "borderline" items: would they be useful if better categorised? Adjust topic detection.
5. Re-score the full batch with adjusted criteria
6. Proceed with compilation using calibrated scores
7. Store calibration decisions in `intelligence/config/scoring_criteria/{source}.md`:
   ```markdown
   # Scoring Calibration: Granola
   
   ## Glen's Feedback (2026-05-28)
   - Meeting logistics (room booking, "let's reschedule") = always noise (relevance 1-2)
   - Client small talk at start of meetings = noise unless it reveals personal context
   - Strategic direction even if tentative = always extract (relevance 7+)
   - Action items without context = low value (actionability 3-4). Include only with WHY.
   
   ## Adjusted Thresholds
   - Standard thresholds apply (6/5/5)
   - Source-specific rule: if extract is ONLY action items without strategic context, score actionability -2
   ```

---

## Cost Model

All scheduled routines run as Claude Code sessions via CronCreate. Cost is Claude Code subscription usage, not raw API token billing. Here's the resource budget:

### Steady-State Daily Load

| Routine | Frequency | Est. Duration | Context Used |
|---------|-----------|---------------|--------------|
| intel-research-industry | Daily | 5-10 min | ~50K tokens (search + extraction) |
| intel-ingest-granola | Daily | 3-5 min | ~20K tokens (MCP calls + extraction) |
| intel-ingest-email | Daily | 5-8 min | ~30K tokens (search + extraction) |
| intel-ingest-slack | Daily | 3-5 min | ~20K tokens (read + extraction) |
| intel-brief | Daily | 2-3 min | ~15K tokens (read state + generate) |
| Compilation (triggered) | ~3x/week | 5-10 min each | ~40K tokens per compilation |

**Daily total:** ~140-175K tokens, ~20-30 minutes of agent time
**Weekly total:** ~1M-1.2M tokens, ~2.5-3.5 hours of agent time (including weekly research cycles)

### Weekly Research Load (on top of daily)

| Routine | Frequency | Est. Duration | Context Used |
|---------|-----------|---------------|--------------|
| intel-research-pitchdecks | Weekly | 10-15 min | ~80K tokens |
| intel-research-production | Weekly | 10-15 min | ~80K tokens |
| intel-research-competitors | Weekly | 8-12 min | ~60K tokens |
| intel-research-forecasts | Fortnightly | 10-15 min | ~80K tokens |

**Weekly research total:** ~250-350K tokens, ~40-60 minutes of agent time

### Total Estimated Resource Usage

- **Daily:** ~30 min Claude Code agent time
- **Weekly:** ~4-5 hours total Claude Code agent time (daily + weekly research)
- **Monthly:** ~18-22 hours total Claude Code agent time

This is equivalent to having a part-time research assistant working 4-5 hours per week to keep your knowledge current. The trade-off: this consumes Claude Code quota but produces compounding intelligence that makes every working session more informed.

### Cost Optimisation Levers

If usage is too high:
1. Reduce industry intelligence to every-other-day (saves 50% of daily research tokens)
2. Switch ingestion agents to Sonnet tier (cheaper, adequate for extraction)
3. Reduce research depth (fewer sources per cycle)
4. Increase compilation threshold (from 3 to 5 extracts before triggering)

If usage is acceptable and Glen wants MORE:
1. Add more research domains
2. Increase research frequency
3. Expand email/Slack monitoring scope
4. Add Google Drive integration (documents shared by clients)

---

## Failure Modes and Recovery

| Failure | Detection | Response | Escalation |
|---------|-----------|----------|-----------|
| MCP down (Granola/Gmail/Slack) | Tool call returns error | Skip source. Log failure in pipeline_state.md. Retry next cycle. Don't block other sources. | If fails 3 consecutive cycles: surface to Glen "MCP connection to [X] has failed 3 days running." |
| Research returns nothing | All findings score below threshold | Log. Adjust research brief focus for next cycle. | After 3 consecutive empty cycles: surface to Glen "Research for [domain] is consistently empty. Adjust brief or pause?" |
| Quality gate rejects everything | 0 promoted from 10+ ingested | Log with reasons. Check: is the source low-value or are criteria too strict? | Surface to Glen: "Ingested 15 from [source], all rejected. Source may be noise. Review criteria?" |
| Bank exceeds 500 lines | Compilation agent detects at write time | Don't write. Propose split to Glen with natural division points. | Blocks until Glen approves split or raises the limit. |
| Two banks overlap >50% | Pipeline detects shared extracts | Propose merge or boundary clarification. | Blocks new compilations for overlapping banks until resolved. |
| Contradictory information | Compilation agent detects | Apply contradiction rules. Include both with provenance. Add to Open Questions. | No escalation unless contradictions affect active client work. |
| Pipeline state corrupt/missing | Expected file not found or unparseable | Regenerate from source: scan raw/ directories, read bank frontmatter. No data loss. | Automatic recovery. Inform Glen: "Pipeline state regenerated from source files." |
| Context budget blown | >2 full banks loaded + session is sluggish | Unload least-relevant bank. Summarise instead. | Mention to Glen: "I've unloaded [bank] to manage context. Summary available." |
| Source format changes | Connector fails to parse (ChatGPT export format update, etc.) | Stop connector. Log error. | Surface immediately: "[source] connector broken. Format may have changed. Needs fix." |
| Compilation produces incoherent output | Self-check by compilation agent (can it answer: "does this read as a coherent document?") | Retry once with explicit instruction to tighten. If still bad: flag for human review. | "Compilation of [bank] produced poor output. Previous version retained. Needs attention." |
| Scheduled routine doesn't fire | Pipeline state shows last_run > 2x expected interval | Brief generation notices and includes in "Pipeline Health" section. | "Routine [X] hasn't fired in [Y] days. Check CronCreate configuration." |

---

## Relationship to Existing Systems

### /compile-client

**Remains as-is. Different job:**
- `/compile-client` produces CLIENT_BRAIN.md for a SPECIFIC client. Per-client depth. Loaded when doing that client's work.
- Intelligence pipeline's `client_patterns` bank is CROSS-CLIENT — patterns and approaches that worked across engagements.

**Integration:** When `/compile-client` runs, it deposits a "summary of new client knowledge" extract into `intelligence/raw/onedrive/` as a side effect. This feeds the cross-client patterns bank. The CLIENT_BRAIN.md is NOT a bank and NOT managed by the pipeline — it's a separate, client-facing artefact.

### /autoresearch

**Used within the pipeline for two purposes:**
1. The scoring rubric pattern (quality gates) is adapted from autoresearch criteria
2. Periodically, `/autoresearch` can be run ON a bank to improve its synthesis quality:
   > `/autoresearch intelligence/banks/games_pitch_decks.md --criteria consulting`
   This improves the bank's prose quality, not its content.

**Not replaced.** /autoresearch still works standalone for any document.

### Brain modules (brain/)

**Not replaced. Fed by synthesis layer.**
Brain modules remain manually curated business context. The pipeline adds a single pointer at the bottom of relevant modules:
```markdown
## Intelligence Pipeline
Related: intelligence/banks/{bank}.md ({N} entries, updated {date})
```
One line. Non-intrusive. Links the brain to deeper intelligence without cluttering it.

### Role AGENT.md files

**Extended with one optional field:**
```yaml
knowledge_banks:
  - games_pitch_decks
  - forecast_models
  - industry_current
```
When a role is dispatched, its listed banks are auto-loaded via the CLAUDE.md routing instruction. Roles without this field work exactly as before.

### Session continuity system

**Extended, not changed.** Session logs now include a "Banks loaded" note:
```markdown
## Intelligence
Banks loaded this session: production_methods, client_couch_heroes
Proactive surfaces: 1 (Shape Up case study from production_methods)
```
This feeds the usage tracking in `pipeline_state.md` for the feedback loop.

---

## Success Criteria

1. **Session-start intelligence is relevant.** Glen starts a session and the brief tells him something useful without being asked. Not noise — actual "I didn't know that" or "good, that's ready when I need it."

2. **New topics are detected within days, not weeks.** When Couch Heroes work starts generating HR content, the system suggests an HR bank within 1-2 ingestion cycles (2-4 days).

3. **Research produces real exemplars.** The pitch_decks bank contains actual pitch decks (or detailed structural analyses of real ones), not "10 tips for pitching." Same standard for all research domains.

4. **Quality gates work.** Glen trusts what's in the banks. He doesn't have to wade through noise to find signal. If he opens a bank, everything in it is useful.

5. **Provenance is instant.** "Where did this come from?" → one-hop answer, every time.

6. **The system grows itself.** After 30 days, there are banks Glen didn't manually create — the system noticed the patterns and built them.

7. **Mid-session surfacing feels helpful, not intrusive.** When the system surfaces something, it's relevant to exactly what's being discussed. When it's not relevant, it stays quiet. The suppression rules work.

8. **Context overhead is invisible.** ~200 lines at session start. Glen never feels the pipeline is slowing anything down or consuming too much space.

9. **The pipeline self-monitors.** Stale banks get flagged. Failing connectors get reported. Empty research cycles trigger adjustment. Glen doesn't have to remember to maintain it.

10. **30-day litmus test.** One month after go-live, Glen can point to at least 3 specific moments where the pipeline surfaced knowledge that materially improved a piece of client work, and would not have surfaced otherwise.
