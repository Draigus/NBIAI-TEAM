# Client Patterns -- Knowledge Bank

**Last compiled:** 2026-05-25
**Sources:** 17 extracts (5 ChatGPT, 1 Claude session, 11 OneDrive) -- February 2025 to May 2026
**Role associations:** producer, gaming_practice_lead

---

## Executive Summary

This bank captures cross-client learnings from NBI's consulting engagements with game studios. Key patterns: NBI's advisory model combines hard consulting (production methodology, technical audit, monetisation strategy) with soft consulting (leadership coaching, communication, culture) in a single engagement. Pricing ranges from USD250-400/hr for advisory, with fixed-fee project work at GBP7.5k-9.2k per 2-3 week audit task and major engagements at 100K SEK (~USD10K). The three-artifact delivery pattern (Excel + Word + WorkSage) is the standard format. NBI has proven two reusable engagement models: competitive pricing benchmarking for studios approaching launch, and leadership offsite facilitation for studios needing strategic alignment. The EAD (Eliminate, Automate, Delegate) framework is NBI's core methodology for AI operations consulting. Red team validation of research deliverables has matured into a scored, automated pipeline.

---

## Engagement Approaches That Worked

### Blended Hard + Soft Consulting

NBI's strongest engagement model combines technical assessment with organisational advisory in a single scope. The Couch Heroes initial SoW covered seven areas spanning production methodology (hard), technical GDD fit (hard), leadership behavioural friction (soft), communication pathways (soft), and role alignment (soft). This blended approach lands because studio problems are never purely technical or purely cultural -- they are entangled. [source: chatgpt_68821eb7]

### Diagnostic Before Prescription

Glen requested the CH production risk assessment as "problems only, no mitigations." This pattern -- deep diagnosis first, recommendations second -- builds client trust and prevents premature solutioning. The 15-risk assessment led directly to a multi-workstream engagement. [source: chatgpt_69034e5d]

### Evidence-Based Deliverables with Red Team Validation

Every consulting report must include an Evidence Table appendix mapping each non-obvious claim to source, date, confidence level, and identified gaps. Multi-role red teaming (Production + Engineering perspectives) is embedded in the writing process. SoW reports use a 15-section C-level-consumable structure with acceptance tests mapped to contract clauses. [source: chatgpt_6907ec33]

NBI's red team process scores deliverables across five weighted dimensions: claim accuracy 30% (highest), data collection 25%, normalisation quality 20%, citation verifiability 15%, analytical rigour 10%. The Goals competitive research started at 53/100 (FAIL) and was remediated to 93/100 (PASS) through automated verification scripts plus manual review. Key lesson: ~47% of initial research output had quality issues before validation. [source: goals_red_team_report_2026-04-21]

### Urgency-Window Proposal Framing

Frame proposals around the client's urgency window rather than NBI's capabilities. The Goals engagement was framed around a 6-week pre-launch window with Sony platform submission deadlines, creating natural urgency. Citing beta metrics creates pressure but must be verified -- the proposal cited 50% D1 retention on PlayStation, but actual data showed 34-36%. [source: goals_sow_proposal_2026-03-31]

### Separate Workstreams for Partial Buy-In

Price workstreams separately to allow partial client buy-in. Goals was offered two workstreams (WS1: Pricing Benchmarking at $17,500, WS2: Live Service Consulting at $45,440) plus an optional white paper ($2,500). The client signed WS1 only at 100K SEK. This pattern converts better than all-or-nothing proposals. [source: goals_sow_proposal_2026-03-31]

### AI Adoption as a Service

NBI designed a two-lane AI adoption programme for a US government-adjacent consulting firm. Lane A (CUI/regulated) uses approved-only tools; Lane B (non-CUI research) allows broader tooling after vetting. This demonstrates NBI's capability to sell AI operations expertise to non-gaming clients. [source: chatgpt_6972eb8d]

### EAD Framework as Consulting Methodology

NBI's proprietary EAD (Eliminate, Automate, Delegate) framework is applied in strict order. Eliminate first (kill criteria: if stopping for two weeks goes unnoticed), then Automate (data transformation, status aggregation, threshold monitoring), then Delegate (match to capability tier including AI routine and AI supervised). The key anti-pattern is "automating before eliminating" -- building sophistication around waste. [source: nbi_ead_framework_2026-05-15]

### Three-Artifact Delivery

Client engagements deliver three synchronised artifacts: Excel tracker (planning), Word document (execution guide), WorkSage (live tracking). The WorkSage Import sheet in Excel enables bulk import of project hierarchies. Deliverables do not contain NBI team member names -- they use role descriptions instead. [source: handoff_2026-04-21_goals_deliverables]

