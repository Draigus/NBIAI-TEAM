---
source: granola
source_id: c531d012-c1c6-4410-8d25-f5ef6a9df01c
source_path: https://notes.granola.ai/d/c531d012-c1c6-4410-8d25-f5ef6a9df01c
ingested: 2026-07-16
topics_detected: [analytics-delivery, dashboard, client-management, scope-reclassification, uxr, data-products]
relevance_score: 9
novelty_score: 8
actionability_score: 9
bank_candidates: [client_patterns]
new_bank_suggestions: []
sensitivity_class: client_scoped
extract_type: exemplar
---

# Analytics Dashboard Delivery Pivot: Scope Reclassification and AER Framework

## Key Content

An analytics team delivered 8-9 Superset dashboards on time and on brief (labeled P0/Alpha). Within days, the client reclassified all as Beta -- unsuitable for an upcoming UXR alpha test. The issue had been flagged early by the delivery team but not acted upon before delivery.

**Root cause:** dashboards built on cohort-day intervals; the UXR alpha test is a 6-hour session requiring session-level granularity. The data architecture and the test design were mismatched from the start.

**Pivot decision (from the product owner, not the analytics manager):** keep existing dashboards as telemetry infrastructure; build one new Alpha-specific dashboard using an AER framework (Acquisition, Engagement, Retention). Monetisation tab excluded (no live data). One exec summary tab for the studio CEO; additional tabs per stakeholder group. Delivery team lead to wireframe with the analytics manager, then build solo; start date Friday pending sign-off.

**Secondary pattern -- Superset adoption:** security waiver obtained for the analytics tool (avoided a full enterprise IT review process); accepted by the client with appropriate caution given the speed of the decision.

**Transition context:** client's Analytics Manager departing 26-27 July. Analysts instructed to proceed normally until then. Written handover plan required (not verbal briefings). External data science consultant with strong credentials staying on part-time as interim coverage; endorsed by the product owner. Full-time analytics lead being recruited locally -- advisory firm's view: difficult hire in that location, NBI should set more direction in the interim.

## Decisions / Insights

- NBI lead decided: treat inaccessible client contacts (team members with no direct communication channel) as a defect requiring escalation, not a normal working condition.
- NBI lead decided: NBI should step into advisory direction as the client recruits internally; increased advisory involvement = increased accountability for communication quality.
- Client product owner (not analytics manager) drove the scope reclassification and AER pivot -- advisory teams must understand the actual decision-maker for data products is often not the analytics lead.
- Delivery team observed: the mismatch between dashboard granularity and UXR test design was visible before delivery; flagging an issue without blocking delivery on it transfers the risk to the client, not the advisory firm.

## Context

NBI analytics team weekly status on 16 Jul 2026 covering Lighthouse (racing game studio). Attendees: NBI Managing Director, NBI Analytics Director, and three contractor analysts. Two client-side contacts (the Analytics Manager and product owner) had reclassified delivered work; the meeting addressed the pivot and transition planning ahead of the Analytics Manager's departure.

## Applicability

Relevant when: delivering data products to a client -- confirm the test or use-case design before building; a correctly delivered artifact for the wrong test window is still a miss.
Relevant when: advising on analytics leadership transitions -- a written handover plan with specific dates (not "I think" meetings) is the minimum standard; identify which existing relationships need to be formalised as direct channels before the departing person leaves.
Relevant when: adopting a new analytics tool with a client -- a security waiver pathway exists at most studios; frame it as a fast-path option with documented rationale rather than an IT bypass.
Relevant when: a client's internal analytics hire is proving difficult -- use the hiring gap as an opportunity to formalise NBI's advisory direction role, but flag to the client that stepping into decision-making means accountability for communication quality in that studio's specific context.
