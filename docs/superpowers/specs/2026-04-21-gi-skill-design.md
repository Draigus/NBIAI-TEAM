# Spec: `/gi` — Game Investment Skill

**Date:** 2026-04-21
**Status:** Design approved, pending implementation
**Owner:** Glen Pryer

---

## Purpose

A comprehensive skill for game investment analysis. Serves both directions: helping game studios build fundraising materials (pitch decks, forecasts, market briefs) AND evaluating studios as investment targets (due diligence, valuation, red flags).

Invoked as `/gi` in Claude Code.

---

## Architecture: Three Layers

```
.claude/skills/gi/SKILL.md        <- Main skill (methodology + templates + orchestration)
.claude/skills/gi/benchmarks.md   <- Layer 1 data (separate file, loaded on demand)
```

**Layer 1 — Knowledge Base** (`benchmarks.md`): Baked-in market data, segmented by platform and game type. Refreshed via Pulse Check every run.

**Layer 2 — Frameworks** (in SKILL.md): Analytical methodologies applied to the specific studio/game.

**Layer 3 — Deliverable Templates** (in SKILL.md): Output structures for each deliverable type.

---

## Intake Protocol

When `/gi` fires, ask these four questions before proceeding:

1. **Direction** — Are we helping a studio raise, or evaluating one for investment?
2. **Game model** — What's the game? F2P mobile / F2P PC-console / premium / hybrid / live-service?
3. **Stage** — Concept / prototype / soft-launch / live Year 1 / mature Year 2+?
4. **Deliverable** — What are we building? (pitch deck / forecast model / market brief / comp table / data room / due diligence report / full package)

Then check for **Prior Art** — search the project directory for existing work on this client/studio. Don't start from scratch if there's context available.

Then run the **Pulse Check** before any analysis begins.

---

## Layer 1: Knowledge Base (benchmarks.md)

Thirteen data categories, each segmented by platform and game type. Every number must be specific (not ranges-of-ranges), tagged to its segment, and sourced.

### Categories

| # | Category | Contents | Segmented by |
|---|---|---|---|
| 1 | Market sizing | Global gaming revenue, growth rates, platform share | Mobile / PC / Console / Cloud |
| 2 | Revenue multiples | What studios trade at (M&A and funding rounds) | Platform, model (F2P/premium), stage, profitability |
| 3 | Retention benchmarks | D1, D7, D30, D90 | Platform, genre (RPG, puzzle, shooter, strategy, etc.) |
| 4 | Monetisation benchmarks | ARPDAU, ARPPU, conversion rate, LTV | Platform, genre, model |
| 5 | Engagement benchmarks | DAU/MAU, session length, sessions/day | Platform, genre |
| 6 | UA cost benchmarks | CPI, CPA, payback period | Platform, genre, geography |
| 7 | Comparable transactions | Recent gaming M&A, funding rounds with deal terms | Platform, model, deal type, size band |
| 8 | Development cost benchmarks | Build cost by game type and scope | Platform, genre, team size |
| 9 | Geographic market data | Market size, growth, player behaviour, regulatory landscape by region | China / Japan-Korea / SEA / Western / MENA / LATAM |
| 10 | Platform economics | Revenue share, payment processing, net revenue calculations | Apple / Google / Steam / Epic / Console / Direct |
| 11 | Lifecycle revenue curves | How title revenue evolves Year 1, 2, 3+; first-week/month shapes | Platform, model, genre |
| 12 | Seasonality patterns | Q4 spikes, content-drop multipliers, holiday effects, weekly patterns | Platform, genre |
| 13 | Studio unit economics | Burn rate, revenue per head, typical team sizes, overhead ratios | Platform, genre, geography, studio stage |

### Data Quality Rules

- Every number must cite its source (publication, date)
- No generic "the gaming market is $X" without segment context
- Prefer primary sources (Newzoo, Sensor Tower, data.ai, IDC, PitchBook, Crunchbase) over secondary
- When multiple sources conflict, note the range and flag which is most reliable
- Mark any number older than 12 months as "aging — verify on pulse check"

---

## Layer 2: Frameworks

Five analytical frameworks. Each takes Layer 1 data and applies it to the specific engagement.

### Framework 1: AERM Funnel Analysis

Map the studio's performance against benchmarks at each funnel stage:

| Stage | What it answers | Key metrics |
|---|---|---|
| **Acquisition** | How does this game get players? At what cost? How does that compare? | CPI/CPA, organic %, channel mix, virality coefficient, UA efficiency |
| **Engagement** | Once in, how deeply do they play? | DAU/MAU, session length, sessions/day, feature adoption, social features usage |
| **Retention** | How long do they stay? Where's the drop-off? | D1/D7/D30/D90 curves, cohort decay shape, reactivation rate |
| **Monetisation** | How effectively does engagement convert to revenue? | ARPDAU, ARPPU, conversion rate, LTV, whale concentration, ARPU by cohort age |

