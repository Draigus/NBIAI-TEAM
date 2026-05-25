# Client Patterns -- Knowledge Bank

**Last compiled:** 2026-05-25
**Sources:** 5 ChatGPT extracts + 1 Claude extract (February 2025 -- April 2026)
**Role associations:** producer, gaming_practice_lead

---

## Executive Summary

This bank captures cross-client learnings from NBI's consulting engagements. Key patterns: NBI's advisory model combines hard consulting (production methodology, technical audit, monetisation strategy) with soft consulting (leadership coaching, communication, culture) in a single engagement. Pricing ranges from USD250-400/hr depending on service area, with fixed-fee project work at circa GBP9k per 2-3 week audit task. The three-artifact delivery pattern (Excel + Word + WorkSage) is the standard delivery format. Client engagements that blend technical and organisational scope land better than pure-play engagements. The MTX strategy SoW represents a new service line with strong demand from studios lacking console monetisation experience.

---

## Engagement Approaches That Worked

### Blended Hard + Soft Consulting

NBI's strongest engagement model combines technical assessment with organisational advisory in a single scope. The Couch Heroes initial SoW covered seven areas spanning production methodology (hard), technical GDD fit (hard), leadership behavioural friction (soft), communication pathways (soft), and role alignment (soft). This blended approach landed because studio problems are never purely technical or purely cultural -- they are entangled. [source: chatgpt_68821eb7]

### Diagnostic Before Prescription

Glen requested the CH production risk assessment as "problems only, no mitigations." This pattern -- deep diagnosis first, recommendations second -- builds client trust and prevents premature solutioning. The 15-risk assessment led directly to a multi-workstream engagement. [source: chatgpt_69034e5d, via client_couch_heroes bank]

### Evidence-Based Deliverables

Every consulting report must include an Evidence Table appendix mapping each non-obvious claim to source, date, confidence level, and identified gaps. Multi-role red teaming (Production + Engineering perspectives) is embedded in the writing process, not applied post-hoc. SoW reports use a 15-section C-level-consumable structure with acceptance tests mapped to contract clauses. [source: chatgpt_6907ec33]

### AI Adoption as a Service

NBI designed a two-lane AI adoption programme for a US government-adjacent consulting firm (NSI). Lane A (CUI/regulated) uses approved-only tools with US-only data residency; Lane B (non-CUI research) allows broader tooling after vetting. Controlled merge procedure between lanes with citation validation, Source Maps, and Claim Ledgers. The programme uses hypothesis-testing pilots rather than open-ended adoption. This demonstrates NBI's capability to sell AI operations expertise to non-gaming clients. [source: chatgpt_6972eb8d]

### Three-Artifact Delivery

Client engagements deliver three synchronised artifacts: Excel tracker (planning), Word document (execution guide), WorkSage (live tracking). The WorkSage Import sheet in Excel enables bulk import of project hierarchies. Deliverables do not contain NBI team member names -- they use role descriptions instead. [source: handoff_2026-04-21_goals_deliverables]

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

Rates were created February 2025 for brochure purposes with custom quoting for project-based work. They may have evolved since. [source: chatgpt_67ac97d7]

### Fixed-Fee Project Work

- **Tech stack/pipelines audit** (3 stakeholder sessions, 2-3 weeks): GBP9,240 fixed fee [source: chatgpt_69025031]
- **MVP tech roadmap/game fit audit** (3 stakeholder sessions, KPI tree, 15-20 slide readout, 2-3 weeks): GBP7,465.50 fixed fee [source: chatgpt_69025031]
- **Goals Studio pricing engagement:** 100K SEK / ~USD10K / ~116 hours [source: handoff_2026-04-21_goals_deliverables]

### MTX Strategy Scoping

MTX strategy consulting is scoped at approximately 4 weeks: 1 week discovery, 1 week research, 1-2 weeks frameworks/pricing. Eight workstreams covering discovery, market indexing, store architecture, attribute-offset policy, elasticity framework, sentiment/risk, KPI specification, and delivery kit. [source: chatgpt_68e3cfc8]

---

## Proposals That Won

### Structural Patterns

Proposals that converted share these elements:
1. **Clear in/out boundaries** anchored to contract clause references, not freeform scope descriptions [source: chatgpt_6907ec33]
2. **Measurable acceptance tests** with evidence requirements, not subjective quality assessments [source: chatgpt_69025031]
3. **Risk registers** with triggers and contingencies included in the proposal itself [source: chatgpt_69025031]
4. **Blended scope** combining technical and organisational workstreams [source: chatgpt_68821eb7]
5. **Key Personnel clause** protecting the client-advisor relationship [source: chatgpt_69025031]

