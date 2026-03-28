# QA Engineer — QA Context

## What NBI Builds and What Gets Tested

### Playsage
The primary product under active development. A gaming industry intelligence SaaS platform targeting AA and AAA live-service studios.

**Tech stack:**
- Frontend: Next.js (App Router), Tailwind CSS + shadcn/ui
- Backend: Supabase (PostgreSQL)
- Hosting: Vercel
- Demo environment: Docker Compose offline fallback (originally built for GDC)

**10 core modules to test:**
1. Market Overview & TAM — dashboards, genre performance indexes, TAM/SAM modelling
2. Competitive Landscape — head-to-head title comparison, feature diff matrix, competitor briefs
3. Sentiment Analysis — NLP topic clustering from app store and Steam reviews, influencer sentiment
4. Foresight (Forecasting) — rolling 90-day engagement/revenue forecasts, driver cards
5. Market Watch / Release Calendar — release radar, collision alerts, advisory windows
6. Alerts — configurable threshold/spike/slope change alerts, delivered in-app and email/Slack
7. The Sage (Recommendations) — rule-plus-model hybrid advisor; the key differentiator
8. Executive Dashboard & Scenario Planning — six-tile dashboard; scenario planning in Foresight
9. Finance / IAP Intelligence — IAP pricing analysis, revenue proxy modelling, storefront fee tracking
10. API & Integrations — scheduled reports, role-based access, data export

**Cascade Engine:** The cross-module integration layer. When one module detects a signal, Cascade checks related modules and surfaces the connected picture. Integration testing across modules is important here.

**Pricing tiers (relevant to access/permission testing):**
- Starter: single genre, 2 seats, dashboards + sentiment + competitive landscape
- Professional: up to 5 seats, all genres, full platform including Foresight + The Sage
- Enterprise: unlimited seats, SSO, custom integrations, data exports

**Demo anchor titles (used in demo data):**
- Shooter: Call of Duty, Battlefield, PUBG
- RPG: Diablo IV, Elden Ring, Assassin's Creed Valhalla
- MMO: World of Warcraft, Final Fantasy XIV, Elder Scrolls Online
- Mobile Strategy: Clash of Clans, Clash Royale, Rise of Kingdoms
- 12 real titles + 38 synthetic background titles with "Estimated" badges

**Known open issues at time of writing:**
- PRD v1.2 scored 7.1/10 in red-team critique; v1.3 corrections were in progress
- No wireframes or architecture diagrams yet — test specs will be written from PRD text descriptions
- The Sage lift range methodology is not fully defined — test against what is specced, flag gaps

### SalarySage
A global gaming industry salary intelligence tool. Currently a standalone HTML demo; will eventually become a module within Playsage.

**Current components:**
- SalarySage-Standalone.html — main demo app
- Demo_Salary.csv — the salary database (5MB)
- SalarySage.jsx — React component
- SalarySage-Auth.html — authentication front end (added by Devin Rieger, March 2026)

**Known issues (security-critical):**
- API key was embedded in HTML source code — this is being fixed (must never be in client-side code)
- Server-side solution for API key obfuscation is in progress
- Do not test with the live API key visible in source — flag immediately as P1 if seen

**Data QA note:** 80 records in the salary database have caution flags for small-market countries (Armenia, Republic of Georgia). This is by design — caution flags are the resolution, not data removal.

### Client Delivery Work
NBI delivers consulting artifacts to clients. QA may be asked to review documents, templates, financial models, or web assets for accuracy and completeness. In these cases:
- Test against the brief and scope document, not a generic quality standard
- Flag factual errors, broken links, formatting issues, and missing required sections
- Do not re-scope the deliverable — test what was scoped

## Testing Environments

- **Playsage staging:** Vercel preview deployments (URL provided per build)
- **SalarySage demo:** Local HTML file or staging URL as provided
- **Browsers to test unless otherwise specified:** Chrome (latest), Firefox (latest), Safari (latest), Edge (latest)
- **Mobile testing:** Chrome on Android, Safari on iOS — confirm scope with QA Lead per sprint

## Bug Severity Guide for NBI Products

| Severity | Definition | Example |
|---|---|---|
| P1 — Critical | Core function is completely broken; no workaround | Login fails for all users; Playsage dashboard blank on load |
| P2 — Major | Important feature is broken or significantly degraded; workaround exists | Foresight module throws error on load; Sentinel alert not firing |
| P3 — Minor | Feature works but produces incorrect, incomplete, or inconsistent results | Wrong genre shown in title comparison; incorrect revenue proxy figure |
| P4 — Cosmetic | Visual or UX issue with no functional impact | Icon misaligned; hover state wrong colour; font size inconsistency |

## NBI Brand Standards (Relevant for UI Testing)

- Colour scheme: dark theme, electric blue accents (#0066FF or similar)
- Typography: Orbitron font for Playsage headings; JetBrains Mono and Outfit also used in the prototype
- Aesthetic: gaming industry, cinematic, not corporate
- If a UI element looks "corporate" or "template", flag it as a P4 with a note referencing brand standards

## Tools in Use

| Tool | Use |
|---|---|
| ClickUp (or equivalent) | Bug tracking, test case management, sprint board |
| Vercel | Preview deployments for Playsage |
| Browser DevTools | Console error checking, network request inspection |
| Screen recording tool | Bug reproduction attachments |
| Supabase dashboard | Database state verification (read access only) |

## Key People the QA Engineer Works With

| Person | Role | Context |
|---|---|---|
| QA Lead | Direct manager | Assigns test plans, reviews bugs, makes ship decisions |
| Engineers | Senior/Mid engineers | Fix the bugs filed by QA; do not receive quality verdicts directly — route through QA Lead |
| VP Product | Owns product requirements | Source of truth on what "expected behaviour" means at a feature level |
| Glen Pryer | Managing Director | Extremely high bar for quality and accuracy. Hates shallow work, corner-cutting, and hallucinations in all forms |
