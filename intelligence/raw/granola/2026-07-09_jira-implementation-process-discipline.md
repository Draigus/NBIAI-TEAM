---
source: granola
source_id: dbe27ed2-54ea-445c-8530-bc145269a67c
source_path: https://notes.granola.ai/d/dbe27ed2-54ea-445c-8530-bc145269a67c
ingested: 2026-07-09
topics_detected: [jira, project-management, studio-operations, production-process, ideation-workflow]
relevance_score: 7
novelty_score: 6
actionability_score: 8
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# Jira Implementation Process Discipline: Structure Before Workflows

## Key Content

A studio implementing Jira for the first time established a set of governing principles to avoid common failure modes:

**Implementation sequence:**
1. Create projects, issue hierarchy, and default workflows (open / in progress / done)
2. Lock down real pipeline stages before reflecting them in Jira -- do not build Jira workflows from a pipeline that isn't yet finalised
3. Complex automation and approval chains deferred until pipelines are stable

**Ideation triage model:**
- Raw ideas never enter Jira directly -- they go to a separate queue (email alias or service request form)
- Production reviews the queue every 2-3 weeks
- Only validated ideas (feasibility assessed) move into Jira as research tickets
- Rejected ideas stay out; approved research tickets move to the main project via automation
- Goal: no giant backlog of unresolved scratch-pad tickets

**Process ownership:**
- Production owns the implementation; department leads give input on inconveniences, not decisions
- Risk mitigated: experienced Jira users often assume they know the "right" way -- production must set the rules
- Focus group model: mix of Jira veterans, novices, and lapsed users (up to 10 people) for early validation

**Velocity data note:** reliable velocity data is not available for approximately the first three months post-implementation. Plans that depend on velocity in this window carry elevated uncertainty.

**Meta-practice:** writing user stories for the Jira implementation itself -- captures features, success criteria, and automation flows; also models the same process the studio is learning for game dev.

## Decisions / Insights

- Studio CPO decided: structure before workflows -- projects and hierarchy first, automation after pipelines are stable.
- Studio CPO decided: raw ideas stay outside Jira; only validated ideas enter as tickets.
- Studio CPO decided: production owns the process, leads give input not decisions.
- Studio CPO observed: experienced Jira users are a governance risk -- they assume ownership of process design; production must hold the line.
- Studio production team observed: writing user stories for Jira setup models the process the team is learning for game dev -- learning multiplier.

## Context

Jira implementation kick-off meeting at a ~55-person game studio, July 2026. Studio migrating from ClickUp. Attendees: CPO, Jira administrator, producers, and one contractor scrum master/process lead. Multiple team members with prior Jira experience from different studios, creating governance risk.

## Applicability

- Relevant when: advising a studio on Jira adoption -- lead with structure before workflows; pipelines must be stable before they are reflected in tooling.
- Relevant when: a studio has an unmanageable Jira backlog -- diagnose whether raw ideas are entering the tool directly; introduce an external ideation queue.
- Relevant when: a client's Jira users from prior studios are pushing to own process design -- production must own the process; leads give input.
- Relevant when: a studio wants velocity data quickly after Jira adoption -- flag that velocity is unreliable for the first three months.
- Relevant when: a studio is introducing both a new process and new tooling simultaneously -- the user-story-for-the-tool meta-practice is a useful learning multiplier.
