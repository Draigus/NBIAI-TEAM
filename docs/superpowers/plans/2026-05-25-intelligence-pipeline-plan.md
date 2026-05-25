# NBI Intelligence Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a five-layer intelligence pipeline that proactively gathers, structures, and surfaces knowledge for NBI's gaming advisory work — from personal sources (Granola, Gmail, Slack, OneDrive, ChatGPT) and web research into compiled knowledge banks that auto-load during sessions.

**Architecture:** Markdown-based knowledge system implemented as Claude Code skills + configuration. Five layers: Ingestion (source connectors) → Compilation (quality-gated synthesis into banks) → Synthesis (briefs + summaries) → Surfacing (CLAUDE.md routing rules) → Research (scheduled proactive agents). All output is markdown. No application code — the "runtime" is Claude Code itself.

**Tech Stack:** Claude Code skills (.claude/skills/), MCP integrations (Granola, Gmail, Slack), local filesystem access, CronCreate for scheduling, git for versioning.

**Spec:** `docs/superpowers/specs/2026-05-25-intelligence-pipeline-design.md`

---

## Scope Note

This plan covers 7 implementation phases matching the spec's "First-Run Strategy." Each phase is one session's work. Phases are sequential — each depends on the prior phase completing. Phase 1 produces a working system; subsequent phases expand source coverage and activate proactive research.

---

## File Map

### New directories to create:
```
intelligence/
intelligence/raw/
intelligence/raw/granola/
intelligence/raw/gmail/
intelligence/raw/slack/
intelligence/raw/chatgpt/
intelligence/raw/claude_sessions/
intelligence/raw/onedrive/
intelligence/raw/downloads/
intelligence/raw/web_research/
intelligence/banks/
intelligence/synthesis/
intelligence/synthesis/bank_summaries/
intelligence/config/
intelligence/config/bank_schemas/
intelligence/config/scoring_criteria/
intelligence/config/research_briefs/
intelligence/prompts/
```

### New files (Phase 1 — infrastructure):
```
intelligence/config/bank_registry.md          — Master bank list
intelligence/config/source_config.md          — Source paths, filters, schedules
intelligence/config/pipeline_rules.md         — Orchestration thresholds
intelligence/config/suppression_rules.md      — When NOT to surface
intelligence/prompts/ingestion_agent.md       — Extraction agent system prompt
intelligence/prompts/compilation_agent.md     — Bank compilation system prompt
intelligence/prompts/research_agent.md        — Research agent system prompt
intelligence/prompts/brief_agent.md           — Brief generation system prompt
intelligence/prompts/topic_detection.md       — Topic classification prompt
intelligence/config/bank_schemas/production_methods.md
intelligence/config/bank_schemas/games_pitch_decks.md
intelligence/config/bank_schemas/forecast_models.md
intelligence/config/bank_schemas/industry_current.md
intelligence/config/bank_schemas/client_patterns.md
intelligence/config/bank_schemas/personal_insights.md
intelligence/pipeline_state.md                — Runtime state tracking
intelligence/research_log.md                  — Audit trail
intelligence/synthesis/intelligence_brief.md  — Daily brief
```

### New skills:
```
.claude/skills/ingest-chats/SKILL.md          — ChatGPT + Claude session ingestion
.claude/skills/ingest-granola/SKILL.md        — Granola meeting ingestion
.claude/skills/ingest-email/SKILL.md          — Gmail ingestion
.claude/skills/ingest-slack/SKILL.md          — Slack ingestion
.claude/skills/ingest-local/SKILL.md          — OneDrive + Downloads ingestion
.claude/skills/ingest-research/SKILL.md       — Research output ingestion
.claude/skills/compile-bank/SKILL.md          — Bank compilation
.claude/skills/intel-brief/SKILL.md           — Brief generation
.claude/skills/intel-research/SKILL.md        — Research agent wrapper
```

### Modified files:
```
CLAUDE.md                                     — Add intelligence pipeline session-start + routing
```

---

## Phase 1: Infrastructure Bootstrap + First Harvest (Session 1)

### Task 1: Create Directory Structure

**Files:**
- Create: All directories listed above

- [ ] **Step 1: Create the intelligence directory tree**

```powershell
$dirs = @(
  "intelligence/raw/granola",
  "intelligence/raw/gmail",
  "intelligence/raw/slack",
  "intelligence/raw/chatgpt",
  "intelligence/raw/claude_sessions",
  "intelligence/raw/onedrive",
  "intelligence/raw/downloads",
  "intelligence/raw/web_research",
  "intelligence/banks",
  "intelligence/synthesis/bank_summaries",
  "intelligence/config/bank_schemas",
  "intelligence/config/scoring_criteria",
  "intelligence/config/research_briefs",
  "intelligence/prompts"
)
foreach ($d in $dirs) { New-Item -ItemType Directory -Force -Path $d }
```

- [ ] **Step 2: Create .gitkeep files so empty dirs are tracked**

```powershell
$keepDirs = @(
  "intelligence/raw/granola",
  "intelligence/raw/gmail",
  "intelligence/raw/slack",
  "intelligence/raw/chatgpt",
  "intelligence/raw/claude_sessions",
  "intelligence/raw/onedrive",
  "intelligence/raw/downloads",
  "intelligence/raw/web_research"
)
foreach ($d in $keepDirs) { New-Item -ItemType File -Force -Path "$d/.gitkeep" }
```

- [ ] **Step 3: Commit**

```bash
git add intelligence/
git commit -m "intel: create directory structure for intelligence pipeline"
```

---

### Task 2: Write Agent Prompts

**Files:**
- Create: `intelligence/prompts/ingestion_agent.md`
- Create: `intelligence/prompts/compilation_agent.md`
- Create: `intelligence/prompts/research_agent.md`
- Create: `intelligence/prompts/brief_agent.md`
- Create: `intelligence/prompts/topic_detection.md`

- [ ] **Step 1: Write ingestion agent prompt**

Write to `intelligence/prompts/ingestion_agent.md` — the full prompt from the spec's "The Ingestion Agent Prompt" section. This is the system instruction given to every extraction sub-agent. Content starts with "You are an intelligence extraction agent for NBI..." and includes: what constitutes knowledge, what to skip, scoring rules (relevance/novelty/actionability with per-score definitions), bank assignment rules, sensitivity classification (5 levels), and output format requirements.

- [ ] **Step 2: Write compilation agent prompt**

Write to `intelligence/prompts/compilation_agent.md` — the full prompt from the spec's "The Compilation Agent Prompt" section. Starts with "You are a knowledge compiler for NBI..." Includes: 7 principles (synthesise not append, structure by usefulness, preserve provenance, judge quality, contradict explicitly, maintain schema, stay within 500 lines), inputs/outputs specification, contradiction resolution rules (5 ordered rules).

