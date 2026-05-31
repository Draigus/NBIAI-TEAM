---
source: granola
meeting_id: 694645dc-ad0e-4ce7-896b-11733c26b108
title: "Ruan Dashboard Test & Lighthouse James Update"
date: 2026-04-08
participants: [Glen Pryer, Hannah Pickard, Ruan Pearce-Authers]
domain: [product, client_delivery, people_management]
client: [nbi, lighthouse_games]
relevance: 7
novelty: 6
actionability: 6
---

# Ruan Dashboard Test & Lighthouse James Update

## NBI Dashboard Demo & Bugs
- Glen built PostgreSQL-backed PM dashboard over Easter weekend. Covers clients, people, portfolio, tasks, workload, leads, expenses, finances.
- Role-based visibility (e.g. Ruan can't see finance page; expenses scoped per user).
- OCR on receipt uploads auto-populates expense reports, notifies Tom for payment.
- Goal: transition off Microsoft Teams/Planner by end of week.

### Bugs Found
- CSP blocking exchange rate API calls from api.frankfurter.dev — broke initial page load.
- api/sync/load returning 403 for non-admin users — fixed mid-call.
- Bug report feature confirmed working via in-app report button.

## Lighthouse / James Update (from Ruan)
- James back after ~a week of COVID — had been largely MIA without communicating why.
- James wants work to go faster; Ruan's view: infrastructure essentially done, bottleneck is client implementation.
- Justin independently asking multiple people for appraisals on James. Feedback aligns: low visibility/communication.
- Client-side backend teams solid but need more push on data delivery. Showing "classic AAA box product" habits.

## Intelligence Value
Documents early NBI Dashboard production testing and first real user bugs. James performance concerns now corroborated by Ruan independently — Justin actively collecting feedback.
