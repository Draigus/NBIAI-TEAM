---
source: web_research
source_id: web_2026-06-24_mid-tier-console-preproduction-failure
source_path: https://www.gamedeveloper.com/production/post-mortem-from-the-trenches-of-a-mid-tier-console-developer
ingested: 2026-06-24
topics_detected: [production, pre-production, post-mortem, vertical-slice, scope, QA, console-cert, failure, task-management]
relevance_score: 7
novelty_score: 6
actionability_score: 8
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: public
extract_type: case_study
---

# Mid-Tier Console Post-Mortem -- Pre-Production Failure Anatomy (UK Studio)

## Key Content (max 200 words)

Anonymous UK mid-tier console developer, sports fitness game with multi-camera and mocap integration. GDD and ADD (design and art direction documents) not signed off until 5 months into full production -- meaning production started without validated scope. Lead coder not assigned until month 6; that lead departed 4 months later and was not replaced, leaving architecture unstable until 2 months before first submission.

Task management simultaneously used: messenger, whiteboards, Excel, email lists, Campfire, verbal requests, MS Project, Mantis, and Word documents. No unified system. Project hit Milestone 8 on time; all subsequent milestones slipped. Alpha arrived 3 full months late.

Feasibility never conducted on two key technical features: mocap exercise tutorials and camera-tracked backgrounds. Combined, these consumed at least 4 months of QA time for camera alignment alone. QA received builds late, lacked dev kits, and was eventually repurposed as a build machine creating ISOs rather than testing. Source control (Mercurial) introduced at month 3, abandoned at month 6, causing lost work. Scope crept from 8 athletes to 17, plus additional features added mid-production. Publisher scope changes 3 weeks before initial submission caused morale damage.

## Decisions / Insights

- Never begin full production without signed-off GDD and ADD: scope lock is not bureaucracy, it is the only way to build a schedule with any validity
- Lead technical roles must be filled on day one; a mid-production vacancy in a lead role cascades into unstable architecture that becomes a blocking constraint near deadline
- Feasibility studies must precede commitment to technically novel features: mocap pipeline and camera tracking were never validated before becoming critical-path items
- A proliferation of task-tracking systems is a production warning signal, not just inefficiency -- it indicates teams are making scope and priority decisions in isolated silos
- Publisher-driven scope changes within 3 weeks of submission are a contractual failure: the lesson is to negotiate milestone change-freeze windows in the original contract

## Context

Anonymous UK mid-tier console developer, published gamedeveloper.com, circa 2008-2012 (Phyre engine and Mercurial references; studio name withheld). The failure modes are structural and applicable to any 20-100 person studio entering console production for the first time, regardless of era. The vertical slice problem (scope never validated before full production) is the precise risk pattern the production brief asked this cycle to document.

## Applicability

NBI can use this as a teaching case for any client studio entering console production for the first time, or any studio compressing pre-production to hit a publisher milestone. The three actionable rules -- scope lock before full production, feasibility studies for novel features, single task-tracking system -- are concrete inputs for production audits. The console cert timing lesson (working backwards from submission, minimum 6 months) corroborates the Motion Twin finding from the same cycle.
