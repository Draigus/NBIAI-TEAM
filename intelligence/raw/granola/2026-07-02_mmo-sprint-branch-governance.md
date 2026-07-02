---
source: granola
source_id: 3d82f38f-4872-4964-bab2-4a00ab55a648
source_path: https://notes.granola.ai/d/3d82f38f-4872-4964-bab2-4a00ab55a648
ingested: 2026-07-02
topics_detected: [version-control, branching-strategy, sprint-branches, mmo-development, unreal-engine, qa-gate]
relevance_score: 8
novelty_score: 8
actionability_score: 9
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: decision
---

# Sprint-Branch Governance for Large-Team MMO Development

## Key Content

A branching strategy for a ~65-person MMO studio with 69 features in vertical slice scope, where feature branches are unmanageable at current team maturity.

**Branch flow:**
- Sprint branch → QA branch → main (last known good)
- Daily build = current Sprint build
- Sprint branch merges back into dev at end of Sprint; clean items promoted to main
- Nothing merges to main until QA team approves

**Why sprint branches over feature branches:**
- 69 features in scope: feature branches create unmanageable proliferation at this team size and maturity
- Cross-team contributors would need to track 3-4 active feature branches simultaneously
- Feature branches viable only when teams are fully aligned to features (feature team model); not viable with cross-team contributors

**Governance rules:**
- New branches require Product Council sign-off -- prevents ad hoc branch sprawl
- Backend changes that break last known good must notify the senior producer for risk communication to stakeholders before merging
- QA to smoke-test last known good periodically (monthly or bi-monthly) to catch regressions from branch promotions

**Engine version lock:**
- Locked at Unreal Engine 5.8
- No upgrade to UE6: UE6 deprecates the C++ layer, removes blueprints without a clear replacement
- Rationale: not willing to retrain half the team on a new language mid-MMO development
- Decision communicated studio-wide

**Asset management:** Helix DAM (Perforce product) identified for art asset repositories; under evaluation for whether it is already covered by existing Perforce subscription.

## Decisions / Insights

- Glen decided: sprint branches over feature branches for the vertical slice given 69 features in scope and current team maturity level.
- Glen decided: all new branches require Product Council sign-off -- branch creation is a governed decision, not an individual developer decision.
- Glen decided: Unreal Engine locked at 5.8; no UE6 upgrade during MMO development due to C++ deprecation and blueprint removal risk.
- Glen observed: feature branches are viable in a feature-team model but not in a cross-team contributor model where individuals contribute to multiple workstreams.

## Context

Meeting between NBI senior advisor and CH Engineering leadership at a ~65-person MMO studio, early July 2026. Note dated Jul 6 in Granola; content relates to vertical slice branching decisions. Attended by engineering lead, EP, and senior advisor. Context: establishing branch governance before the VS estimation lock.

## Applicability

- Relevant when: a studio is deciding between sprint branches and feature branches -- the team maturity and cross-team contributor model are the key variables, not the number of features in scope alone.
- Relevant when: ad hoc branch sprawl is occurring in a large team -- requiring Product Council sign-off for new branches is a lightweight governance gate that prevents proliferation without blocking work.
- Relevant when: an engine version upgrade is being considered mid-production on an MMO -- the C++ deprecation risk in UE6 is a concrete technical argument for deferring the upgrade.
- Relevant when: backend merges are regularly breaking the last known good -- separating the QA branch from main and requiring QA approval before promotion fixes this at the process level.