### Leadership Offsite Facilitation

NBI has developed a reusable 3-day offsite methodology for game studio leadership. Pre-decisions are laid down before the offsite to prevent relitigating in the room. Person-specific facilitation strategies address known attendee behaviours. Six rules verbally committed individually. Daily energy scoring. Three wall artifacts (parking lot, decisions log, risks log). North star printed on wall. The facilitation playbook is for the facilitator's eyes only. [source: ch_offsite_agenda_2026-04-27, ch_offsite_working_doc_2026-04-27, ch_offsite_pre_read_2026-04-27]

---

## Pricing That Landed

### Hourly Rate Sheet (USD)

| Service Area | Hourly Rate |
|---|---|
| Operational Efficiency | USD250 |
| Game Design Consulting | USD275 |
| UX and Player Research | USD275 |
| LiveOps and GaaS Strategy | USD275 |
| Market Research and Analysis | USD300 |
| Monetisation Consulting | USD325 |
| AI and Data Strategy | USD350 |
| Corporate Strategy | USD400 |

Rates created February 2025 for brochure purposes with custom quoting for project-based work. [source: chatgpt_67ac97d7]

### Fixed-Fee Project Work

| Engagement | Fee | Scope | Duration |
|---|---|---|---|
| Tech stack/pipelines audit | GBP9,240 | 3 stakeholder sessions | 2-3 weeks |
| MVP tech roadmap/game fit audit | GBP7,465.50 | 3 sessions, KPI tree, 15-20 slide readout | 2-3 weeks |
| Goals pricing benchmarking | 100K SEK (~USD10K) | Competitive analysis, regional pricing, platform guidance | ~116 hours |
| Goals live service consulting (offered, not taken) | USD45,440 | Content cadence, A/B playbook, 90-day simulation | ~4 weeks |

[source: chatgpt_69025031, goals_sow_proposal_2026-03-31]

### Payment Terms

Standard: 30% upfront, remainder on deliverable acceptance. Acceptance: 5 Business Days to accept or provide consolidated (not iterative) non-conformity list. Contractor remediates in 5 Business Days. Payment 30 days from valid invoice after Acceptance. [source: chatgpt_69025031, goals_sow_proposal_2026-03-31]

---

## Proposals That Won

### Structural Patterns

Proposals that converted share these elements:
1. **Clear in/out boundaries** anchored to contract clause references [source: chatgpt_6907ec33]
2. **Measurable acceptance tests** with evidence requirements [source: chatgpt_69025031]
3. **Risk registers** with triggers and contingencies included [source: chatgpt_69025031]
4. **Blended scope** combining technical and organisational workstreams [source: chatgpt_68821eb7]
5. **Key Personnel clause** protecting the client-advisor relationship [source: chatgpt_69025031]
6. **Separate workstreams** allowing partial buy-in [source: goals_sow_proposal_2026-03-31]
7. **Urgency framing** tied to client deadlines (launch dates, platform submissions) [source: goals_sow_proposal_2026-03-31]

### "Embed and Align" Positioning

NBI differentiates from report-only consultancies by positioning as "Embed and Align" -- NBI works inside the client's process, not outside it delivering documents. [source: goals_sow_proposal_2026-03-31]

---

## Delivery Patterns

### Advisory Cadence

- Executive coaching: weekly 45-min 1:1, fortnightly 30-min sponsor sync, two live observations per month [source: chatgpt_68fa2c70]
- Stakeholder sessions: 3 per audit task is the standard pattern [source: chatgpt_69025031]
- Milestone staging: work assessed against single senior consultant capacity [source: chatgpt_69395da6]
- Leadership offsites: 3-day format with pre-decisions, pre-read, daily energy scoring [source: ch_offsite_agenda_2026-04-27]

### Client-Branded Deliverables

Client dashboards receive bespoke design systems, not NBI's default palette. Lighthouse Games received a magenta/blue/pink cinematic automotive theme with dark-first design. This demonstrates NBI's capability to deliver visually distinct analytics tools per client. [source: lighthouse_design_system]

### Community Sentiment as Input

Beta community sentiment data (509 respondents for Goals) feeds directly into pricing strategy, LiveOps priorities, and feature roadmap recommendations. Multi-signal analysis (upvotes + survey + community posts) provides stronger prioritisation than any single input. [source: goals_beta_community_sentiment]

---

## Common Client Challenges

### No Console Monetisation Experience

