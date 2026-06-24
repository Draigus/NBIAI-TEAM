---
source: granola
source_id: 5106de07-1c97-48eb-b038-627a6a11ccaa
source_path: https://notes.granola.ai/d/5106de07-1c97-48eb-b038-627a6a11ccaa
ingested: 2026-06-24
topics_detected: [hiring, ats, pipeline-management, scorecard, recruitment, workflow]
relevance_score: 8
novelty_score: 7
actionability_score: 9
bank_candidates: [production_methods, client_patterns]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# ATS-Based Hiring Workflow: Pipeline Thresholds and Scorecard Automation

## Key Content

Working model for managing a large hiring pipeline via an ATS (applicant tracking system) with a third-party recruiter:

- **Pipeline threshold:** five candidates per open role is the working target. Ideal state is two strong finalists to choose between before offer. Below five means the pipeline is underpowered.
- **Scorecard automation:** interviewers are added as dropdowns in the ATS; hiring managers configure the question set; scorecards are sent to interviewers via email link. All parties (recruiter, HR, hiring managers) get shared visibility without a manual debrief cycle.
- **Master spreadsheet hygiene:** maintain an open/closed column on the master overview tab. Filter to open roles only before uploading candidate data to the ATS. Active role columns needed: name, stage, location, notes.
- **Friction point:** slow scorecard returns from hiring managers is the recurring bottleneck, not recruiter throughput.
- **Priority discipline:** recruiter needs real-time notification when role priorities shift; late notification causes pipeline misalignment.
- **Role open until start date:** when a hire is made but not yet joined, the role remains open in the ATS.

## Decisions / Insights

- Glen decided: the ATS will automate debrief workflow once candidate data is uploaded, replacing manual scheduling.
- Glen observed: the pipeline for Lead Gameplay Developer was underprioritised due to a recruiter handover gap -- the threshold must be actively managed, not assumed.
- Glen concluded: opting out of early interview rounds is acceptable if question sets and scorecards are strong enough to surface signal without direct involvement.

## Context

NBI managing an ATS for a ~55-person game studio's large hiring push. Participating parties: Glen (advisory/fractional CTO equivalent), studio HR lead (Lorenza), and SkillSearch recruiter (Ryan). Studio targeting 150 people; multiple open roles across engineering, design, and art disciplines. Meeting was an operational coordination call on 2026-06-24.

## Applicability

- Relevant when: managing a multi-role studio hiring push through an external recruiter; scorecard discipline and pipeline health are as important as sourcing volume.
- Relevant when: advising a studio on ATS adoption -- data upload hygiene (open/closed filter, active columns only) prevents noise in recruiter reporting.
- Relevant when: a hiring manager is opting out of early interview rounds -- ensure question sets and scorecards are strong enough to operate without their direct presence.
- Relevant when: recruiter and studio are misaligned on role priorities -- establish an explicit notification trigger for priority changes, not periodic syncs.
- Relevant when: pipeline appears healthy but specific roles are underfilled -- check whether recruiter handovers caused gaps rather than assuming sourcing failure.
