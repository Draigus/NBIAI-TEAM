---
source: onedrive
source_id: goals_red_team_report_2026-04-21
source_path: Clients/Goals/competitive_research/output/RED_TEAM_REPORT.md
ingested: 2026-05-25
topics_detected: [quality-assurance, data-validation, research-methodology, red-team]
relevance_score: 8
novelty_score: 8
actionability_score: 9
bank_candidates: [client_patterns]
new_bank_suggestions: [quality_methodology]
sensitivity_class: anonymisable
extract_type: methodology
---

# Red Team Validation Methodology for Research Deliverables

## Key Content

NBI's red team process for competitive research deliverables. Original score 53/100 (FAIL), remediated to 86/100 (PASS), enhanced to 93/100 (PASS). Five scoring dimensions with weights: data collection 25%, normalisation quality 20%, claim accuracy 30% (highest weight), citation verifiability 15%, analytical rigour 10%. Three severity tiers for issues: Critical (must fix before delivery), High (should fix), Medium/Low (non-blocking). Process: automated verification scripts (normalise.js, verify.js, output-export.js) plus manual review. Key fixes that moved score: F1 pricing table rewritten from fabricated data (C1), currency inference patched for 365 rows (C2), name canonicalisation for competitor consistency (C3), Fortnite volume discount recalculated against practical base tier (H4). Enhancement passes added cross-reference against client's own pricing and soft currency normalisation. Kill criteria: zero empty metadata fields in normalised output.

## Decisions / Insights

- NBI decided: claim accuracy carries highest weight (30%) because wrong claims in deliverables destroy credibility
- NBI observed: original score of 53/100 means ~47% of initial research output had quality issues before validation
- NBI decided: red team must run automated verification scripts, not just manual review
- NBI decided: cross-reference against client's actual position is mandatory (benchmarks without client comparison are incomplete)
- NBI observed: round-up from weighted 91.10 to 93 reflects qualitative improvements not captured by arithmetic

## Context

Developed during GOALS AB pricing benchmarking engagement (SOW 1, 100K SEK). Red team was Claude acting per Glen's directive. Report covers 315 normalised price points across 12 competitors. Process took remediation + two enhancement passes to reach final score.

## Applicability

- Relevant when: validating any research deliverable before client delivery
- Relevant when: designing quality scoring frameworks for data-driven analysis
- Relevant when: building automated verification pipelines for research outputs
- Relevant when: training junior analysts on what "deliverable quality" means in practice