**Output:** AERM scorecard — each stage rated against segment benchmarks (below par / at par / above par), with specific numbers and the gap to median.

### Framework 2: Cohort-Based LTV Modelling

1. Build retention curve from actuals (or assume from Layer 1 benchmarks if pre-launch)
2. Layer monetisation rate onto surviving cohort at each time step
3. Calculate LTV at D30, D90, D180, D365
4. Compare LTV to CPI — derive payback period
5. Project forward: what LTV looks like under improvement scenarios (+10%, +20% retention)
6. Segment by acquisition channel if data available (organic LTV vs. paid LTV)

**Output:** LTV model with payback period, sensitivity table, and comparison to segment benchmarks.

### Framework 3: TAM/SAM/SOM Sizing

- **TAM** = total addressable market for this platform + model (from Layer 1 market sizing, Category 1)
- **SAM** = serviceable portion (genre + geography + monetisation model filter)
- **SOM** = realistic obtainable share based on studio capability, competition density, UA budget
- **Always size both ways:**
  - Top-down: market share % of SAM
  - Bottom-up: projected DAU x ARPDAU x 365
- **Reconcile:** if top-down and bottom-up diverge by >2x, flag it and explain the gap

**Output:** TAM/SAM/SOM table with both methodologies, reconciliation note.

### Framework 4: Comparable Transaction Analysis

1. Filter Layer 1 comp table (Category 7) by: platform, model, stage, revenue band
2. Identify 3-8 most relevant comps — explain selection rationale for each
3. Calculate implied multiples (EV/Revenue, EV/EBITDA, EV/DAU for pre-revenue)
4. Derive valuation range for the target studio
5. Note any significant differences between comps and target (geography, team size, IP ownership)

**Output:** Comp table with multiples, selection rationale, derived valuation range with confidence commentary.

### Framework 5: Lifecycle Revenue Projection

1. Select matched lifecycle curve from Layer 1 (Category 11)
2. Apply seasonality patterns (Category 12)
3. Model content-drop uplift vs. natural decay
4. Layer UA investment scenarios (scale up, maintain, scale down)
5. Project Year 1, Year 2, Year 3 revenue shape
6. **Stress test:** what if retention is 20% worse? UA costs rise 30%? Conversion drops 25%?

**Output:** Multi-year revenue projection with base/bull/bear scenarios, key assumptions table, sensitivity analysis.

---

## Layer 3: Deliverable Templates

The intake determines which template(s) to produce. Multiple can be combined for "full package."

### Market Brief

1. Executive summary (2-3 paragraphs: opportunity thesis)
2. Market sizing (TAM/SAM/SOM with both methodologies)
3. Segment deep-dive (the specific niche this game operates in)
4. Competitive landscape (direct competitors, their traction, white space)
5. Trend analysis (where the segment is heading, tailwinds/headwinds)
6. Opportunity thesis (why now, why this team, why this game)

### Pitch Deck Outline

Slide-by-slide structure with data points per slide:

1. **Problem** — what players lack, market gap
2. **Market** — TAM/SAM/SOM from Framework 3
3. **Solution/Game** — the product, its hook, its differentiation
4. **Traction** — current metrics mapped to AERM, benchmarked
5. **Business model** — monetisation strategy, unit economics
6. **Financial projections** — from Framework 5 (base case)
7. **Comps & valuation** — from Framework 4
8. **Team** — relevant experience, track record
9. **The ask** — amount, use of funds, milestones to next round

### Forecast Model

1. Assumptions table (all inputs explicit, sourced, adjustable)
2. Cohort projections: new users/month x retention curve = DAU trajectory
3. Revenue build: DAU x monetisation rate x ARPDAU = monthly revenue
4. UA spend: target DAU x CPI = monthly acquisition cost
5. Payback analysis: LTV vs. CPI by channel
6. P&L projection: revenue - COGS - UA - opex = contribution margin
7. Sensitivity analysis: key variable stress tests

### Comp Table

For each comparable (5-8 entries):
- Company/studio name
- Game title(s)
- Platform and model
- Deal type (M&A / Series A / B / C / IPO)
- Date
- Deal size / valuation
- Implied revenue multiple (or DAU multiple if pre-revenue)
- Relevance to target (why this comp was selected)
- Key differences from target

### Data Room Checklist

Organised by section:
- **Corporate:** incorporation docs, cap table, shareholder agreements, board minutes
- **Financial:** P&L (3yr if available), balance sheet, cash flow, bank statements, tax returns
- **Product metrics:** DAU/MAU history, retention curves, LTV analysis, ARPDAU trends, UA spend history
- **Team:** org chart, key bios, employment contracts, vesting schedules
- **Legal:** IP ownership, platform agreements, privacy compliance, content licences
- **Technology:** architecture overview, infrastructure costs, scalability assessment

### Due Diligence Report

