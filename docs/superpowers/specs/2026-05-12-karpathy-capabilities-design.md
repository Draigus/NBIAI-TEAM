# Karpathy-Derived Capabilities — Design Spec

## Overview

Three capabilities that operationalise patterns from Andrej Karpathy's research for NBI's consulting and product work. Built as Claude Code skills (capabilities 1-2) and business content (capability 3). All read/write to files the Command Centre's Dashboard and Briefing tabs scan — designed for compatibility, not conflict.

## Capability 1: Client Wiki Compiler (`/compile-client`)

### Purpose

Replace the manual "read 18 files at session start" pattern with a compiled, structured knowledge base per client. Based on Karpathy's LLM Wiki pattern: compile once, load the artefact, don't re-read raw sources every session.

### Invocation

```
/compile-client Clients/Goals
/compile-client Clients/Couch\ Heroes
/compile-client <any-folder-path>
```

### Architecture

1. **Intake:** Skill receives a folder path. Validates it exists and contains readable files.

2. **File discovery:** Globs for all supported types:
   - Markdown (`.md`) — read directly
   - PDF (`.pdf`) — read via Claude's native PDF capability
   - Word (`.docx`) — extract text via a sub-agent reading the file
   - Excel (`.xlsx`) — extract sheet names and data via a sub-agent
   - PowerPoint (`.pptx`) — extract slide text via a sub-agent
   - Plain text (`.txt`) — read directly
   - Ignores binary files, images, scripts (`.py`, `.js`)

3. **Parallel extraction:** Spawns sub-agents to read file batches in parallel. Each agent extracts:
   - Key facts, entities, and relationships
   - Provenance tags: every fact attributed to its source file
   - Open questions or ambiguities found in the docs

4. **Synthesis:** A synthesis agent takes all extracted content and compiles it into a structured wiki with these sections:

   ```markdown
   # {Client Name} — Client Brain
   ### Compiled: {date} | Sources: {N} files | Compiler: /compile-client

   ## Company Profile
   ## Product / Game
   ## Key Contacts
   ## Engagement History & Commercial Terms
   ## Domain Context
   ### Pricing & Economy
   ### Live Operations
   ### Production & Roadmap
   ### Market Position & Competitors
   ## Open Questions
   ## Decision Log
   ## Source Index
   ```

   Every fact includes a provenance tag: `[source: filename.md]`

5. **Output:** Writes `{folder}/CLIENT_BRAIN.md` and commits to git.

6. **Re-run behaviour:** When re-run on a folder that already has a CLIENT_BRAIN.md, the compiler reads the existing wiki first, then recompiles. Git diff shows what changed. The previous version is preserved in git history.

### CC Scanner Compatibility

New skill directory: `.claude/skills/compile-client/`

Files:
- `SKILL.md` — frontmatter with `name: compile-client`, `description: ...`, `category: knowledge`
- `learnings.md` — empty initially, populated after real usage

The CC's `scanSkills()` will index this automatically. The compiled CLIENT_BRAIN.md files live in `Clients/` — not scanned by CC (CC scans `.claude/`, `brain/`, `roles/`, not `Clients/`).

### Limitations

- Very large client folders (50+ files) may need batching across multiple sub-agent waves
- Non-text content in PDFs (charts, images) won't be captured — provenance tag will note "visual content not extracted"
- Excel with complex formulas: captures values and headers, not formula logic
- The compiler is a snapshot, not live-updating. Re-run when new docs arrive.

---

## Capability 2: AutoResearch Engine (`/autoresearch`)

### Purpose

Autonomous iteration loop that scores a document or model against criteria, identifies weaknesses, makes atomic improvements, and tracks what works. Based on Karpathy's AutoResearch pattern and its adoption beyond ML (Shopify on code, AutoBeta on strategy docs, MindStudio on marketing).

### Invocation

```
/autoresearch path/to/document.md
/autoresearch path/to/document.md --criteria consulting
/autoresearch path/to/document.md --criteria path/to/custom-criteria.md
/autoresearch path/to/document.md --iterations 15
```

### Architecture

1. **Intake:** Reads the target document. Selects or receives scoring criteria.

