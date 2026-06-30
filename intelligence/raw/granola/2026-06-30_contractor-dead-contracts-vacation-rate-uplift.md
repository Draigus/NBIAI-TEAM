---
source: granola
source_id: 180c56f0-5025-4c38-bdaf-c8e27f99c745
source_path: https://notes.granola.ai/d/180c56f0-5025-4c38-bdaf-c8e27f99c745
ingested: 2026-06-30
topics_detected: [contractor-policy, employment-law, ir35, vacation, contracts, legal-risk]
relevance_score: 8
novelty_score: 8
actionability_score: 9
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Contractor Policy: Dead Contracts and Vacation Rate-Uplift Model

## Key Content

Two contractor policy mechanisms for game studios operating in multi-jurisdiction environments (UK, Germany, Netherlands, Cyprus/Greece, US).

**Dead contracts policy:**
- Active but unperformed contracts ("dead contracts") must be closed immediately -- never left open
- Risk: leaving a live contract open during a period of non-performance can be construed as placing a contractor on leave
- In UK, Germany, Netherlands, US: treating a contractor as an employee triggers back-pay liability
- Labour courts actively fine for this; fines run approximately €60,000 per incident (equivalent to a full headcount year)
- Closure is always "without prejudice" (amicable, no negative inference) unless there is misconduct or non-delivery ("with prejudice")
- Policy applies equally to all contractors regardless of reason for non-performance (military service, personal leave, illness)

**Contractor vacation rate-uplift model:**
- Contractors must not be given paid leave or vacation accrual -- this signals employer-employee relationship
- Solution: slight rate uplift (e.g. +€2.50/hour) baked into the day rate to act as a self-funded vacation buffer
- Contractor invoices only for weeks worked; the uplift accumulates as their own personal time-off fund
- Avoids any "employer granting leave" interpretation in labour court across all covered jurisdictions
- Companion policy: contractors use a separate contractor notification form for time away, not the FTE leave process

**Company handbook risk:**
- Contractor contracts should reference a specific version of the company handbook at signing
- Subsequent handbook updates do not automatically bind the contractor
- Linking to a Confluence guide (not an employee handbook) reduces risk of accidental employee classification

**UK Skilled Worker Visa threshold (2026):**
- Minimum salary: £41,700/year for Skilled Worker Visa eligibility
- Below this threshold: visa automatically denied regardless of company intent
- Exception: PhD holders qualify at ~£37,000
- Relocation support as FTE: ~£10,000 company cost; employee receives ~£8,000 (HMRC taxes amounts above £8,000)

## Decisions / Insights

- Studio advisor decided: all active-but-unperformed contracts must be closed immediately; no exceptions for sympathetic circumstances.
- Studio advisor concluded: the "on leave" interpretation of a live unperformed contract is the IR35-adjacent risk vector in UK, Germany, Netherlands, and US -- not just a UK problem.
- Studio advisor decided: contractor vacation must be handled via rate uplift, not leave policy -- this is the clean architectural fix that withstands labour court scrutiny across all target jurisdictions.
- Studio advisor observed: company handbook linkage in contractor contracts must specify the version at signing; auto-bind to all future updates is a constructive employment indicator.

## Context

1:1 between studio advisor (Glen) and a contractor at a ~65-person live-service MMO studio with operations across UK, Cyprus, and Greece, Jun 29 2026. Contractor had taken a period of military service. Named individual and specific studio anonymised.

## Applicability

- Relevant when: advising a studio with contractors in UK, Germany, Netherlands, or US on what happens to live contracts during extended absence -- close them without prejudice immediately.
- Relevant when: a studio is designing its contractor policy and has been granting paid leave to contractors -- the rate-uplift model is the replacement that withstands labour court scrutiny.
- Relevant when: a studio is expanding to Greece or Cyprus and needs to understand UK visa thresholds for potential team relocations -- £41,700 minimum is the hard floor.
- Relevant when: a studio's contractor agreements reference the company handbook without versioning -- this is a constructive employment indicator that should be fixed before an IR35 review.
