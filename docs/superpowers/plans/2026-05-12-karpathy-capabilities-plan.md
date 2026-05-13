# Karpathy-Derived Capabilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two Claude Code skills (compile-client, autoresearch) and AI operations positioning content — enabling NBI to compile client knowledge bases automatically, iterate on document quality autonomously, and sell its AI capabilities as a service.

**Architecture:** Claude Code skills as markdown instruction files in `.claude/skills/`, with supporting criteria files. Business content as Brain modules and proposal templates. No server code, no database changes. All files are read by the Command Centre's scanners on next refresh.

**Tech Stack:** Claude Code skills (markdown), NBI Brain architecture (markdown modules), git for versioning.

---

## Phase 1: Client Wiki Compiler

### Task 1: Create compile-client skill directory and SKILL.md

**Files:**
- Create: `.claude/skills/compile-client/SKILL.md`

- [ ] **Step 1: Create skill directory**

```bash
mkdir -p ".claude/skills/compile-client"
```

- [ ] **Step 2: Write the SKILL.md file**

Write the following to `.claude/skills/compile-client/SKILL.md`:

```markdown
---
name: compile-client
description: "Compile a client folder into a structured CLIENT_BRAIN.md knowledge base. Use when starting work on a client with many source documents, onboarding a new client, or refreshing a client context after new docs arrive. Triggers: compile client, client brain, client wiki, build client context, client knowledge base, onboard client docs, compile folder."
category: knowledge
user-invocable: true
---

# Client Wiki Compiler

Compiles all documents in a client folder into a single structured CLIENT_BRAIN.md — a persistent, interlinked knowledge base that loads into context at session start instead of reading raw source files individually.

Based on Karpathy's LLM Wiki pattern: compile once, load the artefact, don't re-read raw sources every session. Every fact gets a provenance tag tracing it to its source file.

## Step 1: Intake

The user provides a folder path (relative to repo root). Validate:
1. The folder exists
2. It contains at least one readable file (.md, .pdf, .docx, .xlsx, .pptx, .txt)

If no path provided, ask:
> "Which client folder should I compile? (e.g., `Clients/Goals`, `Clients/Couch Heroes`)"

## Step 2: File Discovery

Glob the folder for all supported file types:
- `.md` — read directly via Read tool
- `.pdf` — read via Read tool (Claude handles PDFs natively)
- `.docx` — read via Read tool (Claude handles Word natively)
- `.xlsx` — read via Read tool (Claude handles Excel natively)
- `.pptx` — read via Read tool (Claude handles PowerPoint natively)
- `.txt` — read directly via Read tool

**Ignore:** `.py`, `.js`, `.json`, `.csv` (data files), images, binaries, any `CLIENT_BRAIN.md` (previous output).

List all discovered files and their types. Report the count:
> "Found {N} files to compile: {breakdown by type}. Starting extraction..."

## Step 3: Parallel Extraction

Spawn sub-agents in parallel batches (up to 4 concurrent) using the Agent tool. Each agent receives a batch of 3-5 files and this brief:

> "Read these files and extract ALL factual content. For EVERY fact, include a provenance tag in the format [source: filename.ext]. Extract:
> - Company/product facts (names, dates, numbers, features)
> - People (names, roles, contact details)
> - Commercial terms (pricing, budgets, timelines, deliverables)
> - Technical details (platforms, tech stack, integrations)
> - Strategic context (goals, risks, constraints, decisions)
> - Open questions or ambiguities you notice
>
> Report everything. Do not summarise or compress. Preserve specificity."

Wait for all extraction agents to complete. Collect their outputs.

## Step 4: Synthesis

Take all extracted content and compile it into the wiki structure below. Rules:
- Every fact MUST have a `[source: filename.ext]` provenance tag
- If multiple sources say the same thing, cite all of them
- If sources contradict, note the contradiction in an "Open Questions" entry
- Use the client's actual terminology (game names, internal terms)
- Do NOT add information that isn't in the source documents
- Sections with no relevant content should be omitted, not left empty

### Wiki Structure

```markdown
# {Client Name} — Client Brain
### Compiled: {YYYY-MM-DD} | Sources: {N} files | Compiler: /compile-client

---

## Company Profile
{Legal name, location, team size, funding status, key facts about the company}

## Product / Game
{Game name, genre, platforms, stage (concept/beta/live), core mechanics, key features}

## Key Contacts
| Name | Role | Contact | Notes |
|---|---|---|---|
{All people mentioned across documents}