2. **Criteria selection:** Three built-in criteria sets, plus custom:

   **`consulting`** (default for .md files in `Clients/`):
   | Dimension | Weight | What it measures |
   |---|---|---|
   | Specificity | 20% | Names the game, genre, platform, audience, metric. No generic advice. |
   | Evidence quality | 20% | Benchmarks cited, data referenced, comparisons made. |
   | Actionability | 20% | Client can execute on every recommendation without further research. |
   | Domain accuracy | 20% | Correct for the genre-platform intersection. No misapplied patterns. |
   | NBI voice | 10% | Studio-native language, no consultant-speak, no jargon without context. |
   | Completeness | 10% | No gaps, unanswered questions, or missing sections. |

   **`pricing`** (for economy/pricing models):
   | Dimension | Weight | What it measures |
   |---|---|---|
   | Completeness | 20% | All revenue streams modelled, all price points covered. |
   | Internal consistency | 20% | Numbers add up, no contradictions between sections. |
   | Benchmark grounding | 20% | Compared to genre medians, competitor pricing cited. |
   | Scenario coverage | 15% | Bull/base/bear cases. Sensitivity analysis present. |
   | Regulatory awareness | 10% | Loot box, age gating, regional pricing flags present. |
   | Presentation clarity | 15% | A studio exec can read and act on this without a walkthrough. |

   **`pitch`** (for investment/pitch materials):
   | Dimension | Weight | What it measures |
   |---|---|---|
   | Narrative clarity | 20% | Story holds from problem through solution to ask. |
   | TAM defensibility | 20% | Bottom-up, not top-down. Assumptions explicit. |
   | Financial model coherence | 20% | Revenue model, unit economics, runway calc all consistent. |
   | Team credibility | 15% | Track record evidenced, relevant experience highlighted. |
   | Ask clarity | 15% | Use of funds specific, milestone-linked, not vague. |
   | Competitive positioning | 10% | Differentiation articulated against named competitors. |

   **Custom:** Pass a markdown file with dimensions, weights, and descriptions.

3. **Core loop (per iteration):**
   ```
   score = judge(document, criteria)        # LLM scores each dimension 1-10
   weakest = min(score.dimensions)          # find lowest-scoring dimension
   plan = identify_improvement(weakest)     # what specific change would improve this?
   modified = apply_change(document, plan)  # make ONE atomic change
   new_score = judge(modified, criteria)    # re-score
   if new_score.total > score.total:
       document = modified                  # keep improvement
       log(kept, change, delta)
   else:
       log(reverted, change, delta)         # revert, try different dimension next
   ```

4. **Experiment log:** Written to `{target_dir}/autoresearch.jsonl` — one JSON line per iteration:
   ```json
   {"iteration": 1, "dimension": "specificity", "change": "Added genre-specific conversion benchmarks to section 3", "score_before": 6.2, "score_after": 7.1, "kept": true, "timestamp": "2026-05-12T14:30:00Z"}
   ```

5. **Termination:** Stops when:
   - Reached N iterations (default 10)
   - Three consecutive reverts (convergence)
   - All dimensions score >= 8/10

6. **Output:** Modified document written in place (original preserved in git), experiment log alongside it. Summary printed: dimensions improved, total score delta, iterations run.

### CC Scanner Compatibility

New skill directory: `.claude/skills/autoresearch/`

Files:
- `SKILL.md` — frontmatter with `name: autoresearch`, `description: ...`, `category: quality`
- `criteria/consulting.md`, `criteria/pricing.md`, `criteria/pitch.md` — built-in criteria sets
- `learnings.md` — empty initially

The CC's `scanSkills()` will index this. The skill also has a `references/` directory (the criteria files) which the scanner counts (`references_count`).

### Limitations

- The judge is an LLM scoring against criteria — it's heuristic, not measurement. Scores are directional.
- Each iteration costs one LLM call for scoring + one for modification. 10 iterations ≈ 20 calls.
- The loop cannot verify factual accuracy (whether a cited benchmark is real). It improves structure, specificity, and coherence.
- Works best on text documents. Not designed for spreadsheets or code.

---

## Capability 3: AI Operations Positioning

### Purpose

Formalise NBI's existing AI capabilities (Brain architecture, 33-role agent team, context engineering, session continuity, model tier routing, approval gates) into a sellable service description. Make the invisible visible.

### Deliverables

#### 3a. `brain/services_ai_operations.md` — New Brain Module

A new extended Brain module documenting NBI's AI operations capability as both an internal asset and a client service offering.

