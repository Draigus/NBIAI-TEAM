---
source: granola
meeting_id: 75b9e64f-da87-4ece-a7c3-0dd3c13c4c62
title: "DS&A Weekly Status — Alpha Clarification, Telemetry Gaps"
date: 2026-03-26
participants: [Glen Pryer, Magnus Pryer, Ruan Pearce-Authers, Amir Didar, Stavros Kylakos]
domain: [client_delivery, data_analytics]
client: lighthouse_games
relevance: 7
novelty: 6
actionability: 6
---

# DS&A Weekly Status — Alpha Clarification, Telemetry Gaps

## Alpha Test Clarification
- Alpha is actually a controlled user research session: 64 players in Amsterdam lab, 2-hour guided playtime with partner recruitment. More like focus group than traditional alpha.
- Confusion between pre-alpha playtest and July alpha requirements.
- James confirmed need for full telemetry suite despite small test size — Tencent requires all systems as gate, even if unused.

## Telemetry Status
- Current telemetry events are incomplete stubs: all values zeroed out (empty strings, zeros), missing basic data like player IDs, timestamps.
- Only 3-5 core events required for Tencent. Production/engineering meeting scheduled to prioritise implementation.
- Ruan built DBT prototype, can only produce login counts currently.
- Need red/yellow/green status tracking in central telemetry spec.

## Marie (Tencent) Access
- Marie lacks Confluence and Lighthouse SSO access. James approved sharing Miro board with full feature mappings.
- Glen recommends caution until Justin call — standard practice keeps publishers out of day-to-day details.

## Team Communication
- Current standups are async text-based. Proposed: 30 min DS&A internal + 30 min with James. Weekly video sync replacing text updates.
- Magnus to send weekly status reports to James/Justin with priority red items at top.

## Intelligence Value
Alpha test is actually 64-person lab research (not large-scale alpha) — this reframes the data requirements significantly. Telemetry is in stub state with zeroed values — fundamental infrastructure gap. Marie/Tencent access boundaries need clarity from Justin.
