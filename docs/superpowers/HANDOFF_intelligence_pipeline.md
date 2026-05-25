# Handoff: Intelligence Pipeline Implementation

**Date:** 2026-05-25
**Branch:** `feature/command-centre`
**Status:** Spec approved, plan written, ready for Phase 1 execution

---

## What This Is

NBI's Intelligence Pipeline — a five-layer system that proactively gathers, structures, and surfaces knowledge from Glen's personal sources (Granola meetings, Gmail, Slack, OneDrive, Downloads, ChatGPT exports, Claude sessions) and web research into compiled knowledge banks that auto-load during sessions.

## Key Files

| File | Purpose |
|------|---------|
| `docs/superpowers/specs/2026-05-25-intelligence-pipeline-design.md` | Full design spec (750 lines). THE authoritative reference. |
| `docs/superpowers/plans/2026-05-25-intelligence-pipeline-plan.md` | Implementation plan — 22 tasks across 5 phases. |
| This file | Handoff context for the executing session. |

## What to Do Next

**Execute Phase 1 (Tasks 1-9) from the plan.** This is infrastructure bootstrap + first harvest.

Use the `executing-plans` skill. The plan is at `docs/superpowers/plans/2026-05-25-intelligence-pipeline-plan.md`.

### Phase 1 Summary (9 tasks):

1. Create directory structure (`intelligence/` tree)
2. Write 5 agent prompts (ingestion, compilation, research, brief, topic detection)
3. Write 4 config files (bank registry, source config, pipeline rules, suppression rules)
4. Write 7 bank schemas
5. Initialise pipeline state + research log
6. Build `/ingest-chats` skill
7. Build `/compile-bank` skill
8. Build `/intel-brief` skill
9. **First harvest:** Run `/ingest-chats` on Claude session handoffs, compile banks, generate first brief

### Execution Approach

- **Inline execution** (not subagent-driven) — coherence across files matters more than speed
- The spec contains the EXACT content for prompts, configs, and schemas. Copy from spec, don't reinvent.
- Tasks 1-8 are file creation. Task 9 is the first live run.
- Commit after each task (git commit formats specified in plan).
- After Task 9: Glen will review first extracts for calibration.

## Architecture Quick Reference

```
LAYER 5: RESEARCH (scheduled agents find new material)
    ↓
LAYER 1: INGESTION (source connectors → raw extracts with metadata)
    ↓
LAYER 2: COMPILATION (quality-gated synthesis into banks, max 500 lines each)
    ↓
LAYER 3: SYNTHESIS (lean briefs + summaries, loaded at session start)
    ↓
LAYER 4: SURFACING (CLAUDE.md routing rules push relevant banks into conversation)
```

## Key Design Decisions

- **Banks are dynamic** — not predefined. System detects topic clusters and suggests new banks.
- **Quality gate:** relevance >= 6, novelty >= 5, actionability >= 5. All three must pass.
- **Context budget:** ~200 lines at session start (brief + summaries). Full banks load on topic match.
- **500-line max per bank.** Split if exceeded.
- **Sensitivity is 5-level:** public, internal, client_scoped, anonymisable, restricted.
- **Compilation = synthesis, not appending.** Banks read as coherent documents, not clippings files.
- **Suppression rules** prevent annoying interruptions: max 2 proactive surfaces/session, no surfaces during debugging, etc.

## What Already Exists (don't recreate)

- `/compile-client` skill (`.claude/skills/compile-client/SKILL.md`) — per-client wiki compiler. Stays as-is.
- `/autoresearch` skill (`.claude/skills/autoresearch/SKILL.md`) — document quality iteration. Used for bank improvement.
- 3 autoresearch criteria sets (`.claude/skills/autoresearch/criteria/`) — pattern to follow for scoring rubrics.
- 14 brain modules in `brain/` — unchanged. Pipeline feeds into them, doesn't replace.
- 13 role AGENT.md files in `roles/` — get `knowledge_banks:` field added in Phase 5.
- Session handoffs in `projects/nbi_dashboard/session_handoffs/` — these are the FIRST source to ingest (Task 9).

## Glen's Priorities (for context)

1. Personal knowledge harvest first (highest value, most accumulated untapped knowledge)
2. Client work intelligence second
3. Games industry research bank third
4. Proactive monitoring fourth

Phase 1 delivers #1 by ingesting Claude session handoffs. Phases 2-3 expand it. Phase 5 activates #3 and #4.

## After Phase 1

Glen reviews the first batch of extracts and compiled banks. Calibration checkpoint: "Is this useful? Is this noise?" Feedback tunes the system for Phases 2-5.

Then proceed to Phase 2 (ChatGPT harvest) — either same session if context allows, or next session.
