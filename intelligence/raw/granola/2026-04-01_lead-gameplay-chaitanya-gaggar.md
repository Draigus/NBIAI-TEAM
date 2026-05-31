---
source: granola
meeting_id: 3d7a6222-8b14-4556-8d73-c10e529f7f35
title: "Interview — Chaitanya Gaggar, Lead Gameplay Developer"
date: 2026-04-01
participants: [Glen Pryer, Jack Baxter, Chaitanya Gaggar]
domain: [hiring, engineering]
client: couch_heroes
relevance: 7
novelty: 7
actionability: 6
---

# Interview — Chaitanya Gaggar, Lead Gameplay Developer

## Candidate Profile
- Led gameplay engineering at Wargaming on third-person vehicle shooter. Built team from scratch to ~17-18 people.
- Owned: processes, Jira boards, team structure, Unreal conventions, GAS setup, character creation pipelines.
- Game cancelled mid-development; reassigned to Steel Hunters (released but failed to exit early access).
- Primary filter: team culture and project quality over title/comp.

## Technical Assessment — Strong

### GAS (Gameplay Ability System)
- Fast out-of-the-box setup. ~1.5 years to mature the library. Without discipline, duplicate abilities accumulate.
- Workflow: prototype in Blueprint, validate, convert to C++.

### Networking
- Strong default: server authoritative for all important calculations.
- For MMO: slower combat pace reduces need for aggressive client prediction.
- Core principle: "Almost never trust the client."
- Advocated strongly for nightly automated network tests to prevent late-discovery rubber-banding.

### Blueprint Philosophy
- Not allergic — considers them essential for designer prototyping. But no place as dominant layer in high-traffic MMO at scale.

### Designer Collaboration
- "Chase the intent, prototype early" — best two steps when designers bring expensive requests.

## Fit Signals
- Responded positively to Glen's direct communication style.
- Genuine and growing interest by end of call.
- Compensation explicitly deprioritised.
- Risk: came from two consecutive cancelled/failed projects; very selective about next move.

## Intelligence Value
Strong lead gameplay engineering candidate with directly applicable GAS/Unreal/networking experience and team-building track record. His emphasis on automated network testing and server authority aligns with CH's MMO requirements. Culture and project quality are his primary close levers, not comp.
