---
source: granola
source_id: granola_b82e3b84
source_path: granola://meetings/b82e3b84-9cff-4701-b91a-411b5982ebc7
ingested: 2026-05-30
topics_detected: [qa-process, design-lock, estimation, vertical-slice, pipeline-gates]
relevance_score: 9
novelty_score: 8
actionability_score: 9
bank_candidates: [client_couch_heroes, production_methods]
new_bank_suggestions: []
sensitivity_class: client_scoped
extract_type: decision
---

# Catch Up with Hannah -- QA Estimation Approach and Design Lock Process

## Key Content

Hannah (QA lead) rejected the dev spreadsheet format for QA estimation -- too vague, no logical testing flow. Created Miro mirror breaking vertical slice into testable sections with specific questions for Robin, who answered end of last week. Glen approved Hannah building a separate QA estimation sheet with flow-based estimates, recognising QA works differently than development. QA stories must link to build stories and roll up into Jira. Major gap identified: no design lock process exists. Robin says designs are final but other designers treat them as first iteration, creating risk of rebuilding test plans. Solution: schedule meeting with Glen, Hannah, Robin, and Valeria to define design lock at different tiers (T1-T4) with accountability. QA elevated to primary arbiter of ship-readiness -- Hannah needs authority to block gate progression if quality criteria not met. QA pipeline requirements to be created defining inputs needed at each development tier.

## Decisions / Insights

- [Glen] decided: QA gets separate estimation sheet -- not forced into dev spreadsheet format
- [Glen] decided: QA and playtesting are primary arbiters of ship-readiness, can block gate progression
- [Glen + Hannah] identified: no design lock process exists -- creates rework risk across QA
- [Glen] decided: design lock meeting needed with Glen, Hannah, Robin, Valeria to define tier-based lock criteria
- [Hannah] action: create QA-specific pipeline requirements defining inputs at each development tier
- [Hannah] action: build QA estimation sheet, set up design lock meeting, create Friday agenda for Glen check-ins

## Actionable Items

- Schedule design lock definition meeting (Glen, Hannah, Robin, Valeria)
- Hannah to create QA pipeline requirements and authority definitions
- Hannah to build separate QA estimation with test plan approach
- Establish QA as forcing function for tier definitions
