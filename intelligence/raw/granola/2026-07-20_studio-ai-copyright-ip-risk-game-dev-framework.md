---
source: granola
source_id: not_9nQcKcphTysGNd
source_path: https://notes.granola.ai/d/6ad30ef0-667c-4c82-9268-58fceef957b6
ingested: 2026-07-21
topics_detected: [ai-policy, copyright, ip-risk, game-dev, generative-ai, legal]
relevance_score: 9
novelty_score: 8
actionability_score: 9
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: public
extract_type: insight
---

# Studio AI Copyright and IP Risk: Operational Policy Framework for Game Development

## Key Content

Key copyright risks from AI tool use in game studios:

**Copyright loss risk:** Accomplished works fed entirely through AI may not retain copyright. Reported threshold: 30% human differentiation required to maintain a claim to derivative copyright. An Oregon-based operator is currently winning lawsuits by running IP corpora through AI checkers and claiming public-access rights.

**Rovo / Confluence AI:** Carries the same risk as external frontier LLMs (Claude, ChatGPT, Gemini). Confluence's own AI is not a safe harbour for proprietary design documents.

**Adobe Photoshop:** Now embeds AI; legal question is open on whether AI-assisted tooling voids copyright on art assets produced in it.

**Unreal Engine 6:** Will embed AI by default; currently staying on UE5 to avoid this exposure.

**Steam disclosure requirement:** Platform requires AI disclosure. Player 33 lost awards over a single placeholder AI image left in their build.

**Live incident:** A developer committed AI-generated code, broke the build, required a 2.5-week rollback -- serves as a concrete production risk example alongside the legal risk.

**Policy direction:** Use AI for templates and structure. Do not input raw GDDs, full design documents, or art corpora into public frontier models.

**Format recommendation:** Operational usage document (tool-by-tool, role-by-role guidance) paired with an HR policy document -- not a simple do/don't list, because tool-specific nuances make generic lists unenforceable.

## Decisions / Insights

- Glen (CPO) decided: AI policy must be operational (tool by role) not just a do/don't HR policy; generic policies fail because nuances vary by tool and by craft.
- Insight: the 30% human differentiation threshold is the practical copyright floor for AI-assisted work; pure AI output has no studio copyright claim.
- Pattern: AI governance failures tend to come from well-intentioned misuse (developer building unauthorized tool; executives distributing AI subscriptions without controls) -- policy must address intent as well as action.

## Context

Production meeting at a ~55-person MMO studio, 20 Jul 2026. AI policy discussion triggered by a developer building an unauthorized AI tool ingesting ClickUp project data and by executives distributing Quad AI subscriptions without governance controls. Discussion covers Perforce, Jira, UE5, and third-party AI tools alongside the policy framework.

## Applicability

Relevant when: advising any game studio on AI tool governance -- use the 30% differentiation threshold and the tool-by-tool operational format as the practical anchors.
Relevant when: a studio is building an AI policy -- the operational usage document (tool + role matrix) is more enforceable than a generic do/don't list.
Relevant when: a studio uses Confluence, Adobe, or embedded-AI tools -- these carry the same IP exposure as frontier models; do not treat them as automatically safe.
Relevant when: a studio targets Steam publishing -- AI disclosure is required; a single undisclosed AI image can cost awards and press coverage.
Relevant when: a developer reports an AI-generated code incident -- the 2.5-week rollback case establishes concrete production cost alongside the legal risk.
