---
source: granola
source_id: 1996f35b-c607-4b0e-b231-f7cc88a7f3d8
source_path: https://notes.granola.ai/d/1996f35b-c607-4b0e-b231-f7cc88a7f3d8
ingested: 2026-06-26
topics_detected: [contractor-compliance, day-rate, ir35, vacation-policy, legal-risk, hr-ops, hibob]
relevance_score: 9
novelty_score: 8
actionability_score: 9
bank_candidates: [production_methods, client_patterns]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Contractor Day Rate Model: Eliminating Vacation Billing Legal Risk

## Key Content

Studios with mixed contractor/FTE workforces risk employment classification claims when contractors invoice at a fixed monthly rate during vacation or sick leave. Paper trails in project management tools labelling contractor absence as "paid leave" constitute evidence in labour court (UK, Belgium, Spain, Germany). Fines: IR35 violations at ~£60K per incident; Spain contractor misclassification up to €55K already paid out once.

**The fix: gross-up day rate, remove vacation language entirely.**

- Calculate current monthly rate ÷ 22.5 working days = theoretical day rate
- Determine annual time-off allowance: ~19 personal days + ~8 bank holidays + ~9 studio closure days = ~36 days
- New expected working days per year: ~226 (262 minus 36)
- New day rate = new monthly rate ÷ ~18 working days
- New monthly rate is set so annual income remains equivalent at the expected working-day average
- Sick leave (~8 industry standard days) rolled into the same uplift
- Contractors invoice actual days worked; months with time off naturally reduce the invoice
- Soft cap of 20 days/month limits overwork; overtime above cap requires lead approval

**Language changes:**
- All leave labels in project management tools renamed from "vacation"/"paid leave" to "out of office"
- Contractors are "notifying" leads of unavailability, not "requesting approval" for leave
- No sick pay, no vacation pay, no parental leave clauses in contractor agreements

**Rollout approach:** pilot with 3 trusted contractors first to validate numbers and create internal champions; studio-wide rollout via live call, recorded and posted to Slack; key message: "We are not removing benefits -- we are reshaping how you receive them."

## Decisions / Insights

- Studio leadership decided: move all contractors from fixed monthly rate to day rate by 1st July; existing contracts to be repapered.
- Studio leadership concluded: framing matters -- do not say "you get paid more upfront"; say "your rate covers your time out of office; you bill for days worked."
- Studio leadership observed: recruiters incorrectly promising vacation coverage to contractor candidates is a compounding legal risk; interviewer scripts must be updated.
- Legal team flagged: continuity of service clauses are needed so contract interruptions require notification; crunch-period interruptions should be "discussed" not "approved" to avoid classification risk.

## Context

Operations meeting at a ~65-person live-service MMO studio. Participants: studio advisor (Glen), GC, Head of HR. Date: 2026-06-26. Corroborated by a separate contractor onboarding call the same day and a broader studio leadership sync on 2026-06-25. Named individuals and specific studio anonymised.

## Applicability

- Relevant when: a studio pays contractors at a fixed monthly rate and tracks their time off as "vacation" or "paid leave" -- the label alone creates labour court exposure.
- Relevant when: advising a studio expanding contractor headcount across multiple EU jurisdictions -- each country has its own threshold for deemed employment; Spain and UK are the highest-risk.
- Relevant when: a studio is introducing HRIS for the first time -- design separate contractor and FTE workflows from the outset; retrofitting is harder.
- Relevant when: a contractor asks about vacation or sick leave during interview -- the correct response is "your day rate accounts for time you won't be billing; we don't offer vacation."
- Relevant when: modelling contractor cost at budget stage -- day rate × expected working days per year is more accurate than monthly rate × 12.
