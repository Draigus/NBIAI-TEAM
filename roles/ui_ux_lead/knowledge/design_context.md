> **Note:** This file contains legacy role knowledge that has been consolidated into the composite `AGENT.md` file in the parent role directory. The AGENT.md file is the operational version used by the dispatch system. This file is retained as the design record.

# UI/UX Lead — Design Context

## NBI Brand Identity

### Core Visual Language
The NBI/PlaySage brand is built for a gaming industry audience. It should look like it belongs at GDC, not at a management consulting conference. The visual system is:

- **Theme:** Dark background, always. Light mode is not part of the brand
- **Primary accent:** Electric blue (#0066FF or similar — exact hex to be confirmed as brand is formalised under the PlaySage name)
- **Heading typeface:** Orbitron — used for Playsage product headings and brand-level display text
- **Secondary typefaces used in the Feb 2026 prototype:** JetBrains Mono (code/data aesthetic), Outfit (body and UI text)
- **Aesthetic keywords:** Cinematic, gaming-setup, dark, precision, not corporate
- **Glen's confirmed preferences:** Hates orange. Likes electric blue. Dark theme is locked

### What the Brand Must Not Look Like
- Generic SaaS dashboard (the Notion or Linear aesthetic is wrong for this audience)
- Corporate management consultancy (suits and flowcharts)
- A student portfolio project
- Anything that would look out of place on a gaming analytics product

### PlaySage — Brand Rename Status
NBI is in the process of renaming to PlaySage. This affects both the company trading name (NBI Analytics Ltd trading as PlaySage) and the Playsage product. The rename is pending trademark and domain checks. Design should prepare for a unified PlaySage brand while still working under NBI naming until the rename is confirmed.

---

## Playsage Product Design

### What Playsage Is
A gaming industry intelligence SaaS platform. The product converts publicly available and studio-provided gaming data into actionable intelligence for AA and AAA live-service studios. The target user is a studio analyst, data lead, or product manager who needs to track competitors, forecast engagement, and get recommendations — without building their own analytics stack.

### Target Users
- **Primary:** Analysts and data leads at AA/AAA live-service studios
- **Secondary:** Studio heads, product managers, CPOs
- **Profile:** Comfortable with data-dense interfaces, used to dashboards like Sensor Tower or internal studio BI tools. Low tolerance for friction. High expectation of accuracy

### Competitive Context (Why Design Matters)
Playsage competes with Sensor Tower, AppMagic, and Newzoo. Sensor Tower (post-data.ai acquisition) charges £25-40K/year per team. The design quality must be credible at that price point. If Playsage looks cheap or amateurish, the pricing pitch collapses. Design is a sales instrument here.

### 10 Modules — Design Considerations

**1. Market Overview & TAM**
Dashboards with genre performance indexes. TAM/SAM modelling with editable assumptions. Collaborative notes. Design must handle data tables, charts, and modelling inputs in a cohesive, scannable layout.

**2. Competitive Landscape**
Head-to-head title comparison, feature diff matrix (monetisation, event cadence, pricing), automated competitor briefs. The diff matrix is a high-complexity UI component requiring careful design of comparison columns, row categorisation, and highlight logic.

**3. Sentiment Analysis**
NLP topic clustering from app store and Steam reviews. "Since Last Update" view. Influencer sentiment tracking. Data visualisation is key here — cluster maps, trend lines, sentiment scores. Must feel analytical, not consumer-product.

**4. Foresight (Forecasting)**
Rolling 90-day engagement and revenue-proxy forecasts. Backtest accuracy displayed alongside forecasts. Driver cards showing what moves the needle. Scenario planning lives here as a separate workflow. This is a high-information-density module.

**5. Market Watch / Release Calendar**
Release radar with projected impact tags. Collision alerts. Advisory windows for safe launch timing. Calendar-based UI with overlay logic. Must handle temporal data clearly.

**6. Alerts**
Configurable alerts on any KPI — threshold, spike, slope change, competitor update. Delivered in-app and via email/Slack. Alert configuration UI must be powerful but not overwhelming.

**7. The Sage (Recommendations)**
The standout differentiator. Rule-plus-model hybrid advisor that ties evidence to recommended actions with projected lift ranges. This is the "decision layer". Designing The Sage's recommendation cards is one of the most important UI design tasks on the product — the recommendations must feel credible, structured, and actionable, not like generic AI outputs.

**8. Executive Dashboard & Scenario Planning**
Scannable six-tile dashboard. Scenario planning is a separate workflow in Foresight, not inline. The dashboard is a consumption surface — design for scanning, not deep reading.

**9. Finance / IAP Intelligence**
IAP pricing analysis, storefront fee tracking, revenue proxy modelling. Financial data UI — precision and trust are paramount. Every number must feel like it was deliberately placed.

**10. API & Integrations**
Scheduled reports, role-based access, data provenance, export capabilities. Developer-friendly, settings-style UI. Less visually demanding than the analytical modules but must maintain the brand aesthetic.

### Cascade Engine
The cross-module integration intelligence layer. In UI terms: when Cascade fires, a signal from one module surfaces as a contextual connection in related modules. Design must handle these cross-module notification patterns without cluttering the primary view of each module.

### Pricing Tiers — Role-Based Access Design Implications
| Tier | Access |
|---|---|
| Starter | Single genre, 2 seats, dashboards + sentiment + competitive landscape only |
| Professional | Up to 5 seats, all genres, full platform including Foresight + The Sage |
| Enterprise | Unlimited seats, SSO, custom integrations, data exports |

Designs must account for locked/upsell states for features unavailable at lower tiers. These should feel like a natural part of the product, not aggressive paywalls.

### Tech Stack — Design Constraints
- **Frontend:** Next.js (App Router), Tailwind CSS + shadcn/ui
- **Components:** Design must be achievable within shadcn/ui component primitives or reasonable custom extensions of them
- **Hosting:** Vercel
- **Design must not require:** Complex animations that Vercel SSR cannot support, non-standard fonts that are not loadable via Google Fonts, or UI patterns that conflict with Tailwind's utility-first approach

---

## NBI Website Design

### Current State
- **Platform:** Framer
- **URL:** nbi-consulting.com
- **Assessment score:** 4.8/10 (Feb 2026 review)
- **Problems identified:** Near-empty hero on load (animation timing issue), extremely thin content, three co-equal service pillars (dilutes gaming message), no conversion strategy beyond "Get Started"

### Feb 2026 Prototype (Design Reference)
A full HTML/CSS prototype was built in the Claude Chat "About NBI" project. This is the design direction to follow:
- 10 files: Homepage (index.html), 6 service pages, About page, Contact page, shared CSS
- Service pages named after real problems studios face, not generic consulting categories
- Copy in studio-native language: "ship", "roadmap", "sprint", "greenlight"
- Homepage leads with studio pain points, not what NBI is
- Design: Orbitron + JetBrains Mono + Outfit. Dark theme, electric blue accents. Cinematic gaming-setup hero image, SVG icons, grid patterns, scan lines, noise texture
- Status: Prototype complete. NOT yet deployed to Framer. The prototype is the approved design direction

### 6 Service Pages in the Prototype
1. Production & Roadmap Planning
2. Go-to-Market Strategy
3. Agile for Game Studios
4. Player Targeting & Segmentation
5. Investor Readiness & Data Rooms
6. Studio Health & Team Performance (Tom Rieger's org health work reframed in gaming language)

### Website Design Principles
- Gaming leads everything. The NBI website must signal "we are gaming people" within three seconds of load
- Org health / human capital is the secondary practice area — present it in gaming language, not corporate HR language
- Primary CTA: Book a call / Contact
- Social proof is a strength: Blizzard, Xbox, NASA logos, executive-level testimonials. Feature prominently
- Do not replicate the prior website's fatal flaw: equal weight to three pillars dilutes all of them

---

## Design System Status

As of the time this file was written, a formal Playsage design system in Figma has not been built. The Feb 2026 prototype established visual language informally. Building the design system from scratch is a priority task for the UI/UX Lead when assigned.

### What the Design System Must Cover
- Colour tokens (primary, secondary, accent, surface, background, error, warning, success)
- Typography scale (display/h1/h2/h3/body/caption/mono)
- Spacing scale (consistent with Tailwind defaults where possible)
- Core components: Button (all variants), Input, Select, Card, Badge, Table, Chart wrapper, Modal, Alert/Toast, Navigation, Sidebar
- All states: default, hover, active, disabled, error, loading, empty
- Dark theme only — no light mode components required

---

## Key People the UI/UX Lead Works With

| Person | Role | Context |
|---|---|---|
| CTO | Direct manager | Technical constraints, stack decisions, approval authority |
| UI/UX Designer | Direct report | Executes assets, components, and prototypes under UI/UX Lead direction |
| VP Product | Peer | Provides user stories and acceptance criteria; collaborates on feature scope |
| Engineering (Senior/Mid Engineers) | Peer | Receive and implement design specs; raise feasibility concerns |
| QA Lead | Peer | Files visual bugs and brand consistency issues |
| Glen Pryer | MD | Sets brand direction; must approve any brand-level design changes |
