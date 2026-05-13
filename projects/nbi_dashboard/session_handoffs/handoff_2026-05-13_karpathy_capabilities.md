# Handoff: Karpathy-Derived Capabilities Build

**Date:** 2026-05-13
**Branch:** `feature/command-centre` (7 new commits on top of CC work)
**Status:** Phase 1-3 complete, one deferred test, ready for Glen UAT

---

## What Was Done

Researched Andrej Karpathy's recent work (AutoResearch, LLM Wiki, agentic engineering, Software 3.0, Eureka Labs model), cross-referenced against all of NBI's operations, and built three capabilities that operationalise the most relevant patterns.

### Built: Two Claude Code Skills

**`/compile-client`** — Compiles a client document folder into a structured CLIENT_BRAIN.md knowledge base. Based on Karpathy's LLM Wiki pattern: compile once, load the artefact, don't re-read raw sources every session. Every fact gets a `[source: filename]` provenance tag.

- Skill: `.claude/skills/compile-client/SKILL.md`
- Tested on: `Clients/Goals/` (28 source files compiled into `Clients/Goals/CLIENT_BRAIN.md`)
- Sections: Company Profile, Product/Game, Key Contacts, Engagement History, Domain Context (Pricing, Live Ops, Market Position), Open Questions, Decision Log, Source Index
- Ready to use on any client folder: `/compile-client Clients/Couch Heroes`, etc.

**`/autoresearch`** — Autonomous iteration loop that scores documents against weighted criteria and makes atomic improvements until convergence or iteration limit. Based on Karpathy's AutoResearch pattern (adopted by Shopify, AutoBeta, MindStudio beyond ML).

- Skill: `.claude/skills/autoresearch/SKILL.md`
- Three built-in criteria sets: `consulting` (6 dimensions), `pricing` (6 dimensions), `pitch` (6 dimensions)
- Criteria files: `.claude/skills/autoresearch/criteria/{consulting,pricing,pitch}.md`
- Each criteria file has detailed 1-10 scoring guides per dimension
- Experiment log output: `autoresearch.jsonl` alongside the target document
- **NOT YET TESTED ON A REAL DOCUMENT** — skill is built and correct but the live test (Task 5) was deferred. First real use should be on an actual consulting deliverable rather than a synthetic test.

### Built: AI Operations Positioning

**`brain/services_ai_operations.md`** — New Brain module documenting NBI's AI operations capability as both internal asset and sellable service. Covers: what NBI has built (framed using Karpathy's LLM OS vocabulary), internal impact with real examples, two client service offerings (AI Ops Setup + Continuous Intelligence), competitive positioning against Sia/McKinsey/Cognizant/Google, pricing framework (ranges TBD by Glen), trigger conditions for when to propose.

**`templates/proposal_ai_operations.md`** — Drop-in proposal module for client engagements. 4 sections: Our Approach (3 paragraphs), What We Build For You (5 bullets), How It Works (Audit/Build/Transfer), Why NBI (4 differentiators). Studio-native voice throughout.

**`NBI_Brain.md`** — Updated Section 8 with AI Operations Capability subsection. Updated Section 9 module index with `brain/services_ai_operations.md` entry.

**`brain/playsage.md`** — Added "Architectural Guidance — The Sage as Software 3.0" section at the end. Covers: LLM Wiki pattern for market intelligence, LLM analysis layer (not just dashboards), AutoResearch quality loops for recommendations, agent swarm data collection. This is architectural guidance for when PlaySage development resumes.

---

## Commits (7 total, all on feature/command-centre)

```
10e37a0 feat: add Software 3.0 architectural guidance for PlaySage Sage module
b7bc414 feat: add AI operations capability to Brain (section 8 + module index)
08b44c4 feat: add AI operations proposal module template
2a3b683 feat: add AI operations service module to Brain
a96c71f feat: add /autoresearch skill — autonomous document quality iteration engine
9bf393c feat: compile Goals Studio client brain from 28 sources
66db14d feat: add /compile-client skill and learnings.md — LLM Wiki pattern for client knowledge bases
```

---

## What's Not Done

1. **AutoResearch live test** — The skill is built but hasn't been run on a real document yet. First real use: run `/autoresearch` on a Goals pricing deliverable or Sarge Universe pitch material when those are being worked on.

2. **Couch Heroes CLIENT_BRAIN.md** — Not compiled yet. Run `/compile-client Clients/Couch Heroes` when starting a Couch Heroes-focused session. This is where the skill has the biggest payoff (Glen's majority-of-day engagement).

3. **Glen pricing decisions for AI Ops service** — `brain/services_ai_operations.md` has a pricing framework section with placeholder ranges pegged to NBI's Medium/Large tiers. Glen needs to decide actual numbers.

4. **Proposal template customisation** — `templates/proposal_ai_operations.md` is generic NBI. First real use should be customised for the specific client (e.g., if Couch Heroes asks about AI integration, adapt the template to their situation).

---

## Key Files

| File | Purpose |
|---|---|
| `docs/superpowers/specs/2026-05-12-karpathy-capabilities-design.md` | Full design spec |
| `docs/superpowers/plans/2026-05-12-karpathy-capabilities-plan.md` | Implementation plan (10 tasks) |
| `.claude/skills/compile-client/SKILL.md` | Client wiki compiler skill |
| `.claude/skills/autoresearch/SKILL.md` | AutoResearch engine skill |
| `.claude/skills/autoresearch/criteria/consulting.md` | Consulting deliverable scoring criteria |
| `.claude/skills/autoresearch/criteria/pricing.md` | Pricing model scoring criteria |
| `.claude/skills/autoresearch/criteria/pitch.md` | Pitch/investment materials scoring criteria |
| `brain/services_ai_operations.md` | AI ops service capability (Brain module) |
| `templates/proposal_ai_operations.md` | Proposal drop-in module |
| `Clients/Goals/CLIENT_BRAIN.md` | Compiled Goals Studio knowledge base (test output) |

---

## CC Scanner Compatibility

All new files are compatible with the Command Centre's scanners:
- Both skills indexed by `scanSkills()` (visible in Skills Intelligence card)
- Brain module indexed by `scanBrain()` (visible in Brain & Memory card)
- No dashboard-server files touched — zero conflict with CC build work
