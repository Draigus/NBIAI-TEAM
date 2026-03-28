# CTO -- Technical Context

> This file contains the technical landscape knowledge the CTO needs to govern NBI's technology effectively. It covers all active products, their architectures, known issues, and the technical decisions that constrain or guide engineering work.

## Product Portfolio Overview

NBI maintains four distinct technology assets, each with different maturity levels, tech stacks, and strategic importance.

| Product | Stack | Status | Strategic Priority |
|---|---|---|---|
| NBIAI Team App | Node.js, PostgreSQL, React, Tailwind CSS | PLANNING -- architecture and spec in progress | HIGH -- operational platform for the AI agent company |
| Playsage | Next.js App Router, Tailwind + shadcn/ui, Supabase PostgreSQL, Vercel | PRD at v1.2 (scored 7.1/10), deliverables 2-5 not started. Stack under review -- may migrate to Node.js + PostgreSQL for consistency with NBIAI | HIGH -- future SaaS revenue stream, investor-facing |
| SalarySage | Standalone HTML, CSV data (5MB), React component, SHA-256 auth | Working prototype (v10), security issues flagged | MEDIUM -- will become a Playsage module |
| Astinus | Python, SQLite, FastAPI | Active personal project (Glen's D&D campaign tool) | LOW -- personal project, not revenue-generating |
| NBI Website | Framer (nbi-consulting.com) | Live but scored 4.8/10; HTML/CSS prototype built separately, not deployed | MEDIUM -- affects lead generation and brand credibility |

## Playsage -- Gaming Industry Intelligence Platform

### Locked Tech Stack (Canon Decision, February 2026)
- **Frontend:** Next.js (App Router) with Tailwind CSS and shadcn/ui component library
- **Backend/Database:** Supabase (PostgreSQL)
- **Hosting:** Vercel
- **Demo fallback:** Docker Compose for offline scenarios (used at GDC)

This stack is a canon decision and must not be changed without escalation through the CEO to Glen.

### Architecture Overview
Playsage has 10 core modules:
1. Market Overview and TAM -- dashboards, genre performance, TAM/SAM modelling
2. Competitive Landscape -- title comparison, feature diff matrix, competitor briefs
3. Sentiment Analysis -- NLP topic clustering from app store and Steam reviews
4. Foresight (Forecasting) -- 90-day engagement and revenue forecasts with backtesting
5. Market Watch / Release Calendar -- release radar, collision alerts, launch timing
6. Alerts -- configurable KPI alerts (threshold, spike, slope change, competitor update)
7. The Sage (Recommendations) -- rule-plus-model hybrid advisor with projected lift ranges. This is the standout differentiator. Note: it is "AI-driven workflows" not "LLM-powered" in v1. The lift range methodology is undefined and needs specification
8. Executive Dashboard and Scenario Planning -- six-tile dashboard. Scenario planning lives in Foresight as a separate workflow, not inline (canon decision)
9. Finance / IAP Intelligence -- IAP pricing analysis, storefront fee tracking, revenue proxy modelling
10. API and Integrations -- scheduled reports, role-based access, data provenance, exports

### Cascade Engine -- The Architectural Moat
The cross-module integration intelligence layer. When one module detects a signal (e.g. MAU forecast dropping), Cascade automatically checks related modules (sentiment shifting? competitor launched? event cadence stale?) and surfaces the connected picture. Architecture document for the Cascade Engine has NOT been started (Deliverable 2).

### Data Strategy -- Three Pillars
1. **Licensed data feeds** -- commercial API subscriptions
2. **Public APIs and scraping** -- app store public data, Steam API (CFAA/hiQ analysis done; platform ToS enforcement flagged as key risk)
3. **Studio partnerships** -- anonymised internal data exchange for benchmarking. Most important pillar, least developed

### Demo Configuration
- 12 real anchor titles across 4 genres (Shooter, RPG, MMO, Mobile Strategy)
- 38 synthetic background titles with "Estimated" badges
- Docker Compose offline fallback for no-internet demo environments

### Known Technical Issues and Risks
- PRD v1.2 overclaimed "LLM-powered" for The Sage -- should be "AI-driven workflows" with rule+heuristic approach in v1
- The Sage's lift range methodology is undefined -- this is the headline differentiator and needs proper specification
- No wireframes or architecture diagrams exist -- 10 modules described in text only
- Retention/conversion KPIs were claimed from public data (impossible) -- being resolved
- EBITDA estimate from public data (impossible) -- flagged for removal
- Data moat is thin on same public sources as competitors -- differentiation must come from the analysis layer and studio partnerships
- Cascade Engine architecture has not been designed yet

### Deliverables Status
1. Consolidated Decision Document -- DONE (v3, 63 decisions locked)
2. Cascade Engine Architecture -- NOT STARTED
3. Full PRD -- v1.2 complete, v1.3 corrections in progress (stalled since ~20 Feb 2026)
4. Pitch Deck Content -- NOT STARTED
5. Claude Code Master Instruction Document -- NOT STARTED

## SalarySage -- Global Gaming Salary Intelligence

### Current Architecture
- **Format:** Standalone HTML app (SalarySage-Standalone.html, 29KB)
- **Data:** Demo_Salary.csv (5MB) -- loaded at runtime in the browser
- **Component:** SalarySage.jsx (24KB) -- React component
- **Authentication:** SalarySage-Auth.html (36KB) -- SHA-256 hashed credentials, case-sensitive login, access logging
- **Package:** Operation_MoneyBall_v10.zip (current version)

### Security Issues (Flagged by Glen, 26 March 2026)
- **CRITICAL:** API key was embedded in client-side HTML code -- visible to anyone browsing source
- API key was on Jeff Day's personal credit card ($25 loaded) -- must be moved to business account
- No server-side key management -- the standalone HTML architecture makes proper key obfuscation impossible without a backend
- Jeff confirmed the key can be hashed; working on a server-side solution

### Integration Path
SalarySage is designated as a future Playsage module, not a separate product. Open questions:
- Will it become Module 11, or fold into an existing module (Market Overview, or a new "Talent Intelligence" section)?
- Pricing tier availability -- all tiers or Professional/Enterprise only?
- The standalone HTML architecture will need to be rebuilt to integrate into the Next.js/Supabase stack

### Team
- Jeff Day -- built the original demo and salary data pipeline
- Devin Rieger -- built the auth front end, packaging, access logging
- Jessica Williams -- data/QA involvement
- Tom Rieger -- oversight

### Data Quality
- Jeff Day completed full automated QA assessment (3 March 2026)
- Tom noted it "looks really, really good"
- 80 records need caution flags (small market countries like Armenia, Republic of Georgia)
- Decision: add caution flags rather than remove data

## Astinus -- Campaign Intelligence System

### Architecture
- **Language:** Python
- **Database:** SQLite
- **API:** FastAPI
- **Design:** Local-first -- processes session audio into structured world data, maintains a living world bible, generates pre-session DM briefs
- **Location:** D:\OneDrive\Claude_code\Astinus

### CTO Relevance
Astinus is Glen's personal project, not a commercial NBI product. The CTO's role here is limited to:
- Ensuring it does not consume engineering resources allocated to commercial products
- Offering architectural advice if Glen asks
- Understanding its existence so it is not confused with commercial priorities

**WARNING:** C:\Users\gpbea\Downloads\Astinus is a STALE snapshot from February 2026 -- do not reference it.

## NBI Website

### Current State
- **Platform:** Framer
- **Domain:** nbi-consulting.com
- **Assessment score:** 4.8/10 (February 2026)
- **Key issues:** Hero section nearly empty on load (animation timing), content extremely thin, equal weight given to gaming and org health (dilutes gaming message), conversion strategy one-dimensional

### Prototype (Not Deployed)
- 10 HTML/CSS files built in Claude Chat: Homepage, 6 service pages, About, Contact, shared CSS
- Design: Orbitron + JetBrains Mono + Outfit fonts, dark theme, electric blue accents
- Status: prototype complete but NOT deployed to Framer
- Deployment options: host directly on Netlify/Vercel, or recreate in Framer using prototype as blueprint

### CTO Considerations
- The website is on Framer, which has different technical constraints than a custom-hosted site
- If the decision is made to move off Framer, the CTO would need to scope the migration
- The HTML/CSS prototype could be deployed to Vercel alongside Playsage if the decision is made to self-host

## Competitive Technical Landscape (Playsage Context)

| Competitor | Technical Approach | NBI Differentiation |
|---|---|---|
| Sensor Tower (acquired data.ai) | Massive data aggregation, mobile-first | Playsage offers cross-platform + decision layer (The Sage) |
| AppMagic | Expanding into PC (Steam, Oct 2025) | Playsage is cross-platform from day one |
| Newzoo | Market-level intelligence, not title-level | Playsage is operational/title-level |
| VGInsights / GG Insights / Gamalytic | Steam-focused, cheap, narrow | Playsage is broader and deeper |
| GameRefinery (now Sensor Tower) | Feature-level game design analytics | Playsage integrates across modules via Cascade |

## Playsage Pricing (Canon Decision)

| Tier | Price | Scope |
|---|---|---|
| Starter | $1,500/month ($18K/year) | Single genre, 2 seats, dashboards + sentiment + competitive landscape |
| Professional | $5,000/month ($60K/year) | Up to 5 seats, all genres, full platform including Foresight + The Sage |
| Enterprise | $12,000-20,000/month (custom, annual) | Unlimited seats, SSO, custom integrations, dedicated success, data exports |

## Key Technical Decisions Log

| Decision | Status | Notes |
|---|---|---|
| Playsage tech stack locked | CANON | Next.js App Router, Tailwind + shadcn/ui, Supabase PostgreSQL, Vercel |
| Executive Dashboard separate from Scenario Planning | CANON | Dashboard is consumption surface; scenario planning stays in Foresight |
| The Sage is rule+heuristic in v1, not LLM-powered | CANON | "AI-driven workflows" is the accurate description |
| NPS phased in later, PMF score primary early on | CANON | PMF score for Beta/early V1 (under 50 users) |
| SalarySage is a Playsage module, not separate | DECIDED | Integration path and timeline TBD |
| SalarySage API keys must not be exposed in client code | DECIDED | Server-side solution required |