### Acceptance Mechanics

Standard NBI acceptance: 5 Business Days to accept or provide consolidated (not iterative) non-conformity list. Contractor remediates in 5 Business Days. Payment 30 days from valid invoice after Acceptance. [source: chatgpt_69025031]

---

## Delivery Patterns

### Advisory Cadence

- Executive coaching: weekly 45-min 1:1, fortnightly 30-min sponsor sync, two live observations per month [source: chatgpt_68fa2c70, via client_couch_heroes bank]
- Stakeholder sessions: 3 per audit task is the standard pattern [source: chatgpt_69025031]
- Milestone staging: work assessed against single senior consultant capacity [source: chatgpt_69395da6, via client_couch_heroes bank]

### Communication

- Deliverables aimed at C-level must be consumable by non-technical executives
- Role descriptions replace individual names in all deliverables
- Evidence tables with provenance create audit trails the client can verify

---

## Common Client Challenges

### No Console Monetisation Experience

"No one on the client team had done MTX on console before." This is a common gap NBI addresses. Console-specific challenges include platform-specific pricing constraints, certification requirements (TRC/XR), and attribute-offset cosmetics that create pay-to-win perception risk. Price indexing for console requires manual research -- it is labour-intensive but high-value. [source: chatgpt_68e3cfc8]

### AI Adoption in Regulated Environments

Clients with compliance constraints (government work, CUI classification) need two-lane models separating regulated from non-regulated AI use. Default routing should be to the regulated lane until content is classified. "Sceptic-proof" design requires decision gates, evidence packs, and auditable workflows. [source: chatgpt_6972eb8d]

### Website Credibility Gap

B2B consulting websites commonly fail the "5-second clarity test" -- within 5 seconds, is it clear what the firm does, for whom, and why it is credible? Website audits should use a ten-dimension scoring rubric with evidence-based recommendations (page URL, location, issue, impact, recommendation with before/after copy). [source: chatgpt_6972eb79]

---

## What To Avoid

1. **Iterative feedback loops.** Consolidated single-round feedback is better than back-and-forth. The 5-day consolidated non-conformity list pattern prevents scope creep in acceptance. [source: chatgpt_69025031]
2. **Generic coaching plans.** Coaching must anchor to specific role arenas (roadmap trade-offs, partner negotiations, cross-discipline governance), not generic leadership development. [source: chatgpt_68fa2c70, via client_couch_heroes bank]
3. **Freeform scope descriptions.** Always anchor scope to contract clause references. [source: chatgpt_6907ec33]
4. **Fabricated citations in salary benchmarks.** Every external benchmark claim requires a real citation. Fabricated citations are unacceptable. [source: chatgpt_69698081, via production_methods bank]

---

## Open Questions

- **Optimal engagement length.** Fixed-fee 2-3 week tasks work at audit level. What is the right structure for longer advisory relationships (6+ months)?
- **Retainer model.** No retainer-based engagement data exists. How should ongoing advisory be priced?
- **Non-gaming client expansion.** The NSI AI adoption engagement proves NBI can sell outside gaming. What other non-gaming verticals can NBI serve?
- **Rate sheet currency.** Rates are in USD but CH engagement is in GBP. Need a consistent pricing framework that handles multi-currency work.
- **Win rate data.** No quantitative data on proposal win rates. How many proposals convert?

---

## Source Index

| Extract ID | Date | Key Topics |
|---|---|---|
| chatgpt_67ac97d7 | 2025-02-12 | NBI services catalogue, hourly rate sheet |
| chatgpt_68e3cfc8 | 2025-10-06 | MTX strategy SoW, console monetisation, attribute-offset cosmetics |
| chatgpt_6972eb79 | 2026-01-23 | Website UX audit methodology, 10-dimension rubric |
| chatgpt_6972eb8d | 2026-01-23 | Two-lane AI adoption programme, regulated environments |
| chatgpt_69025031 | 2025-10-29 | SoW pricing/acceptance (also in client_couch_heroes bank) |
| handoff_2026-04-21_goals_deliverables | 2026-04-21 | Three-artifact delivery pattern, Goals Studio engagement |
