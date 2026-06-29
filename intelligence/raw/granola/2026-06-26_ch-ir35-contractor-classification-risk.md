---
source: granola
source_id: 4df4fb05-9d0d-432c-b270-4498f84b6c6e
source_path: https://notes.granola.ai/d/4df4fb05-9d0d-432c-b270-4498f84b6c6e
ingested: 2026-06-26
topics_detected: [ir35, contractor-compliance, employment-classification, legal-risk, hr-ops, holiday-pay]
relevance_score: 9
novelty_score: 6
actionability_score: 9
bank_candidates: [production_methods, client_patterns]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: insight
---

# IR35 Contractor Classification Risk: What Studios Get Wrong

## Key Content

A ~65-person international game studio discovered it had been paying contractors for holiday, maternity, and bereavement leave -- all legally prohibited for genuine contractors under UK IR35 rules. Each violation carries a fine of ~£60K. Two separate violation types were identified for a single contractor, creating ~£120K exposure.

**Root causes:**
- Recruiters made verbal promises about leave entitlements during the hiring process without understanding contractor law
- HR systems tracked absence under labels such as "vacation" and "paid leave" -- these labels constitute evidence in an employment tribunal
- Studio absorbed the financial cost of a previous settlement (paid out to avoid tribunal) rather than changing the underlying practice

**What constitutes misclassification evidence:**
- Tracking contractor absences as "paid leave" or "vacation" in any system (ClickUp, HiBob, Jira, spreadsheet)
- Offering or paying holiday pay, sick pay, maternity pay, or bereavement leave to contractors
- Approval workflows where contractors "request" leave (implies employer control)
- Promising vacation coverage during the recruitment process

**The legal distinctions that matter:**
- Contractors "inform" their lead of unavailability; they do not "request" approval for leave
- No sick pay, no holiday pay, no parental leave in any contractor agreement
- Special circumstances (personal crises, extended absence) go directly to a director -- there is no policy entitlement to grant
- Continuity of service clauses rather than notice period language protect the studio without implying employment

**Jurisdiction note:** IR35 fines apply per incident in the UK; equivalent exposure exists in Belgium, Spain (up to €55K), and Germany under their own employment classification regimes. A studio with contractors across multiple EU countries has multiple simultaneous exposure points.

## Decisions / Insights

- Studio leadership decided: all contractor agreements to be repapered to remove vacation and sick leave clauses; effective date 1st July.
- Studio leadership concluded: the cost of repairing prior misclassification (settlement + legal fees) significantly exceeded the cost of restructuring the pay model upfront.
- Studio advisor concluded: recruiters must be briefed before every hiring campaign -- their verbal promises in interviews create legal obligations the studio cannot easily disclaim.
- Studio leadership observed: the correct response to "do you offer vacation?" in a contractor interview is "your rate is structured to cover time you won't be billing; we do not offer vacation" -- never use the word "offer."

## Context

Product Council meeting at a ~65-person live-service MMO studio; corroborated by a 1:1 meeting with the Art Director the same day. Date: 2026-06-25 to 2026-06-26. The studio had a mixed contractor/FTE workforce across UK, Cyprus, Spain, Belgium, and other EU jurisdictions. Named individuals and specific studio anonymised.

## Applicability

- Relevant when: advising a studio with a contractor-heavy workforce -- audit whether any contractor is receiving holiday pay, sick pay, or maternity pay; each is a separate IR35 violation in the UK.
- Relevant when: a studio is onboarding a new HR system -- design contractor workflows as "out of office notification" not "leave request" from day one.
- Relevant when: a contractor asks about leave entitlements during recruitment -- the recruiter must have a scripted response; verbal promises made in interview are binding.
- Relevant when: a studio is expanding internationally with contractors in multiple EU jurisdictions -- each country has its own employment classification threshold; a legal review per country is required before the first contractor in that jurisdiction.
- Relevant when: a client studio has already paid out to settle a contractor misclassification claim -- surface the systemic risk; a single settlement usually signals more exposure in the same contractor population.
