# VP Product -- Product Context

## Playsage -- Gaming Industry Intelligence Platform

### Product Vision
A gaming industry intelligence platform that converts publicly available and customer-provided gaming data into actionable intelligence. Provides a unified, cross-store view across iOS, Google Play, and Steam (with console planned). The core value proposition: competitors offer isolated data views; Playsage offers integrated decision intelligence.

### 10 Core Modules

1. **Market Overview and TAM** -- Dashboards with genre performance indexes, TAM/SAM modelling with editable assumptions, collaborative notes. Entry point for understanding the market landscape
2. **Competitive Landscape** -- Head-to-head title comparison against genre medians, feature diff matrix (monetisation, event cadence, pricing), automated competitor briefs. Studios use this to benchmark against rivals
3. **Sentiment Analysis** -- NLP-powered topic clustering from app store and Steam reviews, "Since Last Update" view, influencer sentiment tracking. Real-time pulse on player perception
4. **Foresight (Forecasting)** -- Rolling 90-day engagement and revenue-proxy forecasts with backtest accuracy displayed, driver cards showing what moves the needle. Also hosts Scenario Planning as a separate workflow (not inline on the Executive Dashboard)
5. **Market Watch / Release Calendar** -- Release radar with projected impact tags, collision alerts, advisory windows for safe launch timing. Prevents studios from launching into headwinds
6. **Alerts** -- Configurable alerts on any KPI (threshold, spike, slope change, competitor update), delivered in-app and via email/Slack. Keeps teams aware without requiring dashboard check-ins
7. **The Sage (Recommendations)** -- The standout differentiator. Rule-plus-model hybrid advisor that ties evidence to recommended actions with projected lift ranges. This is the "decision layer" that competitors lack. Note: v1 is rule+heuristic, NOT full LLM-powered. Marketing should say "AI-driven workflows", not "LLM-powered"
8. **Executive Dashboard and Scenario Planning** -- Scannable six-tile dashboard with "Last Scenario" tile linking to Foresight. Consumption surface for leadership. Scenario planning lives in Foresight module, not inline
9. **Finance / IAP Intelligence** -- IAP pricing analysis, storefront fee tracking, revenue proxy modelling. Critical for monetisation-focused studios
10. **API and Integrations** -- Scheduled reports (weekly/monthly), role-based access, data provenance, export capabilities. Enterprise feature tier

### Cascade Engine -- The Real Moat
The cross-module integration intelligence layer. When one module detects a signal (e.g. MAU forecast dropping), Cascade automatically checks related modules (sentiment shifting negative? competitor launched? event cadence stale?) and surfaces the connected picture. This must be protected in every roadmap decision -- it is the architectural justification for Playsage's premium pricing.

### Pricing Tiers (Canon Decision -- Do Not Change Without Escalation)
- **Starter:** $1,500/month ($18K/year) -- single genre, 2 seats, dashboards + sentiment + competitive landscape
- **Professional:** $5,000/month ($60K/year) -- up to 5 seats, all genres, full platform including Foresight + The Sage
- **Enterprise:** $12,000-20,000/month (custom, annual) -- unlimited seats, SSO, custom integrations, dedicated success, data exports

### Beachhead Market (Canon Decision)
AA-to-AAA live-service studios. Expansion path: indie via self-serve tier, publishers via portfolio dashboards, investors via portfolio analytics.

### Tech Stack (Canon Decision -- Do Not Change Without Escalation)
- Frontend: Next.js (App Router), Tailwind CSS + shadcn/ui
- Backend: Supabase (PostgreSQL)
- Hosting: Vercel
- Demo fallback: Docker Compose offline

### Target Users (Personas to Develop)
- **Studio Product Lead:** Needs competitive intelligence, market sizing, and feature benchmarking to make product decisions
- **Data Analyst / BI Lead:** Needs cross-platform data in one place, automated reporting, and forecasting tools
- **Studio Executive (CPO/CEO/COO):** Needs the executive dashboard, scenario planning, and The Sage recommendations to make strategic calls
- **Investor / Publisher:** Needs portfolio-level analytics and market intelligence (expansion persona, not beachhead)

### Competitive Landscape

**Sensor Tower** (acquired data.ai, March 2024)
- The 800-pound gorilla. $25-40K/year for teams. Post-merger near-monopoly in mobile intelligence
- Strengths: massive data coverage, established brand, comprehensive mobile analytics
- Weakness for Playsage to exploit: no integrated decision layer, no cross-module intelligence, very expensive

**AppMagic**
- Scrappy challenger. Premium from ~$2,480/year. Expanding into PC (Steam launch Oct 2025)
- Strength: price point, agility
- Weakness: lacks depth in recommendation and forecasting

**Newzoo**
- Market-level intelligence (sizing, forecasts), not title-level operational tools
- Different market segment -- more useful for investors than studio teams

**VGInsights / GG Insights / Gamalytic**
- Steam-focused, cheap ($50-500/month), narrow
- Not true competitors at the AA-AAA level

**GameRefinery** (now part of Sensor Tower)
- Feature-level game design analytics, monetisation teardowns
- Absorbed into Sensor Tower ecosystem

