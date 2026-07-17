---
source: granola
source_id: not_CyGphiWiLa6dnp
source_path: https://notes.granola.ai/t/aa0871da-57ab-493b-870f-70939ed2b83d
ingested: 2026-07-17
topics_detected: [analytics, publisher-relations, data-control, live-service, organisational-dynamics]
relevance_score: 8
novelty_score: 9
actionability_score: 7
bank_candidates: [client_patterns, production_methods]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: insight
---

# Publisher Analytics Control Pattern: Embedded Data Scientists as Access Control Mechanism

## Key Content

Pattern observed at a Tencent-funded studio: the publisher proposed embedding a company-owned data scientist at the developer's studio for several months, framed as analytics support. The studio's analytics director read this as an analytics control play, not a collaboration -- the publisher wants visibility into studio telemetry data and player behaviour on publisher-owned IP.

Historical parallel cited: EA's use of data access control as a power retention mechanism -- withholding platform data from developers to maintain leverage. The embedded analyst model achieves the same outcome while appearing collaborative.

Studio response: push back on physical embedding (remote studio, no capacity to host), propose the analyst works remotely from the publisher's country. This reduces the control footprint without a direct refusal.

Long-term publisher intention: a publisher-country-based data science team supporting the studio as the game scales, replacing or marginalising the studio's own analytics capability.

## Decisions / Insights

- Client analytics director concluded: the embedded analyst offer is an analytics control play, not a collaboration; accept the resource but protect independent analytics access.
- NBI MD observed: studios should maintain their own analytics layer independent of publisher data access; reliance on publisher analytics creates leverage risk.
- Pattern: publisher-embedded "support" offers in analytics are often early steps in a data ownership transition; studios should document what data access they retain vs. what passes through the publisher layer.

## Context

Discussed in an NBI advisory check-in with a live service director on 17 Jul 2026. The studio is Tencent-funded; the offer emerged as the game approaches a key investor review milestone. The context is a large-scale live service title where player telemetry is central to revenue design.

## Applicability

Relevant when: advising a studio receiving publisher analytics "support" -- assess whether the offer is capability transfer or data access capture; the test is whether the studio retains independent query access to its own telemetry.
Relevant when: structuring NBI analytics advisory for a publisher-funded studio -- define analytics independence explicitly in the engagement scope; NBI should not operate through publisher-controlled tooling.
Relevant when: a client describes a publisher offering to embed staff in their team -- probe the data access implications; embedded staff create information asymmetry over time.
