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
