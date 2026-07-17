---
source: granola
source_id: not_S2aqeqlWzBXtVY
source_path: https://notes.granola.ai/t/0f4fd791-d2f3-463a-a34e-f56331c0570e
ingested: 2026-07-17
topics_detected: [ai-tools, governance, ip-protection, studio-policy, generative-ai]
relevance_score: 9
novelty_score: 9
actionability_score: 9
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# Studio AI Tools Governance: Three-Tier Classification Framework

## Key Content

Framework developed for a ~55-person MMO development studio to govern AI tool use across the art team. Three tiers:

**Tier 1 -- Private/In-House:** Isolated models (LLaMA, GLM, ComfyUI, local downloads). No IP exposure risk. Unrestricted use encouraged.

**Tier 2 -- Public Frontier:** Claude, ChatGPT, Gemini. Restrict to non-IP use cases unless accessed via enterprise accounts (enterprise accounts have stronger data processing agreements; content does not train public models). Audit existing use before setting policy.

**Tier 3 -- Industry-Specific:** Tripo, Meshy, Imagine.art, Komodo, Seedance. Audit what is actively being used and for what before drafting policy. Some (e.g. Seedance) can be run via private API with private output -- treat as Tier 1 if deployed this way.

**Longer-term:** push for dedicated AI Builder headcount to host private cloud/VPN model (e.g. Hostinger). Private model hosting converts Tier 2/3 tools to Tier 1 by removing data exposure.

**Sentiment snapshot by sub-team:** environment art and animation pro-AI; VFX mostly pro-AI; tech art mixed; character art sceptical; concept art largely opposed.

## Decisions / Insights

- Glen (NBI MD / CPO) decided: audit current tool usage across all art sub-teams before setting formal policy; policy written without a usage baseline will miss what teams are actually doing.
- Glen concluded: enterprise account access is the enabler for Tier 2 tools on IP-containing work; the policy gate is account type, not tool type.
- Pattern: sub-team AI sentiment varies by craft proximity to generative output (character/concept art most resistant, environment/animation most receptive).

## Context

1:1 between NBI MD and Couch Heroes Art Director on 17 Jul 2026. AI tools policy triggered by a new Head of Finance requiring a full licence audit across all leads. The three-tier framework was developed in the meeting as a scoping tool ahead of a formal policy document.

## Applicability

Relevant when: advising any game studio on AI tools governance -- the three-tier model is immediately actionable; adapt Tier 3 tools list to the studio's specific stack.
Relevant when: a studio's legal or finance function initiates a licence audit -- use the audit as the hook to establish AI policy simultaneously; the audit baseline is the input the policy needs.
Relevant when: a studio wants to use generative AI on proprietary IP -- the enterprise account gateway is the practical path; private model hosting is the longer-term solution.
Relevant when: building an NBI AI advisory service offer -- this framework gives clients a tangible starting point; audit + classify + policy is a structured three-step engagement.
