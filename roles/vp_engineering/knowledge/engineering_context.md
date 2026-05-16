> **Note:** This file contains legacy role knowledge that has been consolidated into the composite `AGENT.md` file in the parent role directory. The AGENT.md file is the operational version used by the dispatch system. This file is retained as the design record.

# VP Engineering -- Engineering Context

## NBI Product Portfolio and Tech Stacks

### Playsage -- Gaming Industry Intelligence Platform (Primary Build)

**What it is:** A B2B SaaS platform that converts publicly available and customer-provided gaming data into actionable intelligence. Provides a unified, cross-store view across iOS, Google Play, and Steam (with console planned).

**Tech Stack (Locked -- CTO decision, do not change):**
- **Frontend:** Next.js (App Router), Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL)
- **Hosting:** Vercel
- **Demo fallback:** Docker Compose offline (for trade shows -- no internet dependency)

**10 Core Modules:**
1. Market Overview and TAM -- dashboards, genre performance indexes, TAM/SAM modelling
2. Competitive Landscape -- head-to-head title comparison, feature diff matrix, competitor briefs
3. Sentiment Analysis -- NLP topic clustering from app store and Steam reviews
4. Foresight (Forecasting) -- rolling 90-day engagement and revenue-proxy forecasts
5. Market Watch / Release Calendar -- release radar, collision alerts, launch timing advisory
6. Alerts -- configurable KPI alerts (threshold, spike, slope change, competitor update)
7. The Sage (Recommendations) -- rule-plus-model hybrid advisor with projected lift ranges
8. Executive Dashboard and Scenario Planning -- six-tile dashboard, scenario planning in Foresight
9. Finance / IAP Intelligence -- IAP pricing analysis, storefront fee tracking, revenue proxy modelling
10. API and Integrations -- scheduled reports, role-based access, data provenance, export

**Cascade Engine:** The cross-module integration intelligence layer. When one module detects a signal, Cascade checks related modules and surfaces the connected picture. This is the architectural moat -- competitors offer isolated data views; Playsage offers integrated decision intelligence.

**Pricing Tiers:**
- Starter: $1,500/month -- single genre, 2 seats, dashboards + sentiment + competitive landscape
- Professional: $5,000/month -- up to 5 seats, all genres, full platform including Foresight + The Sage
- Enterprise: $12,000-20,000/month -- unlimited seats, SSO, custom integrations, dedicated success

**Beachhead Market:** AA-to-AAA live-service studios.

**Demo Requirements:** 12 real anchor titles across 4 genres (Shooter, RPG, MMO, Mobile Strategy) with 38 synthetic background titles using "Estimated" badges.

**PRD Status:** v1.2 complete (scored 7.1/10 in red-team critique). v1.3 corrections in progress (~60+ fixes, 10 decision points). Cascade Engine Architecture (Deliverable 2) not yet started.

### SalarySage -- Global Gaming Salary Intelligence

**What it is:** A salary intelligence database with LLM-powered AI query interface. Covers video game salaries by country, grade, position, with hub vs non-hub location differentials.

**Current Tech:**
- Standalone HTML app (SalarySage-Standalone.html, 29KB)
- React component (SalarySage.jsx, 24KB)
- Auth front end (SalarySage-Auth.html, 36KB) -- SHA-256 hashed credentials
- 5MB CSV salary dataset (Demo_Salary.csv)

**Known Issues:**
- API key exposed in HTML source -- critical security concern raised by Glen
- Runs as local standalone file -- needs server-side solution for proper auth and API key obfuscation
- Currently separate from Playsage -- needs architectural plan for integration as a module

**Team:** Jeff Day (built demo/data pipeline), Devin Rieger (auth front end/packaging), Jessica Williams (data QA)

**Engineering Action Required:** Plan the migration of SalarySage into the Playsage Next.js/Supabase architecture. The salary data needs to move into Supabase, the query interface needs to become a Playsage module, and the API key exposure must be fixed.

### NBI Website

**Current state:** Framer-hosted at nbi-consulting.com. Scored 4.8/10 in internal assessment.

**Redesign:** Full HTML/CSS prototype exists (10 files -- homepage, 6 service pages, about, contact, shared CSS). Gaming-first positioning. Dark theme with electric blue accents. Orbitron + JetBrains Mono + Outfit fonts.

**Engineering decision pending:** Host directly via Netlify/Vercel using the HTML prototype, or recreate in Framer using the prototype as a visual blueprint. This is a CTO-level decision.

### Astinus -- Campaign Intelligence System (Glen's Personal Project)

**What it is:** A local-first Python system for Glen's D&D campaign. Processes session audio into structured world data, maintains a living world bible, generates pre-session DM briefs.

**Tech Stack:** Python, SQLite, FastAPI
**Location:** D:\OneDrive\Claude_code\Astinus
**Priority:** Lower than all NBI product work. May need occasional engineering support.

## Development Environment

**Claude Code** is the primary development environment for all engineers. This means:
- Engineers write, debug, and refactor code through Claude Code sessions
- Code generation, review assistance, and documentation happen within Claude Code
- The VP Engineering should ensure CLAUDE.md files exist in project roots with proper context for each codebase
- Engineers should be trained on effective Claude Code usage patterns

## Engineering Standards to Enforce

### Code Quality
- All code must pass linting before PR submission
- Minimum 80% test coverage on new code
- Functions must be documented (purpose, parameters, return values)
- No hardcoded secrets, API keys, or credentials in source code (SalarySage already violated this -- do not repeat)
- Consistent naming conventions per stack (camelCase for JS/TS, snake_case for Python)

### Git Workflow
- Feature branches off main/develop
- PRs require at least one approval before merge
- Commit messages must reference the relevant task/ticket
- No force-pushing to shared branches
- Squash merges for feature branches to keep history clean

### Deployment
- All deployments go through CI/CD pipeline -- no manual deployments to production
- Staging environment must be tested before production deployment
- Rollback procedure must be documented and tested for each product
- Zero-downtime deployments for Playsage (Vercel handles this natively)

### Security
- No API keys or secrets in client-side code
- Authentication flows must use server-side token handling
- All user input must be sanitised
- Supabase Row Level Security (RLS) policies must be configured for all tables
- Regular dependency vulnerability scanning

## Competitive Context (For Engineering Prioritisation)

NBI's main competitors in the gaming intelligence space:
- **Sensor Tower** (acquired data.ai) -- the dominant player. $25-40K/year. Post-merger near-monopoly in mobile intelligence
- **AppMagic** -- scrappy challenger expanding into PC (Steam). Premium from ~$2,480/year
- **Newzoo** -- market-level intelligence, not title-level operational tools
- **VGInsights / GG Insights / Gamalytic** -- Steam-focused, cheap ($50-500/month), narrow

Playsage's engineering differentiation is the **Cascade Engine** (cross-module intelligence) and **The Sage** (recommendation engine). These are the features that justify the premium pricing and must be engineered to a high standard.

## Key NBI Dates and Milestones

- Playsage PRD v1.3 corrections are in progress -- engineering spec will follow
- SalarySage needs API key fix before any further client demos
- NBI website redesign pending deployment decision
- Couch Heroes FTE artifact work is Glen's top priority (not engineering, but context for why product/consulting may take priority over engineering tickets temporarily)
