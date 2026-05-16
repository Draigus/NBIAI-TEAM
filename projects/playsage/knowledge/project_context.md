> **Canonical product context:** See `brain/playsage.md`. This file contains project-specific operational state only — sprint progress, blockers, deliverables, and session-specific decisions.

# Playsage — Project Context (Tier 3 Knowledge)

> This file is the deep knowledge base for any agent working on Playsage. It contains all technical, product, financial, competitive, and strategic detail needed to continue work without re-briefing Glen.

**Source of truth:** NBI_Brain.md Section 3 (Playsage subsection), Decision Document v3, PRD v1.2
**Last updated:** 2026-03-28

---

## What Playsage Is

A B2B SaaS gaming industry intelligence platform. It ingests publicly available and studio-provided gaming data and converts it into integrated, actionable decision intelligence. The product is aimed at AA-to-AAA live-service game studios that currently rely on a fragmented set of expensive point tools (Sensor Tower, Newzoo, GameRefinery) that each deliver isolated data views with no cross-signal reasoning.

The platform is being built as a USA LLC, bootstrapped initially from NBI consulting revenue, with a $10M raise target once foundational deliverables are complete.

---

## The 10 Core Modules

### 1. Market Overview and TAM
Genre performance index dashboards. TAM and SAM modelling with user-editable assumptions. Collaborative annotation layer (notes, flags). Gives studios a live read on market size and growth trajectory for their genre.

### 2. Competitive Landscape
Head-to-head title comparison against genre medians. Feature differentiation matrix covering monetisation model, event cadence, and pricing. Automated competitor brief generation. Answers: "how does our title compare to what players can play instead?"

### 3. Sentiment Analysis
NLP-powered topic clustering drawn from app store reviews and Steam reviews. "Since Last Update" view isolates sentiment changes tied to specific product updates. Influencer sentiment tracking layer. Converts unstructured player voice into structured signal.

### 4. Foresight (Forecasting)
Rolling 90-day engagement and revenue-proxy forecasts. Backtest accuracy is surfaced alongside every forecast so users can see how reliable the model is. Driver cards explain what factors are moving the forecast — not just the number but the reasons behind it. Scenario planning lives in Foresight as a distinct workflow (not inline in the dashboard).

### 5. Market Watch and Release Calendar
Release radar showing upcoming title launches with projected market impact tags. Collision alert system flags when a competing release will overlap with a planned studio event or launch window. Advisory windows identify safe launch timing based on competitive calendar. Prevents studios from inadvertently launching into a crowded window.

### 6. Alerts
Fully configurable alert system. Users can set alerts on any KPI across any module: threshold breach, spike detection, slope change, competitor product update. Delivered in-app and optionally via email or Slack integration. Keeps teams informed without requiring daily manual checking.

### 7. The Sage (Recommendations)
The standout differentiator and headline feature. A rule-plus-model hybrid advisory layer that ties detected evidence to recommended actions with projected lift ranges attached. This is the "decision layer" that competitors completely lack — Sensor Tower and Newzoo show data; The Sage tells you what to do about it. In v1, The Sage uses a rule-plus-heuristic architecture (not pure LLM — that overclaims accuracy). The lift range methodology needs to be formally specified (this is an open PRD issue from red-team).

### 8. Executive Dashboard and Scenario Planning
A scannable six-tile summary dashboard designed for executives and studio heads who need a fast read without drilling into modules. The "Last Scenario" tile links directly into Foresight's scenario planning workflow. Scenario planning is housed in Foresight (not as a standalone module) for coherence.

### 9. Finance and IAP Intelligence
IAP pricing analysis across storefronts. Storefront fee tracking (platform cut changes, regional pricing). Revenue proxy modelling for competitor titles. Enables pricing decisions grounded in market benchmarks.