A common gap NBI addresses. Console-specific challenges include platform-specific pricing constraints, certification requirements (TRC/XR), and attribute-offset cosmetics creating pay-to-win perception risk. Price indexing for console requires manual research. [source: chatgpt_68e3cfc8]

### Anti-P2W Sentiment as Hard Constraint

Community sentiment data shows anti-P2W is the hardest red line -- any move toward paid competitive advantage triggers immediate churn. This must be treated as a binding constraint in all monetisation advisory, not a design preference. [source: goals_beta_community_sentiment]

### Studios Running on Momentum Not Cadence

The diagnosis "running on momentum more than on cadence" appears across multiple clients. Studios default to excitement-driven work rather than structured delivery. The offsite format exists specifically to counter this pattern. [source: ch_offsite_pre_read_2026-04-27]

### AI Adoption in Regulated Environments

Clients with compliance constraints need two-lane models separating regulated from non-regulated AI use. "Sceptic-proof" design requires decision gates, evidence packs, and auditable workflows. [source: chatgpt_6972eb8d]

### Website Credibility Gap

B2B consulting websites commonly fail the "5-second clarity test." Website audits use a ten-dimension scoring rubric with evidence-based recommendations. [source: chatgpt_6972eb79]

---

## What To Avoid

1. **Iterative feedback loops.** Consolidated single-round feedback is better than back-and-forth. [source: chatgpt_69025031]
2. **Generic coaching plans.** Coaching must anchor to specific role arenas, not generic leadership development. [source: chatgpt_68fa2c70]
3. **Freeform scope descriptions.** Always anchor scope to contract clause references. [source: chatgpt_6907ec33]
4. **Fabricated citations in deliverables.** Every benchmark claim requires a real citation. [source: chatgpt_69698081]
5. **Unverified beta metrics in proposals.** Goals proposal cited 50% D1 retention; actual was 34-36%. [source: goals_sow_proposal_2026-03-31]
6. **Automating before eliminating.** EAD order is strict: Eliminate first. [source: nbi_ead_framework_2026-05-15]
7. **Delivering research without red team validation.** Initial research output has ~47% quality issues. [source: goals_red_team_report_2026-04-21]

---

## Open Questions

- **Optimal engagement length.** Fixed-fee 2-3 week tasks work at audit level. What is the right structure for 6+ month advisory?
- **Retainer model.** No retainer-based engagement data exists.
- **Non-gaming client expansion.** AI adoption engagement proves NBI can sell outside gaming. What other verticals?
- **Rate sheet currency.** Rates in USD but engagements in GBP and SEK. Multi-currency framework needed.
- **Win rate data.** No quantitative data on proposal win rates.
- **Offsite outcomes.** The 3-day format is documented but delivery outcomes (did the roadmap hold? did gates work?) are not tracked yet.
- **LiveOps consulting delivery patterns.** WS2 was offered but not taken. No delivery outcome data exists for live service advisory.

---

## Source Index

| Extract ID | Date | Key Topics |
|---|---|---|
| chatgpt_67ac97d7 | 2025-02-12 | NBI services catalogue, hourly rate sheet |
| chatgpt_68e3cfc8 | 2025-10-06 | MTX strategy SoW, console monetisation |
| chatgpt_6972eb79 | 2026-01-23 | Website UX audit methodology |
| chatgpt_6972eb8d | 2026-01-23 | Two-lane AI adoption programme |
| chatgpt_69025031 | 2025-10-29 | SoW pricing/acceptance terms |
| handoff_2026-04-21_goals_deliverables | 2026-04-21 | Three-artifact delivery pattern |
| goals_sow_proposal_2026-03-31 | 2026-03-31 | Goals SoW, urgency framing, partial buy-in |
| goals_competitive_mtx_findings_2026-04-21 | 2026-04-21 | F2P pricing benchmarks, 315 data points |
| goals_red_team_report_2026-04-21 | 2026-04-21 | Red team validation methodology |
| ch_offsite_agenda_2026-04-27 | 2026-04-27 | 3-day offsite methodology |
| ch_offsite_working_doc_2026-04-27 | 2026-04-27 | Facilitation playbook |
| ch_offsite_pre_read_2026-04-27 | 2026-04-27 | Pre-read communication template |
| ch_offsite_pre_decisions_2026-04-27 | 2026-04-27 | Pre-decision format for offsites |
| nbi_ead_framework_2026-05-15 | 2026-05-15 | EAD framework methodology |
| goals_beta_community_sentiment | 2026-03-26 | Community sentiment as input |
| goals_release_liveops_2026-04 | 2026-04 | LiveOps roadmap with KPI targets |
| lighthouse_design_system | 2026-05-25 | Client-branded design systems |