## Engagement History & Commercial Terms
{NBI's relationship: what was scoped, what was delivered, budgets, timelines, milestones}

## Domain Context

### Pricing & Economy
{All pricing, monetisation, economy design information}

### Live Operations
{Event cadence, content strategy, seasonal plans, engagement mechanics}

### Production & Roadmap
{Development timeline, milestones, technical architecture, team structure}

### Market Position & Competitors
{Competitive landscape, market data, positioning, benchmarks}

## Open Questions
{Ambiguities, contradictions between sources, missing information flagged during extraction}

## Decision Log
{Any decisions explicitly documented in the sources, with dates and rationale}

## Source Index
| File | Type | Key Content |
|---|---|---|
{Every source file with a one-line description of what it contains}
```

## Step 5: Output

1. Write the compiled wiki to `{folder}/CLIENT_BRAIN.md`
2. Commit to git with message: `feat: compile {client} client brain from {N} sources`
3. Report to user:
   > "Client Brain compiled: `{path}/CLIENT_BRAIN.md`
   > - {N} source files processed
   > - {section count} sections populated
   > - {open questions count} open questions flagged
   >
   > Load this file at the start of future {client} sessions instead of reading individual documents."

## Re-run Behaviour

If `CLIENT_BRAIN.md` already exists in the target folder:
1. Read the existing wiki (it provides context on what was previously compiled)
2. Re-run the full extraction pipeline on ALL source files (not just new ones)
3. Write the new version, overwriting the old one
4. Git diff shows what changed; previous version preserved in git history
5. Report what changed in the summary

## Error Handling

- If a file can't be read (corrupted, password-protected), skip it and note in Source Index: "SKIPPED: {reason}"
- If the folder has 50+ files, batch extraction into waves of 4 agents × 5 files each. Process all waves.
- If context gets tight during synthesis, prioritise: Company Profile > Product > Contacts > Commercial Terms > Domain Context > everything else
```

- [ ] **Step 3: Verify file created**

Run: `ls ".claude/skills/compile-client/SKILL.md"`
Expected: File exists

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/compile-client/SKILL.md
git commit -m "feat: add /compile-client skill — LLM Wiki pattern for client knowledge bases"
```

---

### Task 2: Create learnings.md placeholder

**Files:**
- Create: `.claude/skills/compile-client/learnings.md`

- [ ] **Step 1: Write learnings.md**

Write the following to `.claude/skills/compile-client/learnings.md`:

```markdown
# compile-client — Learnings

Usage feedback and refinements are logged here after each invocation.

---
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/compile-client/learnings.md
git commit -m "feat: add learnings.md for compile-client skill (CC scanner compatible)"
```

---

### Task 3: Test the skill on Clients/Goals/

**Files:**
- Creates: `Clients/Goals/CLIENT_BRAIN.md` (test output)

- [ ] **Step 1: Invoke the skill**

Run: `/compile-client Clients/Goals`

This triggers the skill, which will:
1. Discover ~18 markdown files in `Clients/Goals/`
2. Spawn extraction agents in parallel
3. Synthesise into structured wiki
4. Write `Clients/Goals/CLIENT_BRAIN.md`

- [ ] **Step 2: Verify the output**

Read `Clients/Goals/CLIENT_BRAIN.md` and verify:
- All 18+ source files are listed in the Source Index
- Provenance tags `[source: ...]` are present throughout
- Company Profile section mentions Goals Studio / Goals AB / Stockholm
- Key Contacts includes Jonas Rundberg
- Pricing & Economy section has hard currency pricing details from `gg-monetization.md`
- Commercial Terms mentions $10K US engagement, 116 hours, 27 April deadline
- Open Questions section exists (even if empty)

- [ ] **Step 3: Commit the test output**

```bash
git add "Clients/Goals/CLIENT_BRAIN.md"
git commit -m "feat: compile Goals Studio client brain (18 sources, test of /compile-client)"
```

---

## Phase 2: AutoResearch Engine

### Task 4: Create autoresearch skill directory structure

**Files:**
- Create: `.claude/skills/autoresearch/SKILL.md`
- Create: `.claude/skills/autoresearch/criteria/consulting.md`
- Create: `.claude/skills/autoresearch/criteria/pricing.md`
- Create: `.claude/skills/autoresearch/criteria/pitch.md`
- Create: `.claude/skills/autoresearch/learnings.md`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p ".claude/skills/autoresearch/criteria"
```

- [ ] **Step 2: Write SKILL.md**

Write the following to `.claude/skills/autoresearch/SKILL.md`:

```markdown
---
name: autoresearch
description: "Autonomous iteration loop that scores documents against criteria and improves them. Use when improving consulting deliverables, pricing models, pitch decks, strategy documents, or any text document that should meet defined quality standards. Triggers: autoresearch, improve document, iterate on quality, score and improve, quality loop, document quality, optimise deliverable, auto-improve, research loop, score document."
category: quality
user-invocable: true
---

# AutoResearch Engine

Autonomous experiment loop that scores a document against criteria, identifies the weakest dimension, makes one atomic improvement, re-scores, and keeps or reverts. Repeats until convergence or iteration limit.

Based on Karpathy's AutoResearch pattern. Applied beyond ML: Shopify on code performance, AutoBeta on strategic documents, MindStudio on marketing copy.

## Step 1: Intake

Parse the invocation for:
- **Target:** path to the document to improve (required)
- **Criteria:** one of `consulting` | `pricing` | `pitch` | path to custom criteria file (default: `consulting`)
- **Iterations:** number of improvement cycles (default: 10, max: 20)

If no target provided, ask:
> "Which document should I run the AutoResearch loop on? Provide the file path."

## Step 2: Load Criteria

Load the criteria file from `.claude/skills/autoresearch/criteria/{name}.md` or from the custom path provided.

The criteria file defines scoring dimensions with weights and descriptions. The judge uses these to score the document 1-10 on each dimension.

## Step 3: Initial Score

Read the target document. Score it against all criteria dimensions using this judge prompt:

> "Score the following document on each dimension from 1 to 10. For each dimension, provide:
> - Score (integer 1-10)
> - One-sentence justification citing a specific passage or absence
>
> Be harsh. An 8 means genuinely good with minor issues. A 5 means significant gaps. A 3 means fundamentally inadequate on this dimension.
>
> Dimensions:
> {list from criteria file with weights and descriptions}
>
> Document:
> {full document text}"

Record the scores. Compute weighted total. Report:
> "Initial assessment — total score: {weighted}/10
> {table of dimension scores}
> Weakest dimension: {name} ({score}/10) — starting improvement loop."

## Step 4: Improvement Loop

For each iteration (1 to N):

### 4a. Identify target
Select the dimension with the lowest score. If there's a tie, pick the one with higher weight. If the lowest-scoring dimension had three consecutive failed improvements, skip to the next-lowest.

### 4b. Plan improvement
Generate a specific, atomic improvement plan:
> "The document scores {score}/10 on '{dimension}' because: {justification from last score}.
> Identify ONE specific change that would improve this score. The change must be:
> - Atomic (one paragraph added/modified/removed, or one structural change)
> - Traceable (you can point to exactly what changed)
> - Reversible (the original text is preserved for comparison)"

### 4c. Apply change
Make the single atomic change to the document. Keep the change minimal — one paragraph, one section restructure, one evidence addition. Never rewrite the entire document.

### 4d. Re-score
Score the modified document on the SAME dimension only (not all dimensions — that's wasteful). Use the same judge prompt but for the single dimension.

### 4e. Keep or revert
- If new score > old score: **KEEP**. Update the document. Log the experiment.
- If new score <= old score: **REVERT**. Restore the original text. Log the experiment as reverted.

### 4f. Log
Append one JSON line to `{target_directory}/autoresearch.jsonl`:
```json
{"iteration": N, "dimension": "name", "change": "description of what was changed", "score_before": X, "score_after": Y, "kept": true|false, "timestamp": "ISO8601"}
```

### 4g. Check termination
Stop the loop if ANY of:
- Reached iteration limit (N)
- Three consecutive reverts (convergence — can't improve further)
- All dimensions score >= 8/10 (quality threshold met)

## Step 5: Final Score

After the loop completes, re-score ALL dimensions on the final document. Report:

> "AutoResearch complete — {iterations_run} iterations, {kept_count} improvements kept, {reverted_count} reverted.
>
> | Dimension | Before | After | Delta |
> |---|---|---|---|
> {table}
>
> **Total: {before}/10 → {after}/10 (+{delta})**
>
> Experiment log: `{path}/autoresearch.jsonl`
> Modified document: `{path}` (original preserved in git)"

## Step 6: Output

1. Write the improved document in place (overwriting the original — git preserves history)
2. The experiment log (`autoresearch.jsonl`) is already written incrementally during the loop
3. Commit both files:
   ```
   git add {document} {document_dir}/autoresearch.jsonl
   git commit -m "autoresearch: {document_name} — {before_score}→{after_score} ({iterations} iterations)"
   ```

## Error Handling

- If the document is too large to score in a single pass (>500 lines), score section-by-section and aggregate
- If a dimension is un-improvable (e.g., "evidence quality" when no external data is available), note it and move on after 3 failed attempts
- If the target file doesn't exist, error immediately
- If the criteria file doesn't exist and isn't a built-in name, error immediately
```

- [ ] **Step 3: Write consulting criteria**

Write the following to `.claude/skills/autoresearch/criteria/consulting.md`:

```markdown
# Consulting Deliverable Quality Criteria

Scoring dimensions for NBI consulting deliverables (strategy decks, market analyses, engagement plans, client advisory documents).

## Dimensions

### Specificity (weight: 20%)
Names the game, genre, platform, audience, and specific metrics. No generic advice that could apply to any studio. Every recommendation references the client's specific situation, not industry platitudes.

**Score guide:**
- 9-10: Every recommendation names the specific game, cites genre-specific benchmarks, and references the client's actual metrics or situation
- 7-8: Most recommendations are specific but occasional generic framing ("consider improving retention")
- 5-6: Mix of specific and generic. Some recommendations could appear in any consulting document unchanged
- 3-4: Mostly generic with occasional client-specific references
- 1-2: Could be copied into any other client engagement without modification

### Evidence Quality (weight: 20%)
Benchmarks cited with sources. Data referenced with specificity. Comparisons made to named competitors or genre medians. No unsupported claims or "best practice suggests" without backing.

**Score guide:**
- 9-10: Every claim backed by named source, benchmark, or data point. Competitor comparisons with specific metrics
- 7-8: Most claims supported. Occasional assertion without evidence but in areas where expertise is implicit
- 5-6: Some claims supported, others assert without evidence. "Industry standard" cited without specifics
- 3-4: Mostly opinion presented as fact. Few concrete benchmarks or references
- 1-2: Pure assertion. No evidence, no benchmarks, no comparisons

### Actionability (weight: 20%)
Client can execute on every recommendation without further research or clarification. Each recommendation includes what to do, how to do it, and what success looks like. No "consider doing X" without the how.

**Score guide:**
- 9-10: Client team could take this document and execute Monday morning. Steps clear, success criteria defined, owner implied or named
- 7-8: Most recommendations actionable. Occasional strategic framing that needs operational breakdown
- 5-6: Mix of actionable and aspirational. Some recommendations need significant interpretation
- 3-4: Mostly directional guidance. Client would need follow-up sessions to operationalise
- 1-2: Pure strategy with no operational path. Reads like a board presentation, not a working document

### Domain Accuracy (weight: 20%)
Correct for the genre-platform intersection. No misapplied patterns (e.g., mobile F2P tactics applied to a premium PC game). Demonstrates genuine understanding of the specific market segment.

**Score guide:**
- 9-10: Every recommendation accounts for genre conventions, platform constraints, and audience expectations specific to this game's segment
- 7-8: Mostly accurate. Occasional recommendation that's technically correct but not well-calibrated to the specific genre-platform
- 5-6: Some recommendations show shallow genre understanding. Applies broadly-correct patterns without adaptation
- 3-4: Multiple recommendations that don't fit the genre-platform. Mobile patterns applied to PC, AAA patterns applied to indie
- 1-2: Fundamentally wrong genre assumptions. Would damage the game if implemented

### NBI Voice (weight: 10%)
Studio-native language, not consultant-speak. Says "your gem economy has an inflation problem" not "we have identified sub-optimal currency equilibrium dynamics." British English. No em dashes. Direct. No filler.

**Score guide:**
- 9-10: Reads like a message from someone who has shipped games in this genre. Natural, direct, specific
- 7-8: Mostly natural but occasional formal phrasing or consultant idiom creeps in
- 5-6: Alternates between natural and corporate. Some sections read like a McKinsey deck
- 3-4: Mostly consultant-speak with occasional natural phrasing
- 1-2: Full corporate consulting language. "Leverage synergies," "best-in-class," "strategic value proposition"

### Completeness (weight: 10%)
No gaps, unanswered questions, or missing sections that the scope implies should be present. Delivers what was promised in the engagement brief.

**Score guide:**
- 9-10: Every topic in scope is covered to appropriate depth. No loose ends. Reader has no "but what about...?" questions
- 7-8: All major topics covered. Minor gaps in depth on secondary topics
- 5-6: Major topics covered but some obvious follow-up questions left unanswered
- 3-4: Significant gaps. Multiple areas where the reader needs more before acting
- 1-2: Partial delivery. Major scope items missing entirely
```

- [ ] **Step 4: Write pricing criteria**

Write the following to `.claude/skills/autoresearch/criteria/pricing.md`:

```markdown
# Pricing & Economy Model Quality Criteria

Scoring dimensions for game economy analyses, pricing recommendations, monetisation strategies, and IAP/store pricing documents.

## Dimensions

### Completeness (weight: 20%)
All revenue streams modelled. All price points covered. All platforms addressed. All currencies and regional considerations included. Nothing material left out.

**Score guide:**
- 9-10: Every revenue stream, every platform, every region. Full picture with nothing a finance lead would ask about missing
- 7-8: Major streams covered. Minor gaps (e.g., one platform's regional pricing not detailed)
- 5-6: Core pricing covered but secondary streams or regions omitted
- 3-4: Only the primary revenue stream addressed. Significant gaps
- 1-2: Fragment. Single price point or stream without context

### Internal Consistency (weight: 20%)
Numbers add up. No contradictions between sections. Revenue projections match unit economics. Conversion assumptions consistent throughout.

**Score guide:**
- 9-10: Every number cross-references correctly. Assumptions stated once and applied consistently
- 7-8: Numbers consistent with occasional rounding differences. No logical contradictions
- 5-6: Some inconsistencies between sections (e.g., conversion rate assumed differently in two places)
- 3-4: Multiple contradictions. Numbers in one section don't match those in another
- 1-2: Internally contradictory. Different assumptions in different sections without acknowledgement

### Benchmark Grounding (weight: 20%)
Compared to genre medians. Competitor pricing cited with specifics. Industry benchmarks for conversion, ARPU, ARPPU referenced. Not making recommendations in a vacuum.

**Score guide:**
- 9-10: Every price point justified against named competitors and genre benchmarks. Percentile positioning explicit
- 7-8: Most prices benchmarked. Occasional recommendation without external reference
- 5-6: Some benchmarks cited but gaps. "Industry standard" without specifics
- 3-4: Few external references. Mostly internal logic without market validation
- 1-2: No benchmarks. Pricing in a vacuum

### Scenario Coverage (weight: 15%)
Bull/base/bear cases modelled. Sensitivity analysis present. Key assumptions identified with "what if" variations. Not just one projection presented as certain.

**Score guide:**
- 9-10: Full scenario matrix. Key variables identified and varied. Breakeven sensitivity clear
- 7-8: Bull/base/bear present. Most key assumptions varied
- 5-6: Single scenario with acknowledgement of uncertainty but limited modelling
- 3-4: One scenario presented as if certain. Minimal sensitivity discussion
- 1-2: Single point estimate with no scenario analysis

### Regulatory Awareness (weight: 10%)
Loot box compliance considered. Age gating implications noted. Regional pricing regulations (EU digital fairness, platform rules) addressed. Not recommending practices that invite regulatory action.

**Score guide:**
- 9-10: Every monetisation mechanic checked against current regulatory landscape. Platform-specific rules cited
- 7-8: Major regulatory considerations addressed. Minor gaps on emerging regulations
- 5-6: Aware of loot box debate but limited specific guidance
- 3-4: Regulatory implications not addressed for most recommendations
- 1-2: Recommendations that would likely violate platform policies or attract regulatory scrutiny

### Presentation Clarity (weight: 15%)
A studio exec can read and act on this without a walkthrough. Tables used where appropriate. Key recommendations highlighted. Executive summary present. No wall-of-text analysis without clear takeaways.

**Score guide:**
- 9-10: C-level could read this in 15 minutes and know exactly what to implement. Clear hierarchy, visual aids, highlighted actions
- 7-8: Mostly clear. Occasional dense section that needs a second read
- 5-6: Requires dedicated focus. Analysis and recommendations interleaved without clear separation
- 3-4: Difficult to extract action items. Academic tone without executive framing
- 1-2: Impenetrable. Would need a presentation to explain the document
```

- [ ] **Step 5: Write pitch criteria**

Write the following to `.claude/skills/autoresearch/criteria/pitch.md`:

```markdown
# Pitch & Investment Materials Quality Criteria

Scoring dimensions for pitch decks, investor presentations, financial plans, due diligence documents, and fundraising materials.

## Dimensions

### Narrative Clarity (weight: 20%)
Story holds from problem through solution to ask. The reader understands why this exists, why now, and why this team. No logical gaps in the narrative arc.

**Score guide:**
- 9-10: Compelling narrative that builds inevitability. Reader thinks "of course" at each transition. Problem → insight → solution → traction → ask flows naturally
- 7-8: Clear narrative with strong sections. Occasional transition that needs tightening
- 5-6: Logic present but narrative doesn't build momentum. More list than story
- 3-4: Disjointed sections. Reader has to construct the narrative themselves
- 1-2: No narrative thread. Collection of facts without connecting logic

### TAM Defensibility (weight: 20%)
Bottom-up, not top-down. Assumptions explicit and testable. Market sizing grounded in observable data (customer counts, transaction volumes, price points) not "if we get 1% of a $200B market."

**Score guide:**
- 9-10: Bottom-up from identifiable customer segments × realistic penetration × proven price points. Every assumption citable
- 7-8: Mostly bottom-up with clear methodology. Occasional top-down reference for context
- 5-6: Mix of approaches. Some bottom-up rigour, some hand-waving on larger numbers
- 3-4: Top-down with percentage assumptions. "Gaming is $188B, analytics is 1.5%, we capture 2%"
- 1-2: Pure top-down fantasy. Large number × small percentage = our revenue

### Financial Model Coherence (weight: 20%)
Revenue model, unit economics, and runway calculation all consistent. Assumptions stated and cross-referenced. Growth rate justified by specific drivers (not "we'll grow 3x because SaaS companies do"). Burn rate matches team plan.

**Score guide:**
- 9-10: Every line traceable to an assumption. Model can be stress-tested by varying inputs. Runway matches raise + burn + milestones
- 7-8: Mostly coherent. Minor gaps between model and narrative (e.g., hiring plan implies different burn)
- 5-6: Core model present but not fully integrated. Some assumptions buried or inconsistent
- 3-4: Significant gaps between stated strategy and financial projections
- 1-2: Numbers feel invented. No clear link between strategy and financials

### Team Credibility (weight: 15%)
Track record evidenced with specifics (not "20 years experience" but "built X that achieved Y"). Relevant experience highlighted for this specific problem. Gaps acknowledged with mitigation plan.

**Score guide:**
- 9-10: Every team member's relevance is obvious. Specific achievements named. Reader thinks "these are the right people for this exact problem"
- 7-8: Strong credentials cited. Mostly relevant to the problem. Minor gaps unaddressed
- 5-6: Generic credentials without specificity. "Worked at big company" without what they did there
- 3-4: Team section feels like LinkedIn bios pasted in. Relevance to problem unclear
- 1-2: No credible team section. Reader has no reason to believe this team can execute

### Ask Clarity (weight: 15%)
Use of funds specific and milestone-linked. Raise amount justified by what it buys (runway, hires, milestones). Terms reasonable for stage. Not vague "fuel growth" language.

**Score guide:**
- 9-10: "We're raising $Xm to achieve Y milestones over Z months. Specifically: $A on engineering (N hires), $B on GTM, $C on operations. This gets us to {metric} which positions us for {next raise/profitability}"
- 7-8: Clear allocation with most categories justified. Some "other" bucket without detail
- 5-6: High-level allocation (40% eng, 30% GTM, 30% ops) without milestone linkage
- 3-4: "Raising $X to accelerate growth" without meaningful breakdown
- 1-2: No clear use of funds. Amount feels arbitrary

### Competitive Positioning (weight: 10%)
Differentiation articulated against named competitors. Not "we're better because AI" but specific structural or capability advantages. Honest about overlap. Defensibility clear.

**Score guide:**
- 9-10: Named competitors with specific feature/approach comparison. Clear articulation of why customers choose this over alternatives. Moat logic is structural, not just "better execution"
- 7-8: Named competitors addressed. Differentiation mostly clear. Some hand-waving on specific advantages
- 5-6: Competitors acknowledged but differentiation vague. "We focus on X while they focus on Y" without depth
- 3-4: "No direct competitors" claim or superficial comparison
- 1-2: No competitive analysis. Implies operating in a vacuum
```

- [ ] **Step 6: Write learnings.md**

Write the following to `.claude/skills/autoresearch/learnings.md`:

```markdown
# autoresearch — Learnings

Usage feedback and refinements are logged here after each invocation.

---
```

- [ ] **Step 7: Commit all autoresearch files**

```bash
git add .claude/skills/autoresearch/
git commit -m "feat: add /autoresearch skill — autonomous document quality iteration engine"
```

---

### Task 5: Test autoresearch on Goals CLIENT_BRAIN.md

**Files:**
- Modifies: `Clients/Goals/CLIENT_BRAIN.md` (improves it)
- Creates: `Clients/Goals/autoresearch.jsonl` (experiment log)

- [ ] **Step 1: Invoke the skill**

Run: `/autoresearch Clients/Goals/CLIENT_BRAIN.md --criteria consulting --iterations 5`

This triggers a 5-iteration improvement loop on the compiled wiki using consulting criteria.

- [ ] **Step 2: Verify the experiment log**

Read `Clients/Goals/autoresearch.jsonl` and verify:
- Contains 5 entries (one per iteration)
- Each entry has: iteration, dimension, change, score_before, score_after, kept, timestamp
- At least some entries have `kept: true` (improvements were made)

- [ ] **Step 3: Verify the improved document**

Read `Clients/Goals/CLIENT_BRAIN.md` and compare to git's previous version:
- `git diff HEAD~1 Clients/Goals/CLIENT_BRAIN.md`
- Changes should be atomic improvements (specific benchmarks added, generic phrasing replaced with specifics, etc.)
- Document structure should be preserved

- [ ] **Step 4: Commit**

```bash
git add "Clients/Goals/CLIENT_BRAIN.md" "Clients/Goals/autoresearch.jsonl"
git commit -m "autoresearch: Goals CLIENT_BRAIN — consulting criteria (5 iterations)"
```

---

## Phase 3: AI Operations Positioning

### Task 6: Write brain/services_ai_operations.md

**Files:**
- Create: `brain/services_ai_operations.md`

- [ ] **Step 1: Write the Brain module**

Write `brain/services_ai_operations.md` with these exact sections and content guidance:

```markdown
# AI Operations — Service Capability

Last Updated: 2026-05-12

---

## What NBI Has Built

{Describe the internal AI infrastructure using Karpathy's LLM OS vocabulary:
- NBI Brain (long-term memory): NBI_Brain.md + 11 extended modules in brain/. Persistent business context loaded every session. Never lose continuity.
- 33-Role Agent Team (system calls): Role definitions in roles/ acting as depth-skill assets. Game Economy Consultant, Live Ops Consultant, Production Consultant, Gaming Practice Lead — each with persona, responsibilities, decision authority, domain knowledge.
- Skills System (tool integrations): Custom Claude Code skills in .claude/skills/. /gi for investment analysis, /compile-client for knowledge compilation, /autoresearch for quality iteration, /games for game development routing.
- Session Continuity (crash recovery): Append-only session logging, live state files, structured handoffs. Context never lost even across session boundaries.
- Approval Gates (permissions): Auto-approve for internal work, Glen-approval for client-facing output. Quality control built into the workflow.
- Model Tier Routing (resource allocation): Opus for strategic decisions and quality gates, Sonnet for implementation, Haiku for routine extraction. Cost and quality optimised per task.

Frame this as: NBI has built an LLM Operating System where Claude is the kernel, the Brain is persistent storage, skills are system calls, and the agent team provides domain-specific processing units.}

---

## Internal Impact

{Specific examples of what this architecture enables:
- Goals Studio engagement: 21 tasks, 116 hours of work, 3 output formats (Excel, Word, WorkSage), 3-way alignment verified automatically. Single consultant (Glen) with AI backing delivers what would require a project team.
- Competitive research pipelines: Structured multi-agent research with red-team validation. Automated findings synthesis from multiple sources.
- Automated document generation: Python scripts generating formatted Excel and Word deliverables from structured plans. Cross-checked against source plans.
- Bug triage pipeline: 7-step mandatory workflow enforced via CLAUDE.md. Every bug goes through receive → review → plan → prioritise → fix → test → update. Consistency regardless of who works on it.
- Daily briefing system: Command Centre aggregates 8 data sources into operational intelligence. Calendar, tasks, bugs, knowledge health, session state — all surfaced in one view.

The headline: a 7-person firm delivering at the depth and consistency of a team three times the size. Not through overwork, but through architectural leverage.}

---

## Client Service: AI Operations Setup

{What NBI offers to game studios wanting the same capability:

**What we build:**
- Studio Brain: persistent institutional knowledge — game design philosophy, technical decisions, team preferences, market positioning. Survives employee turnover.
- Role-specific knowledge bases: what a lead economy designer knows, what the live ops team assumes, what production has decided. Captured, structured, queryable.
- Workflow automation: repetitive processes (sprint reporting, competitive monitoring, metrics reviews) handled by AI with human checkpoints at decision points.
- Approval gates: who decides what, when does AI proceed autonomously, when does it stop and ask. Calibrated to the studio's risk tolerance.
- Quality loops: AutoResearch-style iteration on documents before they reach stakeholders. Consulting deliverables, design docs, pricing models — all scored and improved before human review.

**What the client gets:**
- Institutional knowledge that persists beyond any individual
- Consistent quality on routine deliverables regardless of who's in the room
- Reduced dependency on key individuals for day-to-day decisions
- A system that gets better over time (knowledge compounds, quality loops improve)
- Faster onboarding for new team members (context is compiled, not tribal)}

---

## Client Service: Continuous Intelligence

{Subscription model — alternative to project-based consulting:

**How it works:**
- NBI's AI layer runs continuously: monitoring market data, scanning competitor moves, tracking internal metrics against benchmarks, flagging anomalies
- Automated weekly intelligence briefs surface what changed, what matters, and what to do about it
- Human consultants (Glen, specialist team) step in for judgement calls: strategic pivots, client-facing recommendations, cross-domain synthesis that requires experience
- Monthly strategic reviews combine automated intelligence with human insight

**Value proposition:** always-on advisory at a fraction of the cost of a full-time hire. The AI handles volume and consistency; NBI's humans handle judgement and relationships.

**Compared to project-based:** projects end, knowledge leaves. Continuous intelligence compounds — every month the system knows more about your game, your market, and your team.}

---

## Positioning Against Big Four AI Consulting

{The competitive landscape and NBI's structural advantage:

**What the large firms are doing:**
- Sia Partners: 800+ AI agents across 19 countries. Generalist — finance, energy, public sector, healthcare, retail.
- McKinsey: 20,000 AI agents working alongside 40,000 humans. Scale, not depth.
- Cognizant: 1,000 "context engineers" via ContextFabric platform. Enterprise infrastructure focus.
- Google Cloud: $750M committed to accelerate partners' agentic AI. Platform play.

**NBI's advantage is depth, not scale:**
- Gaming-native: built by people who shipped games at Blizzard, Xbox, EA, Mojang. Not management consultants who read a GDC talk.
- Practitioner architecture: the agent team's knowledge bases contain actual game economy models, live ops playbooks, and production frameworks — not generic "best practices."
- Context engineering by example: NBI's own Brain is the proof of concept. Not a pitch deck — a working system that runs the business.
- Custom per studio: every setup is tailored to the studio's genre, platform, stage, and team. Not a template deployed at scale.

**Where the big firms struggle:**
- Cultural resistance: partner-led model doesn't map to agent-directed workflows
- Generic knowledge: their AI knows "consulting" not "F2P mobile monetisation in MENA markets"
- Scale over depth: 20,000 agents doing shallow work vs. focused agents doing deep work on one domain}

---

## Pricing Framework

{Placeholder — ranges TBD by Glen:

- **AI Operations Setup** (one-time engagement): initial audit, Brain architecture, role definitions, workflow automation, quality loops. Scoped per studio complexity.
- **Continuous Intelligence** (monthly retainer): ongoing monitoring, weekly briefs, human consultant availability, quarterly strategic reviews.
- **Likely positioning:** between NBI's "Medium" (GBP 150K) and "Large" (GBP 300-400K/year) engagement sizes. The setup is a project; the continuous intelligence is a retainer.}

---

## When to Propose This

- Client asks about AI integration in their studio operations
- Engagement is ending and the client wants to retain capability
- New client has expressed frustration with knowledge loss (key people leaving, tribal knowledge)
- Studio is scaling rapidly and needs consistency across a growing team
- Client is building a live service and needs always-on market intelligence
- Fractional C-level engagement where NBI wants to leave lasting capability rather than dependency
```

- [ ] **Step 2: Commit**

```bash
git add brain/services_ai_operations.md
git commit -m "feat: add AI operations service module to Brain"
```

---

### Task 7: Write templates/proposal_ai_operations.md

**Files:**
- Create: `templates/proposal_ai_operations.md`

- [ ] **Step 1: Write the proposal module**

Write `templates/proposal_ai_operations.md`:

```markdown
# AI Operations — Proposal Module

Drop this section into client proposals where the engagement includes AI operations setup or continuous intelligence. Adapt the specifics to the client's situation.

---

## Our Approach: AI-Native Consulting

NBI operates differently from traditional advisory firms. We've built an AI operations layer — persistent institutional knowledge, domain-specific intelligence, automated quality loops — that gives our team the analytical depth of a firm three times our size. When we embed with your studio, we don't just advise — we build the same capability for you.

This means your team retains what we build together. Frameworks, knowledge bases, quality standards, and automated workflows persist beyond any individual engagement. Knowledge compounds instead of walking out the door.

We've refined this approach across live-service studios, from fractional C-level engagements to embedded analytics teams. The system works because it's built by people who ship games — not consultants who've read about them.

## What We Build For You

- **Studio Brain** — your institutional knowledge, structured and persistent. Game design philosophy, technical decisions, market positioning, team preferences. Survives turnover.
- **Domain knowledge bases** — what your economy designer knows, what your live ops team assumes, what production has decided. Captured, structured, searchable.
- **Automated workflows** — repetitive processes (competitive monitoring, metrics reviews, sprint reporting) handled systematically with human checkpoints at decision points.
- **Quality loops** — documents, models, and analyses scored against criteria and improved before they reach stakeholders.
- **Continuous intelligence** (optional retainer) — always-on market monitoring, weekly briefings, anomaly detection. Human consultants for judgement calls.

## How It Works

1. **Audit** — we map your current knowledge landscape: what's documented, what's tribal, what's at risk of walking out the door. We identify the workflows where AI leverage has the highest payoff.

2. **Build** — we architect and populate the system: Brain structure, knowledge bases, workflow definitions, quality criteria. Tailored to your genre, platform, stage, and team.

3. **Transfer** — we train your team to use and maintain the system. The architecture is yours. NBI remains available for strategic oversight and continuous intelligence if desired.

## Why NBI

- **Gaming-native:** built by a team with combined experience across Blizzard, Xbox, EA, Mojang, Jagex, and Build A Rocket Boy. We speak your language because we've shipped your kind of game.
- **Proven architecture:** we run our own business on this system. It's not a slide deck — it's operational infrastructure we use daily.
- **Depth over scale:** focused expertise on the gaming industry, not a generic AI solution applied to every sector. Your economy designer talks to someone who's built economy models, not a generalist data scientist.
- **Capability, not dependency:** we build something that works after we leave. The goal is lasting capability, not a retainer trap.
```

- [ ] **Step 2: Commit**

```bash
git add templates/proposal_ai_operations.md
git commit -m "feat: add AI operations proposal module template"
```

---

### Task 8: Update NBI_Brain.md

**Files:**
- Modify: `NBI_Brain.md` (Section 8 and Section 9)

- [ ] **Step 1: Add AI Operations reference to Section 8**

In `NBI_Brain.md`, after the "News Aggregator" paragraph in Section 8, add:

```markdown

### AI Operations Capability

NBI has built a context-engineered AI operations layer that enables a 7-person firm to deliver at the depth of a much larger team. This includes: persistent business context (the Brain), 33-role agent team as depth-skill assets, custom Claude Code skills for domain-specific workflows, session continuity systems, model tier routing, and approval gates. This architecture is now being offered as a service to game studios. See `brain/services_ai_operations.md` for full detail on the capability and client service offering.
```

- [ ] **Step 2: Add module to Section 9 Extended Module Index**

In the table in Section 9, add a new row:

```markdown
| AI Operations | `brain/services_ai_operations.md` | Working on AI service offerings, client proposals involving AI ops, or PlaySage Sage module architecture |
```

- [ ] **Step 3: Commit**

```bash
git add NBI_Brain.md
git commit -m "feat: add AI operations capability to Brain (section 8 + module index)"
```

---

### Task 9: Update brain/playsage.md

**Files:**
- Modify: `brain/playsage.md`

- [ ] **Step 1: Add architectural guidance section**

At the end of `brain/playsage.md` (before any closing markers), add:

```markdown

---

## Architectural Guidance — The Sage as Software 3.0

When PlaySage development resumes, The Sage module (the moat) should be built using patterns from Karpathy's Software 3.0 framework rather than traditional BI architecture. The differentiator is not dashboards (Sensor Tower has those) — it's the intelligence layer.

### Compiled Market Intelligence (LLM Wiki Pattern)

Instead of traditional ETL pipelines that break when data sources change format, compile market intelligence into structured, interlinked Markdown knowledge bases. An LLM "compiles" raw data (app store pages, financial filings, review corpora, news articles) into a persistent, versioned wiki. The compiled artefact loads into context directly — no embedding, no vector search, no retrieval pipeline.

Advantages: knowledge compounds over time, provenance is tracked, git provides full history, and the system works at PlaySage's scale (hundreds of titles, not millions of documents).

### LLM Analysis Layer (Not Just Dashboards)

The Sage's recommendations should be generated by an LLM reasoning over compiled market intelligence — not by rules engines producing canned suggestions. The charts and dashboards are table stakes (every competitor has them). The moat is: "your MAU is dropping AND sentiment shifted negative AND your competitor launched a similar feature AND your event cadence has a gap — here's what to do about it."

Build as: compiled context + LLM analysis + evidence attribution. Not: data warehouse + SQL queries + template recommendations.

### AutoResearch-Style Quality Loops

Every recommendation The Sage surfaces should pass through an AutoResearch scoring loop before reaching the user. Criteria: specificity (names the game, not generic), evidence quality (cites the data), actionability (user can execute immediately), accuracy (correct for genre-platform). Recommendations that score below threshold get improved or flagged.

### Agent Swarm Data Collection

Instead of brittle scrapers that break on layout changes, use agent swarms for data collection. Each agent is responsible for a data domain (Steam reviews, App Store rankings, financial filings, industry news). Agents are instructed in natural language, adapt to format changes, and surface anomalies. More resilient than traditional scraping, more flexible than API-only approaches.

### Why This Matters

Competitors (Sensor Tower, AppMagic) are building traditional BI: data pipelines → databases → dashboards → manual analysis. PlaySage building as Software 3.0 means the product gets better with each LLM generation, adapts to new data sources without engineering work, and delivers insight rather than data. This is the architectural decision that determines whether PlaySage is a better Sensor Tower or a fundamentally different product.
```

- [ ] **Step 2: Commit**

```bash
git add brain/playsage.md
git commit -m "feat: add Software 3.0 architectural guidance for PlaySage Sage module"
```

---

## Verification

### Task 10: Final verification pass

- [ ] **Step 1: Verify all files exist**

```bash
ls ".claude/skills/compile-client/SKILL.md"
ls ".claude/skills/compile-client/learnings.md"
ls ".claude/skills/autoresearch/SKILL.md"
ls ".claude/skills/autoresearch/criteria/consulting.md"
ls ".claude/skills/autoresearch/criteria/pricing.md"
ls ".claude/skills/autoresearch/criteria/pitch.md"
ls ".claude/skills/autoresearch/learnings.md"
ls "brain/services_ai_operations.md"
ls "templates/proposal_ai_operations.md"
ls "Clients/Goals/CLIENT_BRAIN.md"
```

All should exist.

- [ ] **Step 2: Verify CC scanner compatibility**

The Command Centre's `scanSkills()` reads `.claude/skills/*/SKILL.md` and parses frontmatter for `name`, `description`, `category`. Verify both skills have these fields:

```bash
head -5 ".claude/skills/compile-client/SKILL.md"
head -5 ".claude/skills/autoresearch/SKILL.md"
```

Expected: YAML frontmatter with `name:`, `description:`, `category:` fields.

- [ ] **Step 3: Verify Brain scanner compatibility**

The Command Centre's `scanBrain()` reads all `.md` files from `brain/`. Verify the new module exists:

```bash
ls brain/services_ai_operations.md
```

- [ ] **Step 4: Verify NBI_Brain.md changes**

Read `NBI_Brain.md` and confirm:
- Section 8 mentions "AI Operations Capability"
- Section 9 Extended Module Index includes `brain/services_ai_operations.md`

- [ ] **Step 5: Verify brain/playsage.md changes**

Read `brain/playsage.md` and confirm:
- "Architectural Guidance — The Sage as Software 3.0" section exists at the end
- Mentions: LLM Wiki Pattern, LLM Analysis Layer, AutoResearch Quality Loops, Agent Swarm Data Collection

- [ ] **Step 6: Run git log to confirm all commits**

```bash
git log --oneline -10
```

Expected: 7-9 commits covering all tasks above.
