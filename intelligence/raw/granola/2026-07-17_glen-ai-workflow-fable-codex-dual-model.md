---
source: granola
source_id: not_rMMsBhB0b7LlEz
source_path: https://notes.granola.ai/t/not_rMMsBhB0b7LlEz
ingested: 2026-07-17
topics_detected: [ai-workflow, claude, codex, development-tools, token-efficiency, skill-router]
relevance_score: 7
novelty_score: 8
actionability_score: 7
bank_candidates: [personal_insights]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# Glen's AI Development Workflow: Fable Builder + Codex Red Team Architecture

## Key Content

Glen's established AI-assisted development setup as of July 2026:

**Primary model:** Claude Fable 5 (high all day). Strong agreement with a CH engineer that Fable outperforms Opus/Sonnet/4.7/4.8 for planning, PRs, and code.

**IDE:** VS Code with Fable integrated via CLI bridge (not MCP bridge).

**Red team:** Codex (GPT-5.5 via OpenAI) used as adversarial reviewer. Fable builds; Codex challenges. The dual-model architecture provides cross-AI validation that same-model review cannot.

**Skill router:** built to avoid loading the full GSD skill set into context on every invocation. Routes to specific skill subsets based on task type. Result: ~20% reduction in token usage per session.

**AIOS command centre:** 240k-line modularised tool tracking meetings, decisions, work queues, client workstreams, and people notes pulled from Granola. This is the NBI Hub / WorkSage system.

**Shared with CH engineer:** YouTube-scraping skills that let Claude watch and learn from videos, then self-implement. Offered to Glen as a knowledge-transfer tool.

## Decisions / Insights

- Glen confirmed: Fable is strongly preferred over all other Claude models for engineering tasks as of July 2026; this is a settled position, not exploratory.
- Glen observed: the CLI bridge (not MCP) is the correct integration path for Codex in the dual-model setup; MCP introduces additional abstraction that is not needed.
- Pattern: the skill router is the mechanism that keeps context lean; without it, loading all skills wastes tokens even when most skills are irrelevant to the current task.

## Context

1:1 between Glen (NBI MD) and a CH staff engineer on 17 Jul 2026 focused on AI tooling, IP policy, and internal GitHub consolidation. Both are running Fable at high intensity daily; the conversation was a peer exchange on workflow optimisation.

## Applicability

Relevant when: Glen is asked to describe his AI workflow or tooling setup -- this is the current-state reference as of July 2026.
Relevant when: advising a client on AI-assisted development -- the dual-model (builder + red team) architecture is a practical recommendation for teams that want adversarial review without purely self-referential validation.
Relevant when: a client engineer asks about token efficiency -- the skill router pattern (~20% token reduction) is the technique worth sharing.
