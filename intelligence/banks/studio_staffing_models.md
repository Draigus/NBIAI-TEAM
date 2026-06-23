---
title: Studio Staffing Models
slug: studio_staffing_models
last_compiled: 2026-06-23
extract_count: 14
role_associations: [head_of_people, producer, production_consultant, gaming_practice_lead]
description: Studio team composition, staffing patterns, headcount benchmarks, and scaling methodologies for game studios. Covers seniority distribution, staged replacement, junior hire support, CTO hiring pipelines, and remote communication frameworks. Sourced from client engagements, meeting notes, and industry benchmarks.
---

# Studio Staffing Models

## Executive Summary

This bank documents patterns in game studio team composition and scaling -- what works, what breaks, and what NBI advises. Primary evidence from deep engagement with a ~70-person remote MMO studio (2026) supplemented by headcount planning exercises for mobile studios and industry benchmark data. The bank is strongest on the 40-100 person studio transitioning from informal to structured operations. Weaker on publisher-scale staffing (200+) and mobile-only team shapes. All client identifiers anonymised.

---

## Seniority Distribution

### Target Seniority Mix: 60/30/10

Advisory standard for studios in the 40-70 person range: ~60% seniors, ~30% mids, ~10% juniors (only with real mentorship infrastructure). Remote juniors without senior mentors develop bad habits or stall -- no osmotic learning in a remote environment. Training curriculum, dedicated senior time, and structured checkpoints are prerequisites for any junior presence. Frame to clients as capability elevation, not cost reduction -- budget framing triggers resistance. Studios in this range often have a junior-heavy composition that creates quality problems at scale. [source: 2026-06-19_studio-seniority-distribution-target]

### Seniority Title Inflation

Clients routinely present senior talent as deeper than it is. Seniority titles are inflated: a "senior designer" is often a mid with 3-4 years of experience. This surfaces when quality-tier mapping is applied against actual output, not job title. The Quad Assessment (see consulting_frameworks bank) is the tool for exposing this gap. [source: granola_4005eb22, 2026-06-19_quad-assessment-staff-segmentation]

---

## Staffing Methodologies

### Staged Staff Replacement (Wave Method)

Clients resist replacing underperformers because the process feels disruptive. The staged replacement methodology converts this from a culture shock into an incremental process:

1. Open the replacement role
2. Recruit and identify the candidate
3. 2-3 week overlap (handover, knowledge transfer)
4. Exit the underperformer

Wave sizing: 3-5-7-8 (not all at once). Sequence: brief COO and EP before the CEO is involved -- present a step-by-step plan, not just a problem. Key observation: some underperformers self-select out once new hires arrive, reducing the managed exit count. [source: 2026-06-19_staged-studio-replacement-methodology]

### Quad Assessment and Staff Segmentation

One-time structured team evaluation for high-stakes production phases. Core question: "Can this person deliver high-quality content in their craft, at speed, right now?" Result tiers: (1) Hard cuts -- first priority, managed exit; (2) Stars/saves -- director personally owns growth or replacement; (3) Juniors -- separate consideration track; (4) Unmarked -- exits but lower urgency. Lead cap ("you get three picks") forces honest assessment. Cross-reference with consulting_frameworks bank for full methodology. [source: 2026-06-19_quad-assessment-staff-segmentation]

---

## Junior Hire Policy for Remote Studios

Structured onboarding policy NBI writes into client hiring frameworks for fully remote studios:

**Required support structure per junior hire:**
- Dedicated training hours per week (formal, scheduled)
- Separate mentoring hours per week (1:1 with a senior)
- Senior buddy for osmosis and ad hoc questions (always-available informal support)
- Director check-ins every 3 weeks (structured progress review)

**Design rationale:** A remote studio cannot rely on ambient learning (overhearing conversations, watching seniors work, being in the same physical space). All learning pathways that happen organically in an office must be engineered deliberately.

**Core hiring philosophy:** Hire veterans who can do three things, not one. Veterans justify the senior overhead; juniors need structural support to develop; a team of juniors with one veteran creates a bottleneck.

**Target team shape (level design example):** ~3 veterans, 2 mids, 1 junior. A team of 6 juniors bogs down the one veteran; the support policy only works at low junior density. [source: 2026-06-22_junior-hire-policy-remote-studio]

---

## CTO and Senior Hire Pipelines

### Hiring Pipeline Governance

Clients routinely have weak pipeline discipline -- few candidates, late-stage collapses, no screening sequence. Minimum viable pipeline governance:

1. Any open role with fewer than 3 valid candidates is red status
2. Lead-level and above require scorecards and background checks
3. HR screening as first step -- collects salary expectations, contract type, relocation interest before technical evaluation, surfacing disqualifying practical mismatches before interview time is spent

[source: not_4nWBkRC4r7TVRQ_hiring_governance, granola_c3cc29b7]

### AI-Native Hiring Criterion

As of 2026, a major publisher requires an AI component in analyst interviews. Implication: studios and analytics clients hiring into data/analytics roles should design hiring criteria around demonstrated LLM capability, not just domain knowledge. The workforce planning question shifts: "how many analysts?" becomes "do we need one instead of three, with AI leverage?" AI fluency matters more than raw technical skill over any 3-year employment horizon. [source: 2026-06-19_ai-native-hiring-analytics-standard]

