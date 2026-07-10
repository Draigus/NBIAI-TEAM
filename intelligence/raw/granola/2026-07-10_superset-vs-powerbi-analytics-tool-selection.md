---
source: granola
source_id: ed888abc-4b7e-4a5e-bc35-7c5b94229477
source_path: https://notes.granola.ai/d/ed888abc-4b7e-4a5e-bc35-7c5b94229477
ingested: 2026-07-10
topics_detected: [analytics-tooling, bi-tools, superset, power-bi, aws, cost-optimisation]
relevance_score: 7
novelty_score: 6
actionability_score: 7
bank_candidates: [client_patterns, production_methods]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: decision
---

# Superset vs Power BI: Analytics Tool Selection Criteria for Embedded Studio Teams

## Key Content

An embedded analytics team managing live games data reversed a default Power BI decision in favour of Apache Superset.

**Selection criteria applied:**
- Cost: Superset on AWS is significantly cheaper than Power BI (no Microsoft licensing overhead); runs on existing AWS infrastructure
- Security setup: Superset easier to configure securely than Power BI in an AWS-native environment
- Onboarding: Superset has simpler onboarding for the team's existing skill set
- Stakeholder acceptance: primary stakeholder confirmed they had never been the driver of Power BI adoption; it was adopted by default by others

**Key signal the team made the right call:**
- Senior analyst proposed Superset independently and deployed it without being asked -- unprompted initiative from the person who knows the data environment best is a strong validation signal

**Anti-pattern identified:**
- Original Power BI adoption was by default familiarity ("others defaulted to it"), not by evaluation
- Stakeholder assumptions about others' preferences were incorrect and went unchallenged for months

**Cost model note:**
- Superset cost is limited to AWS compute; Power BI adds Microsoft licensing overhead on top of existing cloud cost

## Decisions / Insights

- Analytics lead decided: Superset replaces Power BI on cost, security, and onboarding grounds.
- Analytics lead observed: original Power BI adoption was not a deliberate decision -- it was assumption-driven; direct stakeholder verification reversed it.
- Analytics lead observed: an analyst who independently proposes and deploys an alternative tooling solution is a strong signal the tooling choice is correct.

## Context

Operational review of an embedded analytics team supporting a live games studio, July 2026. Team fully hosted on AWS. Decision triggered by cost and onboarding friction with Power BI. Superset had already been deployed in the environment by the senior analyst.

## Applicability

- Relevant when: a studio or client team is defaulting to Power BI based on familiarity rather than evaluation -- run the AWS cost + security + onboarding comparison before committing.
- Relevant when: a client's BI tooling decision seems driven by assumption about stakeholder preferences -- verify directly before locking in the tool.
- Relevant when: an embedded analyst deploys a tool unprompted and it solves the problem -- treat unprompted initiative as a validation signal, not a rogue action.
- Relevant when: NBI is advising on analytics infrastructure for a game studio on AWS -- Superset is the default recommendation where no Microsoft licensing is already in place.
