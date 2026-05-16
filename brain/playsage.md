---
last_verified: 2026-05-16
---

# PlaySage - Gaming Industry Intelligence Platform

Last Updated: 2026-04-20

---

**Status:** ON HOLD. Glen is the only person who can put it together and client work takes priority.

**Important clarification:** PlaySage is the PRODUCT name. It is NOT the company rebrand. The company rebrand has not moved at all.

**Claude Chat project:** "Playsage" - contains PRD template, scoping docs, investor demo feature plan, Q&A transcripts, and conversation history

**Project files:** PRD TEMPLATE.docx, scoping and planning update chat.docx, Investor demo feature plan.docx, Playsage qna 1.docx, playsage.docx, _conversations.txt

---

## What PlaySage Is

A gaming industry intelligence platform that converts publicly available and customer-provided gaming data into actionable intelligence. Provides a unified, cross-store view across iOS, Google Play, and Steam (with console planned).

---

## 10 Core Modules

1. **Market Overview & TAM** - dashboards with genre performance indexes, TAM/SAM modelling with editable assumptions, collaborative notes
2. **Competitive Landscape** - head-to-head title comparison against genre medians, feature diff matrix (monetisation, event cadence, pricing), automated competitor briefs
3. **Sentiment Analysis** - NLP-powered topic clustering from app store and Steam reviews, "Since Last Update" view, influencer sentiment tracking
4. **Foresight (Forecasting)** - rolling 90-day engagement and revenue-proxy forecasts with backtest accuracy displayed, driver cards showing what moves the needle
5. **Market Watch / Release Calendar** - release radar with projected impact tags, collision alerts, advisory windows for safe launch timing
6. **Alerts** - configurable alerts on any KPI (threshold, spike, slope change, competitor update), delivered in-app and via email/Slack
7. **The Sage (Recommendations)** - the standout differentiator. Rule-plus-model hybrid advisor that ties evidence to recommended actions with projected lift ranges. This is the "decision layer" that competitors lack
8. **Executive Dashboard & Scenario Planning** - scannable six-tile dashboard with "Last Scenario" tile linking to Foresight. Scenario planning lives in Foresight as a separate workflow, not inline
9. **Finance / IAP Intelligence** - IAP pricing analysis, storefront fee tracking, revenue proxy modelling
10. **API & Integrations** - scheduled reports (weekly/monthly), role-based access, data provenance, export capabilities

**Note:** SalarySage is confirmed as a module within PlaySage (not a separate product). See brain/salarysage.md for full details.

---

## Cascade Engine - The Real Moat

The cross-module integration intelligence layer. When one module detects a signal (e.g. MAU forecast dropping), Cascade automatically checks related modules (sentiment shifting negative? competitor launched? event cadence stale?) and surfaces the connected picture. This is the architectural differentiation - competitors offer isolated data views, PlaySage offers integrated decision intelligence.

---

## Tech Stack (Locked)

| Component | Technology |
|-----------|------------|
| Frontend | Next.js (App Router), Tailwind CSS + shadcn/ui |
| Backend | Supabase (PostgreSQL) |
| Hosting | Vercel |
| Demo | Docker Compose offline fallback (for GDC - no internet dependency) |

---

## Pricing (Decided - from v3 decision document)

| Tier | Monthly | Annual | Includes |
|------|---------|--------|----------|
| Starter | $1,500/month | $18K/year | Single genre, 2 seats, dashboards + sentiment + competitive landscape |
| Professional | $5,000/month | $60K/year | Up to 5 seats, all genres, full platform including Foresight + The Sage |
| Enterprise | $12,000-20,000/month | Custom, annual | Unlimited seats, SSO, custom integrations, dedicated success, data exports |

---

## Financial Projections ($10M raise target)

### Upside Case

| Year | Customers | ARR | Cash Flow |
|------|-----------|-----|-----------|
| Y1 | 14 | $780K | $254K/mo burn |
| Y2 | 58 | $4.59M | Approaching breakeven |
| Y3 | 130 | $11.4M | +$1.6M cash flow positive |

### Conservative Base Case

| Year | Customers | ARR | Notes |
|------|-----------|-----|-------|
| Y1 | 7 | -- | -- |
| Y3 | -- | $4.6M | Requires Series A |

**Structure:** USA LLC, bootstrapped from NBI revenue, clean cap table

---

## Competitive Landscape

| Competitor | Description |
|------------|-------------|
| Sensor Tower | The 800-pound gorilla. Acquired data.ai March 2024. $25-40K/year for teams. Post-merger near-monopoly in mobile intelligence |
| AppMagic | Scrappy challenger. Premium from ~$2,480/year. Expanding into PC (Steam launch Oct 2025) |
| Newzoo | Market-level intelligence (sizing, forecasts), not title-level operational tools |
| VGInsights / GG Insights / Gamalytic | Steam-focused, cheap ($50-500/month), narrow |
| GameRefinery | Now part of Sensor Tower. Feature-level game design analytics, monetisation teardowns |

---

## Beachhead Market

AA-to-AAA live-service studios. Expansion path: indie via self-serve tier, publishers via portfolio dashboards, investors via portfolio analytics.

---

## TAM

$2.12B Game Analytics market (Growth Market Reports 2025). NOT the $188.8B total gaming market - that figure is meaningless for a B2B analytics tool.

---

## Demo Anchor Titles

4 genres, 3 titles each. 12 real titles for demo stops, 38 synthetic background titles with "Estimated" badges.

| Genre | Title 1 | Title 2 | Title 3 |
|-------|---------|---------|---------|
| Shooter | Call of Duty (newest) | Battlefield (newest) | PUBG |
| RPG | Diablo IV | Elden Ring | Assassin's Creed Valhalla |
| MMO | World of Warcraft | Final Fantasy XIV | Elder Scrolls Online |
| Mobile Strategy | Clash of Clans | Clash Royale | Rise of Kingdoms |

