---
source: granola
source_id: 2f0c341b-0d0c-4614-b618-3bce6746349c
source_path: https://notes.granola.ai/d/2f0c341b-0d0c-4614-b618-3bce6746349c
ingested: 2026-07-08
topics_detected: [productivity-monitoring, remote-work, team-management, kpi, engineering-management]
relevance_score: 8
novelty_score: 8
actionability_score: 8
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Productivity Monitoring via Signal Triangle (Without Screen Monitoring)

## Key Content

A CPO at a ~55-person remote studio developed a three-signal productivity monitoring framework that avoids screen monitoring while still surfacing genuine underperformance.

**The three signals:**
1. Slack activity -- communication and collaboration signal
2. Jira delivery patterns -- task closure and sprint behaviour
3. VCS check-in frequency (Perforce or Git) -- code output signal

**Interpretation rules:**
- Low on all three simultaneously = something is wrong; investigate
- Low Slack alone = NOT a red flag for an engineer in flow: "I don't want bing bing bing, I'm working in the flow"
- No single signal is conclusive; the combination tells the story

**Jira red-flag patterns (specific):**
- Tasks consistently delivered at 2x estimated size
- No progress updates until the last 3 days of a sprint
- These are observable, objective patterns not dependent on manager judgement

**VCS red-flag threshold:**
- One check-in per week from a full-stack engineer = warning sign
- Must be calibrated to role; complex system work may have legitimately lower check-in frequency

**Hard limits:**
- Screen monitoring explicitly rejected: slippery slope, damages trust
- Historical principle: CPO refused to build screen-time monitoring at a previous employer; the boundary holds
- Leads pulling Slack statistics to monitor staff described as the first step on a slippery slope

**Status:** decision deferred; CPO to formalise a position before the following week's discussion.

## Decisions / Insights

- CPO decided: three-signal approach (Slack + Jira + VCS) is the right framework; no screen monitoring under any circumstances.
- CPO observed: Slack silence is a false negative for engineers; it means flow, not absence.
- CPO observed: the combination of signals -- not any single one -- constitutes meaningful evidence of underperformance.
- CPO observed: Jira telltale patterns (2x estimate, last-3-day sprint burst) are the most reliable single-source signal.
- CPO observed: CEO instinct ("two tasks per week is bad") misreads engineering -- two tasks can represent large, tightly coupled systems.

## Context

Planning session between CPO and EP at a ~55-person MMO studio, 8 Jul 2026. The CEO had asked about monitoring team productivity; the CPO and EP worked through what signals were meaningful without crossing into police-state territory.

## Applicability

- Relevant when: a studio founder asks how to monitor remote team productivity -- three-signal framework (Slack + Jira + VCS) with combination interpretation is the recommended approach.
- Relevant when: a studio is considering screen monitoring -- this is the counterargument with a clear hard line and historical precedent.
- Relevant when: an engineer appears to have low Slack activity -- not a red flag; flow state is the benign interpretation.
- Relevant when: a producer or lead is pulling Slack statistics to monitor staff -- flag as the first step towards screen monitoring; push back early.
- Relevant when: Jira delivery data is being used to assess individual performance -- 2x estimate pattern and last-3-day delivery burst are the meaningful signals, not raw task count.