### 10. API and Integrations
Scheduled reporting (weekly and monthly digests, exportable). Role-based access control. Data provenance tracking (users can trace where each data point came from). Export capabilities for offline analysis. This module is the platform's integration surface for studios that want data in their own BI tools.

---

## The Cascade Engine

The Cascade Engine is the core architectural moat. It is the cross-module integration intelligence layer.

When one module detects a signal — for example, the Foresight module projects a MAU decline — the Cascade Engine automatically queries related modules to check for corroborating or explanatory signals:
- Is sentiment shifting negative (Sentiment Analysis module)?
- Has a competitor recently launched or updated (Competitive Landscape / Market Watch)?
- Has event cadence stalled (Competitive Landscape)?
- Are any KPI alerts triggered (Alerts module)?

It then surfaces the connected picture as a unified insight rather than requiring a user to manually cross-reference five different dashboards. This is the fundamental architectural difference between Playsage and every competitor: competitors offer isolated data views, Playsage offers integrated decision intelligence.

The Cascade Engine architecture document (Deliverable 2) has not been started as of 28 March 2026.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend framework | Next.js (App Router) | Locked |
| UI component system | Tailwind CSS + shadcn/ui | Locked |
| Database and backend | Supabase (PostgreSQL) | Handles auth + DB without custom backend overhead |
| Hosting and deployment | Vercel | Locked |
| Demo fallback | Docker Compose | Offline operation for GDC — no internet dependency |

The stack is fully locked in the v3 decision document. No stack decisions are outstanding. All future development agents should build within this stack without proposing alternatives.

---

## Pricing Tiers

### Starter — $1,500/month ($18,000/year)
- Single genre
- 2 seats
- Modules included: Dashboards, Sentiment Analysis, Competitive Landscape
- Target: smaller AA studios needing a foothold in market intelligence

### Professional — $5,000/month ($60,000/year)
- Up to 5 seats
- All genres
- Full platform access including Foresight and The Sage
- Target: AA-to-AAA studios with live-service titles

### Enterprise — $12,000-20,000/month (custom, annual contract)
- Unlimited seats
- SSO
- Custom integrations
- Dedicated customer success manager
- Full data export capabilities
- Target: large publishers, platform holders, multi-title portfolios

Pricing rationale: the $1,500 entry point is accessible for studios that have already funded a title and want to reduce competitive blind spots. The $5,000 Pro tier positions Playsage as a serious operational tool, not a commodity data subscription. Enterprise is deliberately open-ended to allow deal structuring with large accounts.

---

## Competitive Landscape

### Sensor Tower (acquired data.ai, March 2024)
The dominant player. Approximately $25,000-40,000/year for team licences. The March 2024 acquisition of data.ai created a near-monopoly in mobile intelligence and has driven price increases and reduced competitive pressure on Sensor Tower to innovate. This is the primary "why now" argument for Playsage.

### AppMagic
Scrappy challenger to Sensor Tower. Premium tier from approximately $2,480/year. Expanding into PC/Steam (Steam data launched October 2025). Proves the market wants cross-platform coverage. AppMagic is cheaper than Sensor Tower but still offers isolated data views with no recommendation layer.

### Newzoo
Market-level intelligence: market sizing, high-level forecasts, geographic breakdowns. Not a title-level operational tool. No real overlap with Playsage's module depth. Expensive annual contracts aimed at publishers and platform holders.

### VGInsights / GG Insights / Gamalytic
Steam-focused, low-cost tools ($50-500/month). Narrow in scope, no mobile coverage, no recommendation engine. Useful for indie developers; not a threat at the AA-to-AAA level.

### GameRefinery (now part of Sensor Tower)
Feature-level game design analytics and monetisation teardowns. Highly specific tool for game designers evaluating feature sets. Absorbed into Sensor Tower post-acquisition, further strengthening Sensor Tower's position.