Sections:
- **What NBI Has Built** — Brain (long-term memory), 33-role agent team (system calls), skills system (tool integrations), session continuity (crash recovery), approval gates (permissions), model tier routing (resource allocation). Frame using Karpathy's LLM OS vocabulary.
- **Internal Impact** — how this architecture enables a 7-person firm to deliver at the depth of a larger team. Reference specific examples: Goals engagement (21 tasks, 3 outputs, 3-way alignment check), competitive research pipelines, automated document generation.
- **Client Service: AI Operations Setup** — setting up a context-engineered AI operations layer for a game studio. What it includes (Brain architecture, role definitions, knowledge bases, workflow automation, approval gates). What the client gets (persistent institutional knowledge, consistent quality, reduced dependency on key individuals).
- **Client Service: Continuous Intelligence** — subscription model where NBI's AI layer monitors, alerts, and optimises continuously. Human consultants step in for judgement calls. Alternative to project-based consulting.
- **Positioning Against Big Four** — Sia Partners (800 agents, 19 countries), McKinsey (20K agents), Cognizant (1K context engineers). NBI's advantage: gaming-native depth, not scale. Built by practitioners who shipped games, not management consultants who read about them.
- **Pricing Framework** — initial engagement (AI ops setup) + monthly retainer (continuous intelligence). Ranges TBD by Glen.

#### 3b. `templates/proposal_ai_operations.md` — Proposal Module

Reusable section Glen drops into client proposals when the engagement includes AI operations. Not a full proposal — a module.

Structure:
- Our Approach: AI-Native Consulting (2-3 paragraphs, studio-native voice)
- What We Build For You (bullet list of deliverables)
- How It Works (3-step summary)
- Why NBI (differentiation, not generic claims)

#### 3c. Update to `NBI_Brain.md`

Add a section under the business services area referencing the new `brain/services_ai_operations.md` module. One paragraph, pointing to the extended module for detail.

#### 3d. Update to `brain/playsage.md`

Add an "Architectural Guidance" section documenting how The Sage module should be built as Software 3.0 when PlaySage development resumes:
- Compiled market intelligence via LLM Wiki pattern (not traditional ETL)
- LLM analysis layer for recommendations (not just dashboards)
- AutoResearch-style scoring loops for recommendation quality
- Agent swarm data collection (not brittle scrapers)

### CC Scanner Compatibility

- `brain/services_ai_operations.md` will appear in the Brain & Memory card (scanBrain reads all .md from brain/)
- `NBI_Brain.md` update increases the section count tracked by scanBrain
- `templates/` is not scanned — no CC interaction
- No dashboard-server changes — no conflict with CC build

---

## Implementation Order

Sequential: each capability validates the next.

1. **Client Wiki Compiler** — build the skill, test on Clients/Goals/
2. **AutoResearch Engine** — build the skill, test on the Goals CLIENT_BRAIN.md output from step 1
3. **AI Operations Positioning** — write the content, referencing both working capabilities as evidence

---

## Files Created (complete list)

| File | Purpose | CC Impact |
|---|---|---|
| `.claude/skills/compile-client/SKILL.md` | Skill definition | Indexed by scanSkills() |
| `.claude/skills/compile-client/learnings.md` | Usage feedback log | Counted by scanSkills() |
| `.claude/skills/autoresearch/SKILL.md` | Skill definition | Indexed by scanSkills() |
| `.claude/skills/autoresearch/criteria/consulting.md` | Built-in criteria | Counted as reference |
| `.claude/skills/autoresearch/criteria/pricing.md` | Built-in criteria | Counted as reference |
| `.claude/skills/autoresearch/criteria/pitch.md` | Built-in criteria | Counted as reference |
| `.claude/skills/autoresearch/learnings.md` | Usage feedback log | Counted by scanSkills() |
| `brain/services_ai_operations.md` | AI ops service description | Indexed by scanBrain() |
| `templates/proposal_ai_operations.md` | Reusable proposal module | Not scanned |
| `Clients/Goals/CLIENT_BRAIN.md` | Test output (Goals wiki) | Not scanned |

## Files Modified

| File | Change | CC Impact |
|---|---|---|
| `NBI_Brain.md` | Add AI ops service reference | Section count increases |
| `brain/playsage.md` | Add architectural guidance section | Already indexed |

## Files NOT Touched

- `dashboard-server/*` — no server changes
- `nbi_project_dashboard.html` — no SPA changes
- `dashboard-server/routes/command-centre.js` — no CC changes
- No migrations, no DB changes