- [ ] **Step 3: Write research agent prompt**

Write to `intelligence/prompts/research_agent.md` — the full prompt from the spec's "The Research Agent Prompt" section. Starts with "You are a research agent for NBI..." Includes: process (6 steps), quality over quantity hard rules (3 excellent > 10 mediocre, never pad, never include listicles/generic advice/paywalled content), output format (one extract per finding + research log entry).

- [ ] **Step 4: Write brief generation prompt**

Write to `intelligence/prompts/brief_agent.md` — the full prompt from the spec's "The Brief Generation Agent Prompt" section. Includes: inputs (5 items: pipeline_state, bank frontmatter, recent session log, calendar, research log), exact brief structure to follow, principles (brevity, relevance, no padding, actionable items only).

- [ ] **Step 5: Write topic detection prompt**

Write to `intelligence/prompts/topic_detection.md`:

```markdown
# Topic Detection Instructions

You classify extracted knowledge into existing banks or flag it for new bank creation.

## Process

1. Read the bank registry (provided below your inputs). Each bank has a slug, description,
   and "Accepts Content About" field.

2. For the content you're classifying, ask: "Which existing banks would benefit from this
   knowledge?" Assign bank_candidates based on SEMANTIC match to the "Accepts Content About"
   descriptions. Not keyword matching — meaning matching.

   An extract can match multiple banks. A meeting about production methodology that reveals
   a client-specific decision matches both production_methods AND client_{name}.

3. Confidence check: for EACH bank you assign, you must be >70% confident the content
   belongs there. If confidence is lower, don't assign it.

4. If the content's PRIMARY topic doesn't fit well into ANY existing bank (<70% match to
   any bank's description), add to new_bank_suggestions with:
   - A proposed slug (kebab-case, descriptive)
   - A one-sentence description of what this topic covers
   - Why it doesn't fit existing banks

5. A single extract can have BOTH bank_candidates (for parts that fit) AND
   new_bank_suggestions (for parts that don't). This is normal for meetings that cover
   multiple topics.

## Bank Registry

{Injected at runtime from intelligence/config/bank_registry.md}
```

- [ ] **Step 6: Commit**

```bash
git add intelligence/prompts/
git commit -m "intel: add agent prompts (ingestion, compilation, research, brief, topic detection)"
```

---

### Task 3: Write Configuration Files

**Files:**
- Create: `intelligence/config/bank_registry.md`
- Create: `intelligence/config/source_config.md`
- Create: `intelligence/config/pipeline_rules.md`
- Create: `intelligence/config/suppression_rules.md`

- [ ] **Step 1: Write bank registry**

Write to `intelligence/config/bank_registry.md`:

```markdown
# Bank Registry

Master list of all knowledge banks. The ingestion agent reads this to classify extracts.

## Active Banks

| Slug | Description | Accepts Content About | Role Associations |
|------|-------------|----------------------|-------------------|
| production_methods | Studio production frameworks, sprint methodologies, milestone planning | How studios organise work: sprints, cycles, milestones, team coordination, remote work patterns, agile adaptations for games | producer, production_consultant |
| games_pitch_decks | Pitch deck examples, structures, investor expectations by platform/stage | Investment pitches for games, deck structure, VC expectations, fundraising processes, what works by platform and stage | gaming_practice_lead, cmo |
| forecast_models | Revenue and player forecasting methodologies | Financial models for games, player projections, LTV calculations, retention curve analysis, market sizing, revenue projection frameworks | data_analyst, gaming_practice_lead |
| industry_current | Current market state, trends, deals, platform changes | Acquisitions, funding rounds, studio closures, platform policy changes, market shifts, technology trends in gaming | gaming_practice_lead, cmo |
| client_patterns | Cross-client learnings and engagement patterns | What worked across NBI client engagements, advisory approaches, delivery patterns, pricing that landed, proposals that won | producer, gaming_practice_lead |
| personal_insights | Glen's decisions, preferences, strategic thinking | Glen's choices and reasoning, rejected approaches and why, strategic positions, working patterns, business philosophy | (all roles — loaded on request) |
| client_couch_heroes | Couch Heroes specific knowledge | Anything specific to CH: their team structure, their game, their decisions, their production approach, their people | producer, production_consultant, head_of_people |

## Bank Lifecycle

- Banks are created dynamically when the pipeline detects topic clusters (>= 3 extracts from >= 2 sources in 14 days)
- New banks require Glen's approval unless auto-create is enabled for that topic family
- Banks exceeding 500 lines get split into sub-banks
- Banks unused for 60+ days get flagged for review (archive or deprioritise research)
```

- [ ] **Step 2: Write source configuration**

Write to `intelligence/config/source_config.md`:

```markdown
# Source Configuration

## Local Filesystem Paths

### OneDrive (primary working files)
- Path: D:\OneDrive\Claude_code\
- Path: D:\OneDrive\Documents\
- File types: .md, .txt, .pdf, .docx, .pptx, .xlsx

### Downloads
- Path: C:\Users\gpbea\Downloads\
- File types: .md, .txt, .pdf, .docx, .pptx, .xlsx
- Age filter: last 90 days only (first run), then track changes
- Size filter: skip > 50MB

### ChatGPT Export
- Path: TBD — ask Glen for exact location on OneDrive
- Format: conversations.json (OpenAI export format)

## MCP Sources

### Granola
- Tools: mcp__claude_ai_Granola__list_meetings, mcp__claude_ai_Granola__get_meeting_transcript
- Filter: business meetings only (cross-ref people_directory.md and clients_detailed.md)
- Batch: since last ingestion date

### Gmail
- Tools: mcp__claude_ai_Gmail__search_threads, mcp__claude_ai_Gmail__get_thread
- Search queries:
  - from:vardis@couchheroes.com newer_than:14d
  - from:aris@couchheroes.com newer_than:14d
  - label:nbi newer_than:14d
  - subject:(pitch OR investment OR forecast OR production OR hiring) newer_than:14d -category:promotions -category:social -category:updates
- Exclusions: noreply@, notifications@, calendar invites, newsletters (unless industry data)

### Slack
- Tools: mcp__claude_ai_Slack__slack_read_channel, mcp__claude_ai_Slack__slack_search_public_and_private
- Channels: TBD — configure on first run (list channels, ask Glen which to monitor)
- Filter: substantive exchanges only (>50 words, threaded discussions 3+ replies, shared links with context)

## Ignore Rules (Local Files)

```text
**/node_modules/**
**/.git/**
**/.planning/**
**/session_logs/**
**/session_handoffs/**
**/*.exe
**/*.msi
**/*.dll
**/*.zip
**/*.7z
**/*.rar
**/*.png
**/*.jpg
**/*.gif
**/*.svg
**/*.mp4
**/*.mp3
**/*.wav
**/*.mov
**/package-lock.json
**/yarn.lock
```
```