### "Why Now" Argument
- Sensor Tower/data.ai merger creates a near-monopoly, raising prices and reducing choice
- AppMagic expanding into PC proves the market wants cross-platform
- $188B+ gaming market with studios under extreme margin pressure post-2023-2024 layoff cycle
- LLMs became commercially viable 2023-2024, making The Sage possible at lower cost

### Product Metrics Framework
- **Pre-launch:** PRD quality score, feature spec completeness, engineering estimate accuracy
- **Beta / early V1 (under 50 users):** PMF score is primary ("very disappointed" threshold above 40%), CSAT for support interactions
- **Growth (50+ users):** Add NPS alongside PMF score
- **Ongoing:** Feature adoption rates, daily/weekly active usage, churn indicators, The Sage recommendation engagement

### PRD Status
- v1.2 complete, scored 7.1/10 in red-team critique
- v1.3 corrections in progress (~60+ fixes identified, 10 decision points queried)
- Key issues from red-team: retention/conversion KPIs claimed from public data (impossible), EBITDA estimate overclaim, "LLM-powered" overclaim for The Sage, lift range methodology undefined, no wireframes or architecture diagrams
- Cascade Engine Architecture (Deliverable 2) not yet started
- Pitch Deck Content (Deliverable 4) not yet started

### Financial Projections ($10M raise target)
- Upside case: Y1 14 customers, $780K ARR. Y2 58 customers, $4.59M ARR. Y3 130 customers, $11.4M ARR, cash flow positive
- Conservative base case: Y1 7 customers. Y3 $4.6M ARR, requires Series A
- Structure: USA LLC, bootstrapped from NBI revenue, clean cap table

## SalarySage -- Global Gaming Salary Intelligence

### What It Is
A salary intelligence database with LLM-powered AI query interface. Covers video game salaries by country, grade, position, with hub vs non-hub location differentials.

### Relationship to Playsage
SalarySage is a feature of Playsage, not a separate product. It will become a module within the broader platform alongside the 10 core modules. Open question: does it become Module 11, fold into Market Overview, or become a new "Talent Intelligence" section?

### Current State
- Working prototype (v10). Standalone HTML app with 5MB CSV dataset
- Auth front end added by Devin Rieger
- Data QA completed by Jeff Day -- "looks really good" with 80 records needing caution flags
- Critical issue: API key exposed in HTML source. Must be fixed before any client demos

### Product Decisions Needed
- Integration architecture into Playsage (which module, how does salary data interact with other modules?)
- Is salary data available at all pricing tiers or Professional/Enterprise only?
- Server-side deployment plan (currently local standalone, needs proper hosting)

## NBI Website

### Current State
- Framer-hosted at nbi-consulting.com. Scored 4.8/10 internally
- Hero section loads nearly empty (animation timing). Content extremely thin. Services pages have one-sentence descriptions
- Missing 4 active clients from carousel (Lighthouse, Sarge Universe, Couch Heroes, Goals Studio)

### Redesign
- Full HTML/CSS prototype exists: 10 files, gaming-first positioning, 6 service pages
- Service pages named after real problems: Production and Roadmap Planning, Go-to-Market Strategy, Agile for Game Studios, Player Targeting and Segmentation, Investor Readiness and Data Rooms, Studio Health and Team Performance
- Voice shift: studio-native language, not consultant-speak
- Design: Orbitron + JetBrains Mono + Outfit fonts. Dark theme, electric blue accents
- Not yet deployed. Pending decision on hosting approach (direct Netlify/Vercel vs Framer rebuild)

### Brand Direction
- Business remains one entity, two practice areas (Gaming and Human Capital). Gaming leads
- PlaySage proposed as new brand name (pending trademark/domain checks)
- Primary goals: lead generation and credibility
- Primary CTA: Book a call / Contact

## Consulting Deliverables -- Quality Standards

NBI's consulting reputation is built on Glen's personal credibility and 20 years of gaming industry experience. Every deliverable that goes to a client must meet these standards:

1. **Tailored:** Specific to the client's studio, game, market position, and situation. Nothing generic
2. **Accurate:** Every data point, citation, and claim verified. Glen is "super anal" about this
3. **Deep:** Thorough analysis, not surface-level observations. Glen would rather wait for deep results than receive fast but shallow output
4. **Actionable:** Deliverables include specific recommendations the client can act on, not just observations
5. **Studio-native language:** Written in the language game studios use ("ship", "roadmap", "sprint", "greenlight"), not corporate consultant-speak

### Current Consulting Work
- **Couch Heroes:** Glen as Fractional Studio Head -- FTE hiring artifacts, org structure, job descriptions, roadmaps
- **Lighthouse Studios:** Embedded data team (Amir, Ruan, Stavros) building analytics infrastructure
- **Sarge Universe:** Pitch deck, DD deck, financial plan for investor outreach (unpaid, pre-funding)
- **Goals Studio:** HC pricing review and in-game store review (scope requested, follow-up overdue)
- **Blizzard:** Regular report delivery (Tom-managed)
