---
source: granola
source_id: not_CvwUWwYsruRk1J
source_path: https://notes.granola.ai/d/f79555ca-9b55-4707-9572-6a72dcd69d0e
ingested: 2026-07-31
topics_detected: [studio-ops, it-management, saas-licensing, cost-control, gdpr]
relevance_score: 6
novelty_score: 7
actionability_score: 7
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Studio IT: SaaS License Cost-Center Accountability Achieves 15%+ Budget Reduction

## Key Content

SaaS license sprawl is the primary IT cost problem at studios scaling from 40 to 250+ employees. A cost-center ownership model resolves it.

**Phase 1:** raw license tracking in Excel -- which tools, how many seats, what they cost per month.

**Phase 2:** structured tracking (Dataverse, Airtable, or equivalent). Link Azure Entra security group member counts directly to license counts as a real-time control mechanism -- when Entra group membership drops, license count should drop too.

**Ownership model:** proactively email product/department owners to confirm all seats are needed at regular intervals. Charge unused licenses to the team budget rather than central IT budget. Outcome: ~15%+ IT budget reduction through accountability.

**MDM for mixed device environments:** Intune paired with Apple Business Manager handles most scenarios. Limitation: Entra-joining Windows devices mid-use requires a wipe -- relevant for onboarding in-motion studios. NinjaOne flagged as a strong all-in-one RMM alternative for greenfield setups (~€1.40/device/month).

**BYOD policy:** define corporate vs. personal device ownership explicitly in writing, especially where FTEs and contractors use mixed devices -- ambiguity creates compliance exposure.

**Developer input loop:** run monthly IT engineering meetings to gather developer input on IT improvements, not only product topics. Prevents IT acting in isolation from production tooling reality.

**GDPR/IP governance:** Microsoft Purview is the standard tool for PII governance and data loss logging in Microsoft-stack studios.

## Decisions / Insights

- Senior IT manager at a 250-person multi-site studio: Entra security group count matched to license count is the most reliable control mechanism -- removes manual auditing
- Senior IT manager: cost center ownership (charging unused licenses to team budgets) produced 15%+ budget reduction at a 250→650-user studio scaling over 3 years
- Senior IT manager: NinjaOne preferred for greenfield IT setups; Intune for established Microsoft environments

## Context

IT manager candidate interview at a ~60-person UK/Cyprus games studio, July 2026. Candidate had scaled IT infrastructure from 40 to 650 users across 14 countries at a previous employer. Relevant as generic IT methodology for studio advisory -- candidate identity is not the extractable knowledge.

## Applicability

Relevant when: advising a studio on IT cost control -- the Entra-to-license-count control mechanism and cost center ownership model is the specific mechanism for SaaS sprawl reduction.
Relevant when: a studio is scaling rapidly (40 to 200+ employees) and IT budget is unclear -- phase 1 (Excel) to phase 2 (structured tracking + Entra control) is the appropriate maturity path.
Relevant when: a studio asks about MDM for mixed device environments -- Intune + Apple Business Manager for established environments; NinjaOne for greenfield.
Relevant when: BYOD policy design for a studio with contractors and FTEs on mixed devices -- explicit corporate vs. personal ownership definition is a compliance requirement, not optional.