- [ ] **Step 3: Write pipeline rules**

Write to `intelligence/config/pipeline_rules.md`:

```markdown
# Pipeline Rules

## Compilation Triggers
- Threshold: >= 3 new qualifying extracts for a bank since last compilation
- Full rebuild trigger: > 30% of bank's total extracts are new
- Maximum bank size: 500 lines (split if exceeded)

## Quality Gate Thresholds
- Relevance: >= 6/10
- Novelty: >= 5/10
- Actionability: >= 5/10
- All three must pass. Failing any one = stays in raw/

## Bank Suggestion Threshold
- >= 3 extracts with matching new_bank_suggestions
- From >= 2 different sources
- Within the last 14 days
- Auto-create: disabled (require Glen's approval until 5+ manual approvals)

## Context Budget
- Session-start load: intelligence brief (~50 lines) + up to 3 bank summaries (~50 lines each)
- Mid-session full bank load: maximum 2 at once
- Proactive surfaces per session: maximum 2 (hard cap)

## Scheduling
- Daily ingestion (Granola, Gmail, Slack): 20:00 UK
- Daily brief generation: 07:00 UK
- Weekly research (pitch decks): Monday 06:00 UK
- Weekly research (production): Wednesday 06:00 UK
- Weekly research (competitors): Friday 06:00 UK
- Fortnightly research (forecasts): Tuesday 06:00 UK (alternate weeks)
- Daily research (industry intel): 06:00 UK

## Git Commit Format
- New extracts: intel(raw): ingest {source} +{N} extracts
- New bank: intel(bank): create {bank-slug} ({N} sources)
- Bank update: intel(bank): update {bank-slug} (+{N} extracts)
- Brief: intel(brief): daily brief {date}
- Research: intel(research): {domain} cycle — {N} findings
- Config: intel(config): update {file}
```

- [ ] **Step 4: Write suppression rules**

Write to `intelligence/config/suppression_rules.md` — the full suppression rules from the spec's Layer 4 section. 7 rules: deep technical work, tangential topic match, already surfaced this session, Glen giving directive, session past 75% context, already hit 2 proactive surfaces, Glen said "not now".

- [ ] **Step 5: Commit**

```bash
git add intelligence/config/
git commit -m "intel(config): add bank registry, source config, pipeline rules, suppression rules"
```

---

### Task 4: Write Bank Schemas

**Files:**
- Create: `intelligence/config/bank_schemas/production_methods.md`
- Create: `intelligence/config/bank_schemas/games_pitch_decks.md`
- Create: `intelligence/config/bank_schemas/forecast_models.md`
- Create: `intelligence/config/bank_schemas/industry_current.md`
- Create: `intelligence/config/bank_schemas/client_patterns.md`
- Create: `intelligence/config/bank_schemas/personal_insights.md`
- Create: `intelligence/config/bank_schemas/client_couch_heroes.md`

- [ ] **Step 1: Write production_methods schema**

Write to `intelligence/config/bank_schemas/production_methods.md`:

```markdown
# Bank Schema: production_methods

## Purpose
How game studios organise and deliver work. Frameworks, methodologies, milestone structures, and real-world outcomes from studios of 20-100 people.

## Sections

### Executive Summary
3-5 sentences covering what this bank knows and its current state.

### Framework Comparison
Table format: framework name, team size sweet spot, remote-friendly (Y/N), game-specific adaptations, known outcomes (with source).

### By Team Scale
#### 10-25 People
#### 25-50 People
#### 50-100 People
Each section: which frameworks work, which don't, real data points from studios at this scale.

### By Working Model
#### Fully Remote
#### Hybrid
#### Co-located
What changes by working model. Specific adaptations needed.

### Sprint/Cycle Length Evidence
What the data says about 1-week, 2-week, 6-week, and other cycle lengths. Outcomes, not opinions.

### Pre-Production to Production Transitions
How studios handle the shift. Gate criteria. What goes wrong.

### Live Ops Cadence
Update scheduling, event planning, seasonal content. By genre where relevant.

### Open Questions
What we don't know yet, what needs more research.

### Source Index
Every fact traces to a raw extract via [source: extract_id].
```

- [ ] **Step 2: Write games_pitch_decks schema**

Write to `intelligence/config/bank_schemas/games_pitch_decks.md`:

```markdown
# Bank Schema: games_pitch_decks

## Purpose
Best examples of game pitch decks by platform, stage, and genre. What works, what investors expect, structural patterns that lead to funded outcomes.

## Sections

### Executive Summary
3-5 sentences on what this bank contains.

### What Makes a Game Pitch Deck Work
Top-level patterns across all successful examples. Structural elements that appear consistently.

### By Platform
#### Mobile (F2P, Hypercasual, Mid-core)
#### PC/Console Indie (Premium, Early Access)
#### Live Service / GaaS (Any Platform)
Each: best examples with annotations, structural patterns specific to platform, investor expectations.

### By Stage
#### Pre-Seed / Concept
#### Seed / Pre-Production
#### Series A / Production
#### Late-Stage / Live Service
What changes by stage. How much traction evidence is expected.

### Exemplars
Annotated examples: game title, platform, stage, amount raised, investor, what made it work. Format per spec: structure, what works, key differentiator, applicability.

### Investor Expectations by Type
VC gaming specialists vs. generalist VCs vs. publishers. What each type expects to see.

### Anti-Patterns
What doesn't work. Common mistakes with evidence.

### Open Questions

### Source Index
```

- [ ] **Step 3: Write forecast_models schema**

Write to `intelligence/config/bank_schemas/forecast_models.md`:

```markdown
# Bank Schema: forecast_models

## Purpose
Revenue and player forecasting methodologies applicable to NBI's client work. Frameworks with documented methodology that can be replicated at indie-to-mid-tier scale.

## Sections

### Executive Summary

### Methodology Comparison
Table: model name, what it predicts, inputs required, scale it works at, documented accuracy, source.

### Revenue Projection Models
#### F2P Conversion Funnels
#### Premium Revenue Forecasting
#### Hybrid Monetisation
#### Live Service Event Revenue
Each: the model, its inputs, how to apply it, known limitations.

### Player Forecasting
#### Cohort-Based Retention (D1/D7/D30)
#### LTV Curve Modelling
#### Growth Projection from Soft Launch Data
Methodologies with specific formulas or frameworks where available.

### Production Cost Estimation
#### By Team Size
#### By Genre
#### By Development Phase
Frameworks for estimating costs before full production data exists.

### Market Sizing
How to size a market for a specific genre/platform intersection. Bottom-up approaches only (no top-down "1% of $200B").

### Open Questions

### Source Index
```