### Playsage's differentiation
1. The Sage recommendation layer — no competitor has an actionable decision layer
2. Cascade Engine cross-module integration — no competitor connects signals across modules
3. Studio partnership data flywheel — proprietary data layer that gets stronger as more studios join
4. NBI consulting relationships as GTM wedge — Glen and Tom's existing clients are the first customer pipeline

---

## Demo Configuration

The GDC demo uses a controlled data set to ensure a reliable, repeatable demonstration experience.

**4 genres, 3 anchor titles each (12 real titles total):**
- Shooter: Call of Duty (newest title), Battlefield (newest title), PUBG
- RPG: Diablo IV, Elden Ring, Assassin's Creed Valhalla
- MMO: World of Warcraft, Final Fantasy XIV, Elder Scrolls Online
- Mobile Strategy: Clash of Clans, Clash Royale, Rise of Kingdoms

**38 synthetic background titles** with "Estimated" badges — these populate the broader market view to simulate a live platform while the real titles anchor demo narratives.

The demo runs on Docker Compose with an offline fallback so it can operate without conference Wi-Fi.

Status as of 28 March 2026: whether the GDC 2026 demo was built and shown is unknown. Glen needs to confirm and report back.

---

## Data Strategy — Three Pillars

### Pillar 1: Licensed Data Feeds
Commercial API subscriptions from third-party data providers. Provides reliable, contractually governed data. Cost is the main risk — per-customer cost modelling is needed before investor pitching.

### Pillar 2: Public APIs and Scraping
App store public data, Steam API, and public-facing data within legal boundaries. Legal analysis done: CFAA and hiQ precedent reviewed. Key risk is platform ToS enforcement (Apple, Google, Valve can change terms). Mitigation: diversify toward licensed feeds and studio partnerships; do not over-depend on scraping.

### Pillar 3: Studio Partnerships (Data Flywheel)
The most important and least developed pillar. Studios share anonymised internal performance data (DAU, retention, event performance) in exchange for benchmark access and comparative intelligence. Each additional studio that shares data makes the platform more valuable for every other studio on the platform. This is the strongest long-term moat argument and the hardest to bootstrap. NBI's existing consulting client relationships are the proposed seed mechanism for this flywheel.

---

## Financial Projections

All figures are from the v3 decision document. Structure: USA LLC, bootstrapped from NBI consulting revenue, clean cap table. $10M raise target.

### Upside Case
| Year | Customers | ARR | Monthly Burn | Cash Flow |
|---|---|---|---|---|
| Y1 | 14 | $780K | $254K | Negative |
| Y2 | 58 | $4.59M | TBD | Approaching breakeven |
| Y3 | 130 | $11.4M | TBD | +$1.6M cash flow positive |

### Conservative Base Case
| Year | Customers | ARR | Notes |
|---|---|---|---|
| Y1 | 7 | ~$126K | Reduced early traction |
| Y3 | TBD | $4.6M | Requires Series A to reach this scale |

The upside case is the pitch narrative. The conservative case is the honest planning floor. Both were modelled in the v3 decision document.

---

## Outstanding PRD Issues (Red-Team Review of v1.2 — Score 7.1/10)

These are the specific issues identified in the structured red-team critique of PRD v1.2. PRD v1.3 must address all of them before the document is investor-ready.

### Critical Issues (block investor readiness)
1. **Retention and conversion KPIs from public data** — the PRD claimed these could be derived from public sources. This is technically impossible. The approach must be corrected: either these KPIs are removed, sourced from licensed data partners, or flagged as studio-partnership data (Pillar 3 only).
2. **EBITDA estimate from public data** — similar impossibility. EBITDA is not publicly disclosed by studios. Must be removed or replaced with revenue proxy modelling.
3. **"LLM-powered" overclaim for The Sage** — v1 of The Sage uses a rule-plus-heuristic architecture. Describing it as "LLM-powered" is a false claim. Correct language: "AI-driven workflows" or "rule-based intelligence engine". LLM integration may come in v2.
4. **The Sage lift range methodology undefined** — the headline differentiator (projected lift ranges attached to recommendations) has no specified methodology in v1.2. This must be defined before pitching. How are lift ranges calculated? What data validates them?