1. **AERM Scorecard** — Framework 1 output, benchmarked
2. **Financial analysis** — Framework 2 (LTV) + Framework 5 (projections)
3. **Market position** — Framework 3 (TAM/SAM/SOM) + competitive landscape
4. **Valuation assessment** — Framework 4 (comps) + derived range
5. **Red flags** — anything that concerns (see Anti-Patterns below)
6. **Strengths** — where the studio outperforms benchmarks
7. **Recommendation** — invest / pass / conditional (with conditions)

---

## Pulse Check Protocol

Runs at the start of every `/gi` invocation, after intake:

1. **Search queries:** Execute web searches for:
   - "[platform] [game type] market size 2025 2026"
   - "[platform] gaming revenue multiples 2025 2026"
   - "gaming M&A deals 2025 2026"
   - "[platform] [genre] retention benchmarks 2025"
   - "[platform] CPI cost per install 2025 2026"
2. **Compare:** Check findings against baked-in Layer 1 numbers
3. **Flag:** If delta > 15% on any key metric, highlight it and use the fresher number for this run
4. **Cite:** Every external source used must include: publication name, date, URL
5. **Staleness warning:** Any baked-in number that couldn't be verified gets flagged as "unverified — use with caution"

---

## Red Flags & Anti-Patterns

Common mistakes this skill must actively prevent:

| Anti-Pattern | What goes wrong | How to prevent |
|---|---|---|
| **Global TAM for niche game** | Claiming $200B market for a mobile puzzle game | Always filter to SAM; call out if SOM < 0.1% of TAM |
| **Gross vs. net confusion** | Showing revenue before platform fees (30%) as if it's the studio's money | Always clarify gross vs. net; use net for all projections |
| **Soft-launch extrapolation** | Using geo-limited soft-launch DAU to project global performance | Flag data source; apply geo-scaling factors; note confidence level |
| **Survivor bias in comps** | Only comparing to successful exits, ignoring failures | Include range of outcomes; note selection criteria |
| **Ignoring UA dependency** | Projecting organic growth when 80% of users are paid | Always model UA spend alongside DAU; show what happens if UA stops |
| **Whale concentration risk** | Not flagging when top 1% of payers generate >50% of revenue | Always calculate revenue concentration; flag if top 5% > 60% |
| **Genre mismatch in comps** | Comparing a hyper-casual game's multiples to a live-service RPG | Enforce genre + model match in comp selection |
| **Vanity metrics** | Total downloads, registered users, or MAU without context | Always pair with active users, retention, and monetisation |
| **Ignoring platform risk** | Not accounting for App Store policy changes, fee increases | Note platform dependency; flag if single-platform >80% revenue |

---

## Output Quality Gate

Before producing any final deliverable, check:

- [ ] All numbers cited with source, publication, date
- [ ] Comp table has 3+ relevant matches (not stretched)
- [ ] TAM sized both top-down AND bottom-up, reconciled
- [ ] All AERM stages addressed (not just monetisation)
- [ ] Sensitivity/stress test included for any projection
- [ ] Gross vs. net revenue clearly labelled throughout
- [ ] Geographic context specified (not "global" by default)
- [ ] Lifecycle stage acknowledged (not treating a concept like a live game)
- [ ] Prior art checked (existing client work referenced if available)
- [ ] Anti-patterns checklist reviewed (none triggered)

If any item fails, fix before delivering.

---

## Prior Art Protocol

Before starting analysis, search the project directory for:
- Existing client folders matching the studio name
- Previous `/gi` outputs for the same game/studio
- Relevant forecast models or decks already built

If found, load the context and build on it rather than starting from scratch.

---

## Relationship to Other Skills

| Skill | Relationship |
|---|---|
| `game-economy-design` | Covers in-game economy (sinks/faucets, currencies). `/gi` covers business economics. No overlap. |
| `team-live-ops` | Covers operational planning (seasons, events). `/gi` covers financial analysis of live-service performance. No overlap. |
| `/games` router | Game development skills. `/gi` is investment/business analysis. Complementary — a studio might use both. |
| `brainstorming` | May precede `/gi` when deciding what to build for a client. |

---

## Implementation Notes

- SKILL.md should read `benchmarks.md` at the start of every invocation (Layer 1 loaded on demand)
- benchmarks.md will be populated through guided Q&A with Glen + web research — separate task after spec approval
- The skill is user-invocable (`/gi`)
- No subagent architecture needed — this is a single-agent workflow with web research
- Estimated SKILL.md size: ~300 lines (frameworks + templates + protocols)
- Estimated benchmarks.md size: ~500-800 lines (13 categories with real numbers)

---

## Build Order

1. Write SKILL.md (frameworks, templates, protocols, intake) — the methodology
2. Research and populate benchmarks.md (Glen's domain expertise + web research) — the data
3. Test with a real engagement (e.g., "Sarge Universe" pitch deck) — validation
4. Iterate based on real usage