---

## Headcount Benchmarks by Studio Tier

### Industry Team Size Benchmarks (2026)

| Tier | Team Size | Budget Range |
|---|---|---|
| Indie | 1-15 | $50K-$500K |
| Mid-tier / Triple-i | 50-100 | $5M-$20M |
| AA | 100-200 | $20M-$50M |
| AAA | 200-800+ | $100M+ |

The "missing middle" between indie ($500K) and mid-tier ($5M) is increasingly rare. NBI clients tend to fall into this gap -- too large for bootstrap budgets, too small for publisher-level investment. [source: web_2026-06-02_production_cost_scaling_trends]

### AAA Team Size Escalation

| Metric | 2022 | 2026 | Growth |
|---|---|---|---|
| AAA average team | 220 people | 300 people | +36% |

Specific examples: one major publisher scaled from ~1,000 to ~2,000 across a sequel cycle; another went from ~500 to ~600 for an expansion. Team size is growing faster than per-person costs, making total cost escalation multiplicative. [source: web_2026-06-02_production_cost_scaling_trends]

### Headcount Efficiency Analysis

For a ~46-person mobile studio on a GBP 10M raise across 3 years: leadership starts at 13 FTE (wave 1), builds to 34 in pre-production (wave 2), reaches peak 46 for go-to-market (wave 3). Employer on-costs modelled at 25-30% of base (NI, pension, benefits). Fully loaded cost multiplier: 1.3x-1.6x base salary depending on benefits package. Three-wave staging (early team, pre-production ramp, go-to-market) prevents burn rate exceeding fundraise capacity. [source: chatgpt_691f13cd, chatgpt_6911c9db]

---

## The Single Producer Failure

Studios in the 40-70 person range routinely have a single producer managing game content, platform work, backend, build pipelines, playtests, partners, and vendors. This fails non-linearly as headcount grows. The configuration works to ~25 people and is critical risk above ~40. Remediation: an Executive Producer overseeing four discipline tracks (QA, Audio, Art, Design), each with an embedded producer. [source: chatgpt_69034e5d]

---

## Remote Communication Frameworks

### Seven-Message Rule

Remote studios require engineered communication structures that offices provide organically. Key patterns: structured check-ins at defined cadences, written decision records (not verbal), explicit escalation paths. The "seven-message rule" is a heuristic for remote communication density -- if a topic requires more than seven messages in a chat thread, it needs a synchronous call. Written follow-up from that call is mandatory. [source: not_ZLLEyCfuFCgGaT]

---

## S-Curve Change Management for Scaling

Introducing structural change (new processes, new roles, new tools) to a scaling studio works best in batches, not continuous drip-feeding. Model: introduce a defined cluster of changes, allow stabilisation, repeat. By the third curve the studio builds change tolerance. Key risk: a new senior hire making independent structural changes during a stabilisation period resets the timeline. Studio owner must manage this actively. Cross-reference with consulting_frameworks bank. [source: not_ireYPwXIKrrsWd_scurve]

---

## Open Questions

1. **Seniority mix by discipline:** Does the 60/30/10 target hold equally across art, engineering, and design, or do some disciplines tolerate a different ratio?

2. **Self-selection rate:** In studios using staged replacement, what proportion of underperformers self-select out before managed exit is required?

3. **Junior support cost:** What is the actual cost (in senior time) of the four-part junior support structure? Is there a breakeven point where the junior becomes net-positive?

4. **Remote vs hybrid scaling curve:** Does the single producer failure point shift earlier in fully remote studios vs hybrid?

5. **AI headcount impact:** As AI tools mature, does the 60/30/10 shift toward fewer people overall, or toward a higher senior percentage?

---

## Source Index

| Source ID | Type | Description |
|---|---|---|
| 2026-06-19_studio-seniority-distribution-target | Granola | 60/30/10 seniority distribution advisory |
| 2026-06-19_staged-studio-replacement-methodology | Granola | Staged staff replacement wave method |
| 2026-06-19_quad-assessment-staff-segmentation | Granola | Quad assessment methodology |
| 2026-06-19_ai-native-hiring-analytics-standard | Granola | AI-native hiring criterion |
| 2026-06-22_junior-hire-policy-remote-studio | Granola | Junior hire support structure for remote studios |
| granola_4005eb22 | Granola | Studio audit, seniority title inflation |
| granola_c3cc29b7 | Granola | Executive meeting, hiring pipeline governance |
| not_4nWBkRC4r7TVRQ_hiring_governance | Granola | Hiring pipeline minimum viable governance |
| not_ZLLEyCfuFCgGaT | Granola | Remote communication frameworks |
| not_ireYPwXIKrrsWd_scurve | Granola | S-curve change management |
| chatgpt_69034e5d | ChatGPT | Single producer failure pattern |
| chatgpt_691f13cd | ChatGPT | Mobile studio headcount plan (GBP 10M raise) |
| chatgpt_6911c9db | ChatGPT | Mobile studio headcount plan variant |
| web_2026-06-02_production_cost_scaling_trends | Web Research | Team size and cost escalation benchmarks |