### High-Priority Issues
5. **No wireframes or architecture diagrams** — 10 modules described in text only. Investors and developers need visual representations. Wireframes for at least the 3 most differentiated modules (The Sage, Cascade Engine view, Executive Dashboard) are needed.
6. **Data moat thin on shared public sources** — if Pillars 1 and 2 use the same public data as Sensor Tower and AppMagic, the data moat argument fails. The PRD must more forcefully position the differentiation as the analysis layer (Cascade Engine, The Sage) and the studio partnership flywheel (Pillar 3), not the underlying data.

### Remaining Open Items (~10 decision points pending Glen's input as of 20 Feb 2026)
Glen was queried on approximately 10 specific decision points when the PRD work stalled. These need to be retrieved from the Claude Chat "Playsage" project history and re-presented to Glen for resolution before v1.3 can be finalised.

---

## Deliverables Status

| Deliverable | Status | Notes |
|---|---|---|
| Decision Document v3 | Done | All 63 decisions locked, zero blockers |
| PRD v1.2 | Done | 7.1/10, 18 sections, 10 feature specs |
| PRD v1.3 | Stalled | 60+ corrections needed; 10 decision points pending Glen input; last active ~20 Feb 2026 |
| Cascade Engine Architecture | Not started | Deliverable 2 — blocks development |
| Pitch Deck | Not started | Deliverable 4 — blocks investor outreach |
| Claude Code Master Instruction Document | Not started | Deliverable 5 — blocks development entirely |
| GDC Demo | Status unknown | Glen to confirm whether it was built and shown |
| USA LLC formation | Not started | Needed before raise |

---

## Beachhead and Expansion Path

**Beachhead:** AA-to-AAA live-service studios. These studios have the budgets to pay ($1,500-5,000/month is rounding error against a $5M+ production budget), the complexity of competitive environment to justify the intelligence spend, and the highest churn risk if they make bad live-service decisions.

**Expansion path:**
1. AA-to-AAA live service (beachhead)
2. Indie studios via self-serve lower-cost tier (later version)
3. Publishers via portfolio-level dashboards (later version)
4. Institutional investors via portfolio analytics (longer term)

---

## Advisory Contacts

- Vardis (CEO, Couch Heroes) — listed in decision document as advisory contact
- Aris (COO, Couch Heroes) — listed in decision document as advisory contact
- Additional advisory board members: TBD

---

## "Why Now" Arguments

1. Sensor Tower acquired data.ai in March 2024, creating a near-monopoly that is raising prices and reducing innovation. Studios are actively looking for alternatives.
2. AppMagic expanding into Steam (October 2025), validating that the market wants cross-platform coverage.
3. Gaming market at $188B+ but under extreme margin pressure after the 2023-2024 layoff cycle — studios need to make better decisions with less budget for experimenting.
4. LLMs became commercially viable in 2023-2024, making The Sage's recommendation engine possible at a cost that fits the unit economics of a B2B SaaS product.

---

## Key File Locations

- Claude Chat project: "Playsage" (claude.ai)
- Project files: PRD TEMPLATE.docx, scoping and planning update chat.docx, Investor demo feature plan.docx, Playsage qna 1.docx, playsage.docx, _conversations.txt
- Decision Document v3 is the authoritative source for all locked decisions
- PRD v1.2 is the latest complete version of the product requirements

---

## Name Ambiguity Note

"Playsage" currently refers to both the software product and the proposed trading name for NBI Consulting (the consulting firm). This dual usage exists because the product and the brand rename were conceived together. A formal decision on whether they share the name or diverge has not been made. Trademark applications (USPTO Class 35 and 41, UK IPO, EUIPO) and domain availability (playsage.com) checks are pending this decision.