---

## Data Strategy - Three Pillars

1. **Licensed data feeds** - commercial API subscriptions from data providers
2. **Public APIs & scraping** - app store public data, Steam API, within legal boundaries (CFAA/hiQ analysis done; platform ToS enforcement flagged as key risk)
3. **Studio partnerships** - the data flywheel moat. Studios share anonymised internal data in exchange for benchmarking analytics. Most important pillar, least developed so far

---

## Key Moat Arguments

1. **Studio partnership data flywheel** - each studio that shares data makes the platform more valuable for all studios. This is the strongest moat argument
2. **NBI's consulting relationships** - Glen and Tom's existing client base IS the initial customer pipeline. Advisory-relationship GTM advantage
3. **Decision layer, not just data layer** - The Sage provides recommendations; competitors provide dashboards

---

## Deliverables Progress (as of ~20 Feb 2026)

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | Consolidated Decision Document | DONE (v3). All 63 decisions locked, zero blockers |
| 2 | Cascade Engine Architecture | NOT STARTED |
| 3 | Full PRD | v1.2 COMPLETE, scored 7.1/10 in red-team critique. v1.3 corrections stalled (see below) |
| 4 | Pitch Deck Content | NOT STARTED |
| 5 | Claude Code Master Instruction Document | NOT STARTED |

---

## PRD Status Detail

The PRD v1.2 covers 18 sections and 10 detailed feature specs. It stalled at v1.3 corrections with approximately 60+ fixes identified and 10 decision points queried. Last active ~20 Feb 2026.

Critical issues identified in red-team review:
- Retention/conversion KPIs claimed from public data (impossible - was being resolved)
- EBITDA estimate from public data (impossible - flagged for removal)
- "LLM-powered" overclaim for The Sage (should be "AI-driven workflows" - rule+heuristic in v1)
- The Sage's lift range methodology undefined (headline differentiator needs spec)
- No wireframes or architecture diagrams (10 modules described in text only)
- Data moat is thin on same public sources as competitors - differentiation must come from analysis layer

---

## Advisory Contacts

Vardis and Aris (Couch Heroes CEO/COO) listed as advisory contacts in the decision document. Additional advisory board members TBD.

---

## "Why Now" Argument

- Sensor Tower acquired data.ai (March 2024), creating near-monopoly and raising prices
- AppMagic expanding into PC, proving market wants cross-platform
- Gaming market $188B+ with studios under extreme margin pressure post-2023-2024 layoff cycle
- LLMs became commercially viable 2023-2024, making The Sage possible at lower cost

---

## Open Questions / Stalled Work

- PRD v1.3 corrections were in progress when the Claude Chat conversation stalled (~20 Feb 2026)
- Decision points around retention KPIs, EBITDA, and several other items were being queried to Glen
- Deliverables 2-5 have not been started
- GDC 2026 demo status unknown - was the demo built? Was it shown? Needs Glen's update
- How will SalarySage integrate into the PlaySage product architecture? Will it become Module 11, or fold into an existing module (e.g. Market Overview or a new "Talent Intelligence" section)?
- Pricing - is salary data available at all tiers, or is it a Professional/Enterprise feature?

---

## Architectural Guidance — The Sage as Software 3.0

When PlaySage development resumes, The Sage module (the moat) should be built using patterns from Karpathy's Software 3.0 framework rather than traditional BI architecture. The differentiator is not dashboards (Sensor Tower has those). It is the intelligence layer.

### Compiled Market Intelligence (LLM Wiki Pattern)

Instead of traditional ETL pipelines that break when data sources change format, compile market intelligence into structured, interlinked Markdown knowledge bases. An LLM "compiles" raw data (app store pages, financial filings, review corpora, news articles) into a persistent, versioned wiki. The compiled artefact loads into context directly. No embedding, no vector search, no retrieval pipeline.

Advantages: knowledge compounds over time, provenance is tracked, git provides full history, and the system works at PlaySage's scale (hundreds of titles, not millions of documents).

### LLM Analysis Layer (Not Just Dashboards)

The Sage's recommendations should be generated by an LLM reasoning over compiled market intelligence, not by rules engines producing canned suggestions. The charts and dashboards are table stakes (every competitor has them). The moat is: "your MAU is dropping AND sentiment shifted negative AND your competitor launched a similar feature AND your event cadence has a gap. Here is what to do about it."

Build as: compiled context + LLM analysis + evidence attribution. Not: data warehouse + SQL queries + template recommendations.

### AutoResearch-Style Quality Loops

Every recommendation The Sage surfaces should pass through an AutoResearch scoring loop before reaching the user. Criteria: specificity (names the game, not generic), evidence quality (cites the data), actionability (user can execute immediately), accuracy (correct for genre-platform). Recommendations that score below threshold get improved or flagged.

### Agent Swarm Data Collection

Instead of brittle scrapers that break on layout changes, use agent swarms for data collection. Each agent is responsible for a data domain (Steam reviews, App Store rankings, financial filings, industry news). Agents are instructed in natural language, adapt to format changes, and surface anomalies. More resilient than traditional scraping, more flexible than API-only approaches.

### Why This Matters

Competitors (Sensor Tower, AppMagic) are building traditional BI: data pipelines, databases, dashboards, manual analysis. PlaySage building as Software 3.0 means the product gets better with each LLM generation, adapts to new data sources without engineering work, and delivers insight rather than data. This is the architectural decision that determines whether PlaySage is a better Sensor Tower or a fundamentally different product.