- [ ] **Step 4: Write remaining schemas (industry_current, client_patterns, personal_insights, client_couch_heroes)**

Write each to its respective file. Each follows the same pattern: Purpose, Executive Summary, domain-specific sections, Open Questions, Source Index. Keep schemas focused on HOW the bank should be structured, not what content it contains.

`industry_current.md`: sections for Acquisitions & Funding, Platform Changes, Market Data, Technology Shifts, Regulatory, Competitive Landscape. Note: 7-day shelf life — entries older than 30 days get archived.

`client_patterns.md`: sections for Engagement Approaches That Worked, Pricing That Landed, Proposals That Won, Delivery Patterns, Common Client Challenges, What To Avoid.

`personal_insights.md`: sections for Strategic Decisions (with reasoning), Rejected Approaches (and why), Business Philosophy, Working Patterns, Client Relationship Approaches.

`client_couch_heroes.md`: sections for Company Profile, Key People & Dynamics, Their Game(s), Production Approach, Current Engagement, Decisions Made, Open Items.

- [ ] **Step 5: Commit**

```bash
git add intelligence/config/bank_schemas/
git commit -m "intel(config): add bank schemas for 7 initial banks"
```

---

### Task 5: Write Pipeline State + Research Log

**Files:**
- Create: `intelligence/pipeline_state.md`
- Create: `intelligence/research_log.md`

- [ ] **Step 1: Write initial pipeline state**

Write to `intelligence/pipeline_state.md`:

```markdown
# Pipeline State

## Last Ingestion Run Per Source

| Source | Last Run | Extracts Produced | Extracts Promoted | Next Scheduled |
|--------|----------|-------------------|-------------------|----------------|
| granola | never | 0 | 0 | TBD |
| gmail | never | 0 | 0 | TBD |
| slack | never | 0 | 0 | TBD |
| onedrive | never | 0 | 0 | manual |
| downloads | never | 0 | 0 | manual |
| chatgpt | never | 0 | 0 | one-time |
| claude_sessions | never | 0 | 0 | manual |
| web_research | never | 0 | 0 | per schedule |

## Bank Compilation Status

| Bank | Last Compiled | New Since | Threshold (3) | Action |
|------|---------------|-----------|---------------|--------|
| production_methods | never | 0 | not met | waiting |
| games_pitch_decks | never | 0 | 0 | waiting |
| forecast_models | never | 0 | 0 | waiting |
| industry_current | never | 0 | 0 | waiting |
| client_patterns | never | 0 | 0 | waiting |
| personal_insights | never | 0 | 0 | waiting |
| client_couch_heroes | never | 0 | 0 | waiting |

## Bank Health

| Bank | Lines | Last Compiled | Shelf Life | Status | Sessions Used (30d) |
|------|-------|---------------|-----------|--------|---------------------|
| (no banks compiled yet) |

## Pending Review

- Sensitive extracts awaiting approval: 0
- Bank suggestions pending: 0
- Stale banks: 0

## Local File Tracking

(populated after first /ingest-local run)
```

- [ ] **Step 2: Write initial research log**

Write to `intelligence/research_log.md`:

```markdown
# Research Log

Audit trail of all research activity. Each entry records what was searched, what was found, and what was promoted to raw extracts.

---

(No research runs yet. First entries will appear after Phase 5 research activation.)
```

- [ ] **Step 3: Commit**

```bash
git add intelligence/pipeline_state.md intelligence/research_log.md
git commit -m "intel(state): initialise pipeline state and research log"
```

---

### Task 6: Build /ingest-chats Skill (Claude Sessions)

**Files:**
- Create: `.claude/skills/ingest-chats/SKILL.md`

- [ ] **Step 1: Write the skill file**

Write to `.claude/skills/ingest-chats/SKILL.md`:

```markdown
---
name: ingest-chats
description: "Ingest Claude session handoffs and ChatGPT export into the intelligence pipeline. Extracts decisions, insights, and knowledge from past AI conversations. Triggers: ingest chats, ingest chatgpt, ingest claude sessions, ingest conversations, harvest chats."
category: intelligence
user-invocable: true
---

# Chat Ingestion Connector

Ingests knowledge from Claude Code session handoffs and ChatGPT exports into raw extracts for the intelligence pipeline.

## Arguments

- `source`: "claude" | "chatgpt" | "both" (default: "both")
- `batch_size`: number of items to process (default: 25)

## Process: Claude Session Handoffs

1. Read `intelligence/pipeline_state.md` for last claude_sessions ingestion date.
2. Glob `projects/nbi_dashboard/session_handoffs/*.md` for files modified after last ingestion.
3. For each handoff file:
   a. Read the file content.
   b. These are already structured (what was done, decisions, state). Extract:
      - Decisions Glen made (with reasoning)
      - Architectural choices and why
      - Approaches rejected and why
      - Client/project insights
      - Knowledge generated that session
   c. Score: relevance, novelty, actionability (using ingestion agent prompt from intelligence/prompts/ingestion_agent.md).
   d. Assign bank_candidates using topic detection (read bank registry from intelligence/config/bank_registry.md).
   e. Write extract to `intelligence/raw/claude_sessions/{date}_{slug}.md` in standard format.
4. Update `pipeline_state.md`: set claude_sessions last run date, record extract count.
5. Check compilation threshold: for each bank in bank_candidates across all new extracts, count pending extracts. If any bank has >= 3 new qualifying extracts, report: "Bank [{slug}] has {N} new extracts — ready for compilation. Run /compile-bank {slug} to integrate."

## Process: ChatGPT Export

1. Read `intelligence/config/source_config.md` for ChatGPT export path.
   - If path is "TBD": ask Glen for the path. Update source_config.md.
2. Read the JSON file (conversations.json or equivalent).
3. Parse conversation list. For each conversation:
   a. Read title.
   b. Apply title relevance filter:
      - INCLUDE: titles mentioning client names (Couch Heroes, Goals, etc.), "NBI", game titles, "pitch", "forecast", "production", "economy", "analysis", "research", "strategy", "pricing", "hiring"
      - EXCLUDE: "test", "hello", "help me with", single-word titles, coding help ("fix this bug", "python error")
      - UNCERTAIN: read first 5 user messages. Include if business/gaming context.
   c. For included conversations: reconstruct message chain from mapping structure.
   d. Feed full conversation to ingestion agent (using prompt from intelligence/prompts/ingestion_agent.md) with context:
      "This is a ChatGPT conversation. Title: {title}. Date: {date}. Extract: conclusions reached, research findings, frameworks developed, decisions made, insights. Do NOT extract questions — only knowledge generated."
   e. Agent produces extract(s). If conversation spans multiple unrelated topics: split.
   f. Score and classify per standard process.
   g. Write extracts to `intelligence/raw/chatgpt/{conversation-id}_{slug}.md`.
4. Process in batches of {batch_size}. Report progress: "Processed {N}/{total} conversations. {M} extracts produced."
5. Update `pipeline_state.md`.
6. Report compilation readiness per bank.

## Deduplication

Before writing any extract, check source_id against existing files in the target raw/ directory. Skip if an extract with that source_id already exists.

## Output

Report at end of run:
- Conversations/handoffs processed: {N}
- Extracts produced: {M}
- Extracts by bank candidate: {bank: count}
- New bank suggestions: {list if any}
- Banks ready for compilation (>= 3 threshold): {list}
```

- [ ] **Step 2: Verify skill file is valid**

Read back the file and confirm: has frontmatter with name, description, category, user-invocable. Has clear process steps. References correct paths and prompts.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/ingest-chats/
git commit -m "intel: add /ingest-chats skill (Claude sessions + ChatGPT export)"
```

---

### Task 7: Build /compile-bank Skill

**Files:**
- Create: `.claude/skills/compile-bank/SKILL.md`

- [ ] **Step 1: Write the skill file**

Write to `.claude/skills/compile-bank/SKILL.md`:

```markdown
---
name: compile-bank
description: "Compile raw intelligence extracts into a structured knowledge bank. Synthesises multiple extracts into coherent, queryable reference document. Triggers: compile bank, compile intelligence, build bank, update bank, synthesise knowledge."
category: intelligence
user-invocable: true
---

# Bank Compilation

Compiles raw intelligence extracts into a structured knowledge bank following the compilation agent's synthesis principles.

## Arguments

- `bank`: bank slug to compile (required). Must exist in intelligence/config/bank_registry.md.
- `--full`: force full rebuild (discard current bank and regenerate from all qualifying extracts)

## Process

1. **Validate bank exists.** Read `intelligence/config/bank_registry.md`. Confirm the slug is listed. If not: "Bank '{slug}' not found in registry. Available banks: {list}."

2. **Read bank schema.** Load `intelligence/config/bank_schemas/{slug}.md`. This defines the section structure.

3. **Gather qualifying extracts.**
   - Glob all files in `intelligence/raw/` (all source subdirectories).
   - Read frontmatter of each. Select where `bank_candidates` contains this bank's slug.
   - Apply quality gate: relevance >= 6 AND novelty >= 5 AND actionability >= 5.
   - If `--full`: use ALL qualifying extracts.
   - If incremental: use only extracts with `ingested` date > bank's `last_compiled` date.

4. **Check sensitivity.** If any qualifying extracts are `sensitivity_class: restricted`, list them and ask Glen for approval before including. Skip `restricted` extracts without approval.

5. **Read current bank** (if incremental). Load `intelligence/banks/{slug}.md` if it exists.

6. **Run compilation agent.** Spawn a sub-agent with:
   - System prompt: content of `intelligence/prompts/compilation_agent.md`
   - Inputs: current bank content (or "empty — new bank"), bank schema, qualifying extracts, bank registry entry
   - Instruction (incremental): "Update this existing bank with these {N} new extracts. Integrate — don't append. Tighten existing content if new material supersedes it."
   - Instruction (new/full): "Create this bank from scratch. Here is the schema and {N} qualifying extracts. Synthesise into a coherent reference document."

7. **Verify output.**
   - Line count <= 500. If exceeded: ask compilation agent to tighten or recommend a split.
   - Has all schema sections (at minimum Executive Summary, domain sections, Open Questions, Source Index).
   - Every factual claim has a [source: extract_id] tag.

8. **Write bank.** Save to `intelligence/banks/{slug}.md`.

9. **Generate bank summary.** Write 50-line summary to `intelligence/synthesis/bank_summaries/{slug}.md` following the summary format: title, metadata line, What This Bank Knows (5 bullets), Most Recent Additions, Gaps.

10. **Update pipeline state.** In `pipeline_state.md`: update bank's last_compiled date, line count, extract count.

11. **Check if brief needs regeneration.** If >= 5 new entries were added OR this is a new bank: regenerate `intelligence/synthesis/intelligence_brief.md` by running the brief generation process.

12. **Commit.**
    ```
    git add intelligence/banks/{slug}.md intelligence/synthesis/bank_summaries/{slug}.md intelligence/pipeline_state.md
    git commit -m "intel(bank): {create|update} {slug} ({N} sources)"
    ```

## Anonymisation Handling

If any qualifying extract has `sensitivity_class: anonymisable`:
- For the client-scoped bank: include the full specific version
- For general banks: strip client name, replace with anonymous descriptor (e.g., "a 55-person remote UK game studio"), preserve the insight/pattern

## Output

Report:
- Bank: {slug}
- Mode: {new | incremental | full rebuild}
- Extracts integrated: {N}
- Bank size: {lines} / 500 max
- Key additions: {bullet list of main new content}
- Split needed: {yes/no}
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/compile-bank/
git commit -m "intel: add /compile-bank skill"
```

---

### Task 8: Build /intel-brief Skill

**Files:**
- Create: `.claude/skills/intel-brief/SKILL.md`

- [ ] **Step 1: Write the skill file**

Write to `.claude/skills/intel-brief/SKILL.md`:

```markdown
---
name: intel-brief
description: "Generate or regenerate the daily intelligence brief. Summarises pipeline state, bank health, what's new, and what's relevant to current work. Triggers: intel brief, intelligence brief, morning brief, what's new in intelligence, pipeline status."
category: intelligence
user-invocable: true
---

# Intelligence Brief Generation

Produces the daily intelligence brief that surfaces at session start.

## Process

1. **Read pipeline state.** Load `intelligence/pipeline_state.md` for: last ingestion dates, bank compilation status, pending items.

2. **Read bank frontmatter.** For each file in `intelligence/banks/*.md`: read the first 15 lines (frontmatter + executive summary). Extract: bank name, last_compiled, sources_count, lines.

3. **Determine last session date.** Read the most recent file in `projects/nbi_dashboard/session_logs/` to determine when Glen last worked.

4. **Identify what's new.** Compare bank last_compiled dates against last session date. Any bank updated since last session = "new" content to surface.

5. **Determine current work context.** Read the most recent session log's last 30 lines. What was Glen working on? What topics were active?

6. **Read research log.** Check `intelligence/research_log.md` for any research completed since last session.

7. **Generate brief.** Following the exact structure from `intelligence/prompts/brief_agent.md`:
   - What's New (only if something changed)
   - Bank Suggestions Pending (if any topics crossed threshold)
   - Today's Context (one sentence on likely work + most relevant banks)
   - Pipeline Health (bank count, stale count, pending items)
   - Actions Needed (only if there are actions requiring Glen)

8. **Write brief.** Save to `intelligence/synthesis/intelligence_brief.md`.

9. **Commit** (if significant changes from previous brief):
   ```
   git add intelligence/synthesis/intelligence_brief.md
   git commit -m "intel(brief): daily brief {date}"
   ```

## Principles

- Maximum 80 lines. Glen reads this at session start — don't waste time.
- If nothing changed: "Pipeline quiet since last session. No new intelligence." (one line, not a full brief)
- Only surface what's relevant to current work or genuinely new.
- Actions section ONLY for items requiring Glen's input. Don't pad.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/intel-brief/
git commit -m "intel: add /intel-brief skill"
```

---

### Task 9: First Harvest — Ingest Claude Session Handoffs

This is the first actual run of the pipeline. Process all existing session handoffs.

- [ ] **Step 1: Run /ingest-chats with source=claude**

Invoke the skill manually: `/ingest-chats source=claude`

This will:
- Glob all session handoffs
- Extract decisions, insights, knowledge from each
- Produce raw extracts in `intelligence/raw/claude_sessions/`
- Report which banks have pending extracts

- [ ] **Step 2: Review first 5 extracts for quality**

Read 5 of the produced extracts. Check:
- Are scores reasonable? (not everything at 10, not everything at 3)
- Are bank_candidates correct? (assigned to the right banks)
- Is the extraction useful? (captures knowledge, not just activity)
- Is sensitivity_class appropriate?

If quality is poor: adjust the ingestion agent prompt and re-run.

- [ ] **Step 3: Compile banks that hit threshold**

For each bank that reached >= 3 qualifying extracts, run: `/compile-bank {slug}`

Expected: `personal_insights` and `client_patterns` will likely hit threshold first (handoffs contain many decisions and cross-client patterns).

- [ ] **Step 4: Generate first intelligence brief**

Run: `/intel-brief`

This produces the first `intelligence/synthesis/intelligence_brief.md`.

- [ ] **Step 5: Commit all raw extracts and compiled banks**

```bash
git add intelligence/raw/claude_sessions/ intelligence/banks/ intelligence/synthesis/ intelligence/pipeline_state.md
git commit -m "intel: first harvest — Claude session handoffs ingested and compiled"
```

- [ ] **Step 6: Verify end-to-end**

Confirm:
- `intelligence/raw/claude_sessions/` contains extract files
- `intelligence/banks/` contains at least 1-2 compiled bank files
- `intelligence/synthesis/intelligence_brief.md` exists and is <80 lines
- `intelligence/synthesis/bank_summaries/` has summaries for compiled banks
- `pipeline_state.md` is updated with current dates and counts

---

## Phase 2: ChatGPT Harvest (Sessions 2-3)

### Task 10: Locate and Ingest ChatGPT Export

- [ ] **Step 1: Find ChatGPT export location**

Ask Glen: "Where is your ChatGPT export on OneDrive? Looking for the conversations.json file (or the ZIP containing it)."

Update `intelligence/config/source_config.md` with the path.

- [ ] **Step 2: Run /ingest-chats with source=chatgpt, batch_size=25**

`/ingest-chats source=chatgpt batch_size=25`

Process first batch of 25 relevant conversations. Report: total conversations found, how many passed relevance filter, extracts produced.

- [ ] **Step 3: Calibration checkpoint**

Present 10 extracts to Glen (mix of high and low scores). Glen marks: useful / noise / borderline.

For "noise" items: document what made them not useful in `intelligence/config/scoring_criteria/chatgpt.md`.

Adjust scoring approach if needed. Re-score and discard noise extracts.

- [ ] **Step 4: Continue batches until complete**

Run additional batches (`/ingest-chats source=chatgpt batch_size=25`) until all relevant conversations are processed. Expected: 2-3 batches across 2-3 sessions.

- [ ] **Step 5: Compile all affected banks**

After all ChatGPT ingestion is complete, compile every bank that hit threshold:
```
/compile-bank production_methods
/compile-bank games_pitch_decks
/compile-bank forecast_models
/compile-bank personal_insights
/compile-bank client_patterns
```
(Only run for banks with >= 3 new qualifying extracts)

- [ ] **Step 6: Regenerate brief and commit**

```
/intel-brief
git add intelligence/
git commit -m "intel: ChatGPT harvest complete — {N} conversations, {M} extracts"
```

---

## Phase 3: MCP Source Integration (Sessions 4-5)

### Task 11: Build /ingest-granola Skill

**Files:**
- Create: `.claude/skills/ingest-granola/SKILL.md`

- [ ] **Step 1: Write the skill file**

Write to `.claude/skills/ingest-granola/SKILL.md`. The skill must:
- Read pipeline_state.md for last Granola ingestion date
- Call `mcp__claude_ai_Granola__list_meetings` (filtered by date)
- For each meeting: check attendees against `brain/people_directory.md` and `brain/clients_detailed.md`
- For business meetings: call `mcp__claude_ai_Granola__get_meeting_transcript`
- Feed transcript to ingestion agent (spawn sub-agent with ingestion prompt)
- One extract per meeting, deposited in `intelligence/raw/granola/{date}_{slug}.md`
- Update pipeline_state.md
- Report compilation readiness

- [ ] **Step 2: Run first Granola ingestion (last 60 days)**

`/ingest-granola` — on first run, pull last 60 days of meetings.

- [ ] **Step 3: Calibration checkpoint for Granola**

Present 10 extracts. Glen marks useful/noise/borderline. Document in `intelligence/config/scoring_criteria/granola.md`.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/ingest-granola/ intelligence/raw/granola/ intelligence/config/scoring_criteria/granola.md
git commit -m "intel: add /ingest-granola skill + first 60-day harvest"
```

### Task 12: Build /ingest-local Skill

**Files:**
- Create: `.claude/skills/ingest-local/SKILL.md`

- [ ] **Step 1: Write the skill file**

Write to `.claude/skills/ingest-local/SKILL.md`. The skill must:
- Read source_config.md for paths, file types, ignore rules
- Glob for whitelisted types in configured paths
- Apply ignore rules
- Compare modification dates against pipeline_state.md's local file tracking section
- Process only new/changed files (max 30 per session)
- For each file: read content, feed to ingestion agent with file context
- Agent can output "SKIP" for operational files with no knowledge
- Deposit extracts in `intelligence/raw/onedrive/` or `intelligence/raw/downloads/` based on source path
- Update pipeline_state.md (local file tracking section)
- Report compilation readiness

- [ ] **Step 2: Run first local ingestion**

`/ingest-local` — process most recent/relevant OneDrive work files.

- [ ] **Step 3: Compile affected banks and commit**

```bash
# Compile banks at threshold
# Commit
git add intelligence/
git commit -m "intel: add /ingest-local skill + first OneDrive/Downloads harvest"
```

### Task 13: Compile All Banks After Phase 3

- [ ] **Step 1: Compile every bank that has pending extracts above threshold**

Run `/compile-bank` for each bank with >= 3 new extracts. By this point, most banks should have substantial content.

- [ ] **Step 2: Regenerate brief**

`/intel-brief`

- [ ] **Step 3: Commit**

```bash
git add intelligence/
git commit -m "intel: Phase 3 complete — MCP sources integrated, all banks compiled"
```

---

## Phase 4: External Communications (Session 6)

### Task 14: Build /ingest-email Skill

**Files:**
- Create: `.claude/skills/ingest-email/SKILL.md`

- [ ] **Step 1: Write the skill file**

The skill must:
- Execute Gmail search queries from source_config.md (via `mcp__claude_ai_Gmail__search_threads`)
- Deduplicate by thread ID
- For each thread: call `mcp__claude_ai_Gmail__get_thread`
- Apply exclusion rules (noreply, calendar invites, newsletters, "Thanks"-only threads)
- Feed to ingestion agent
- One extract per thread (split if >20 messages spanning topics)
- Default sensitivity: `internal`; escalate to `restricted` for contracts, `client_scoped` for client data
- Deposit in `intelligence/raw/gmail/{date}_{thread-slug}.md`

- [ ] **Step 2: Run first email ingestion (last 30 days)**

- [ ] **Step 3: Commit**

### Task 15: Build /ingest-slack Skill

**Files:**
- Create: `.claude/skills/ingest-slack/SKILL.md`

- [ ] **Step 1: Write the skill file**

The skill must:
- On first run: list channels via `mcp__claude_ai_Slack__slack_search_channels`, present to Glen for selection
- Store channel selection in source_config.md
- Read configured channels since last ingestion via `mcp__claude_ai_Slack__slack_read_channel`
- Filter: skip emoji-only, "ok", "thanks", scheduling. Keep: >50 words, 3+ reply threads, shared links with context
- Feed to ingestion agent
- One extract per topic thread
- Deposit in `intelligence/raw/slack/{date}_{channel}_{slug}.md`

- [ ] **Step 2: Configure channels with Glen and run first ingestion (last 30 days)**

- [ ] **Step 3: Commit**

### Task 16: Full Calibration Review

- [ ] **Step 1: Present bank state to Glen holistically**

Show: all compiled banks, their sizes, their top entries, their gaps.

- [ ] **Step 2: Collect feedback**

Ask:
- "What's missing that you expected to see?"
- "Anything in here that's noise and shouldn't have made it through?"
- "Are the bank divisions right or should something be split/merged?"

- [ ] **Step 3: Adjust scoring criteria and recompile if needed**

Based on feedback: update scoring criteria files, potentially recompile banks with adjusted thresholds.

- [ ] **Step 4: Commit**

```bash
git add intelligence/
git commit -m "intel: Phase 4 complete — email + Slack integrated, scoring calibrated"
```

---

## Phase 5: Research Activation + Go-Live (Session 7)

### Task 17: Write Research Briefs

**Files:**
- Create: `intelligence/config/research_briefs/games_pitch_decks.md`
- Create: `intelligence/config/research_briefs/forecast_models.md`
- Create: `intelligence/config/research_briefs/production_methods.md`
- Create: `intelligence/config/research_briefs/industry_current.md`
- Create: `intelligence/config/research_briefs/competitors.md`

- [ ] **Step 1: Write all research briefs**

Each brief follows the format from the spec: Objective, Focus This Cycle, Quality Criteria (what's best, what to exclude), Known Sources, Exclusions.

Content for each domain is specified in the spec's "Research Domain Specifications" section. Transfer the "what best means", "what to exclude", "where to search" sections into brief format.

- [ ] **Step 2: Commit**

```bash
git add intelligence/config/research_briefs/
git commit -m "intel(config): add research briefs for 5 domains"
```

### Task 18: Build /intel-research Skill

**Files:**
- Create: `.claude/skills/intel-research/SKILL.md`

- [ ] **Step 1: Write the skill file**

Write to `.claude/skills/intel-research/SKILL.md`:

The skill must:
- Accept a `domain` argument (required): pitch_decks | forecast_models | production_methods | industry_current | competitors
- Read the research brief from `intelligence/config/research_briefs/{domain}.md`
- Spawn a research sub-agent with:
  - System prompt from `intelligence/prompts/research_agent.md`
  - The research brief as context
  - Instruction: "Execute this research brief. Find 3-5 high-quality findings. Score against the brief's quality criteria. Only keep findings >= 6 relevance, >= 5 novelty, >= 5 actionability."
- Agent uses WebSearch and/or Apify actors to find content
- For each finding that passes: format as standard extract, deposit in `intelligence/raw/web_research/{domain}/{date}_{slug}.md`
- Write research log entry to `intelligence/research_log.md`
- Report: what was searched, what was found, what was kept
- If >= 3 findings: report "Bank [{bank}] ready for compilation"

- [ ] **Step 2: Run first research cycle manually**

`/intel-research domain=production_methods`

Verify: produces extracts in the right location, research log is updated, extracts are in correct format.

- [ ] **Step 3: Build /ingest-research skill (format validator)**

Write `.claude/skills/ingest-research/SKILL.md` — the simple connector that validates and deposits research output. (May not be needed as a separate skill if /intel-research deposits directly — evaluate during implementation.)

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/intel-research/ intelligence/raw/web_research/ intelligence/research_log.md
git commit -m "intel: add /intel-research skill + first production_methods research cycle"
```

### Task 19: Set Up Scheduled Routines

- [ ] **Step 1: Create CronCreate routines for research**

Use CronCreate to set up:
- `intel-research-industry`: Daily 06:00 UK → `/intel-research domain=industry_current`
- `intel-research-pitchdecks`: Weekly Monday 06:00 UK → `/intel-research domain=pitch_decks`
- `intel-research-production`: Weekly Wednesday 06:00 UK → `/intel-research domain=production_methods`
- `intel-research-forecasts`: Fortnightly Tuesday 06:00 UK → `/intel-research domain=forecast_models`
- `intel-research-competitors`: Weekly Friday 06:00 UK → `/intel-research domain=competitors`

- [ ] **Step 2: Create CronCreate routines for ingestion**

- `intel-ingest-granola`: Daily 20:00 UK → `/ingest-granola`
- `intel-ingest-email`: Daily 20:00 UK → `/ingest-email`
- `intel-ingest-slack`: Daily 20:00 UK → `/ingest-slack`

- [ ] **Step 3: Create CronCreate routine for brief generation**

- `intel-brief`: Daily 07:00 UK → `/intel-brief`

- [ ] **Step 4: Verify at least one routine fires correctly**

Wait for the next scheduled trigger or manually fire one to confirm the pipeline works end-to-end: research → ingest → compile → brief.

### Task 20: CLAUDE.md Integration — Surfacing Rules

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add intelligence pipeline session-start instructions**

Add after "Session Continuity — MANDATORY" section in CLAUDE.md:

```markdown
## Intelligence Pipeline — Session Start

At the start of every session:

1. Read `intelligence/synthesis/intelligence_brief.md`
2. If the brief is older than 24 hours, run `/intel-brief` to regenerate
3. In your opening message, include the "What's New" section if there IS something new.
   If nothing is new, don't mention the pipeline — just start working.
4. Read the bank summaries listed in "Most Relevant Banks Right Now" (in intelligence/synthesis/bank_summaries/)
5. If there are pending actions (bank suggestions, sensitive extracts), mention them once per session.
6. Do NOT load full banks at session start. Load them when conversation topic matches.
```

- [ ] **Step 2: Add intelligence bank routing table**

Add after the existing "Topic-detected routing" table in CLAUDE.md:

```markdown
### Intelligence bank routing

When the conversation enters a domain covered by a knowledge bank, load the FULL bank
(up to 500 lines) from intelligence/banks/{slug}.md. Announce briefly:
"Loading [bank name] — [one sentence on what it contains and why it's relevant now]."

| Conversation involves... | Load banks |
|---|---|
| Client pitch / proposal | games_pitch_decks, client_patterns, forecast_models |
| Production planning | production_methods, forecast_models |
| Couch Heroes specifically | client_couch_heroes + whatever domain banks match |
| Hiring / team structure | hr_people_ops (if exists), personal_insights |
| Game economy / monetisation | industry_current + role knowledge |
| New client onboarding | client_patterns, games_pitch_decks |
| Forecasting / financial models | forecast_models, industry_current |

For banks not in this table: check the bank's frontmatter for role_associations.
If the currently active role matches, load the bank.

LIMIT: Maximum 2 full banks loaded per topic switch. If more are relevant,
load top 2 and mention: "Also available: [bank] if you need it."
```

- [ ] **Step 3: Add proactive surfacing instruction**

```markdown
### Proactive intelligence surfacing

After loading a bank, scan its entries against the current conversation. If you find
an entry DIRECTLY applicable (same team size, same problem, same methodology, contradicts
a stated assumption):

"The [bank] has something directly relevant — [one sentence]. [Key fact with source].
Want the full entry?"

Rules:
- Maximum 2 proactive surfaces per session (hard cap)
- Only surface if directly applicable, not just same topic
- Never surface content that came from the current conversation
- If Glen says "not now" or ignores: no more proactive surfaces this session
- DO NOT surface during deep technical work (coding, debugging, testing)
```

- [ ] **Step 4: Add suppression rules reference**

```markdown
### Intelligence suppression

Full suppression rules in intelligence/config/suppression_rules.md. In short: don't
surface during debugging, don't surface tangential matches, maximum 2 proactive surfaces,
respect "not now", don't surface past 75% context.
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "intel: integrate intelligence pipeline into CLAUDE.md (session-start + routing + surfacing)"
```

### Task 21: Update Role AGENT.md Files

- [ ] **Step 1: Add knowledge_banks field to relevant roles**

For each role listed in bank_registry.md role_associations, add a `knowledge_banks:` field to their AGENT.md frontmatter:

- `roles/producer/AGENT.md`: knowledge_banks: [production_methods, client_patterns, client_couch_heroes]
- `roles/production_consultant/AGENT.md`: knowledge_banks: [production_methods, client_couch_heroes]
- `roles/gaming_practice_lead/AGENT.md`: knowledge_banks: [games_pitch_decks, forecast_models, industry_current, client_patterns]
- `roles/cmo/AGENT.md`: knowledge_banks: [games_pitch_decks, industry_current]
- `roles/data_analyst/AGENT.md`: knowledge_banks: [forecast_models]
- `roles/head_of_people/AGENT.md`: knowledge_banks: [personal_insights]

- [ ] **Step 2: Commit**

```bash
git add roles/*/AGENT.md
git commit -m "intel: add knowledge_banks field to role AGENT.md files"
```

### Task 22: End-to-End Verification

- [ ] **Step 1: Simulate a full session start**

Pretend to start a fresh session. Verify:
1. Intelligence brief loads and is current
2. Bank summaries for top-3 relevant banks are accessible
3. Topic detection works: discuss "production planning" → system loads production_methods bank
4. Brief is <80 lines and informative

- [ ] **Step 2: Verify research → ingest → compile → surface flow**

1. Run `/intel-research domain=industry_current` manually
2. Verify extracts appear in `intelligence/raw/web_research/industry_current/`
3. If threshold met, run `/compile-bank industry_current`
4. Verify bank is updated
5. Run `/intel-brief` — verify the update appears in "What's New"

- [ ] **Step 3: Final commit and status update**

```bash
git add intelligence/ .claude/skills/
git commit -m "intel: Phase 5 complete — pipeline fully operational"
```

Update `pipeline_state.md` with all scheduled routine IDs and next-run times.

---

## Verification Checklist (run after Phase 5)

- [ ] All 9 intelligence directories exist and contain expected content
- [ ] All 5 agent prompts are written and referenced correctly by skills
- [ ] Bank registry has 7 entries with descriptions and role associations
- [ ] At least 4 banks are compiled with >10 entries each
- [ ] Intelligence brief generates correctly and is <80 lines
- [ ] Bank summaries exist for all compiled banks and are <50 lines each
- [ ] /ingest-chats processes Claude handoffs correctly
- [ ] /ingest-granola pulls meetings and produces extracts
- [ ] /ingest-local processes OneDrive/Downloads files
- [ ] /ingest-email searches Gmail and produces extracts
- [ ] /ingest-slack reads channels and produces extracts
- [ ] /intel-research finds content and produces scored extracts
- [ ] /compile-bank synthesises extracts into coherent banks
- [ ] /intel-brief generates current, relevant briefs
- [ ] CLAUDE.md has session-start, routing, and surfacing instructions
- [ ] Role AGENT.md files have knowledge_banks field
- [ ] Scheduled routines are configured via CronCreate
- [ ] Pipeline state file is current and accurate
- [ ] At least one research cycle has run successfully end-to-end
- [ ] Glen has completed calibration for at least 2 sources
