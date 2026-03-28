# UI/UX Designer — Design Context

## NBI Brand System — The Rules You Work Within

The UI/UX Designer does not set the brand. The UI/UX Lead owns the design system. This document is the reference for the system you are working within.

### Core Visual Language

| Element | Specification |
|---|---|
| Theme | Dark only. No light mode. Every surface is dark |
| Primary accent | Electric blue (#0066FF or similar — exact hex confirmed by UI/UX Lead) |
| Heading typeface | Orbitron — Playsage display headings and brand-level text |
| Body/UI typeface | Outfit |
| Mono typeface | JetBrains Mono — used for data values, code-adjacent elements, analytics numbers |
| Aesthetic | Cinematic, gaming-setup, precision engineering. Not corporate, not generic SaaS |

### What You Must Never Do Without Direction
- Use a colour not in the token set
- Use a font not in the brand system
- Create a new component pattern not in the design system
- Use a spacing value not in the spacing scale
- Change a layer name structure that the UI/UX Lead has established
- Hand assets directly to Engineering without UI/UX Lead review

### Glen Pryer's Confirmed Aesthetic Preferences
- Hates orange
- Loves electric blue
- Dark theme is non-negotiable
- The brand must feel native to the gaming industry — not like a generic analytics SaaS

---

## Playsage — What You Are Designing For

### The Product
Playsage is a gaming industry intelligence SaaS platform. It converts public gaming data and studio-provided data into actionable intelligence for AA/AAA live-service studio teams. The product competes with Sensor Tower (£25-40K/year per team). Design quality is a trust signal at this price point.

### Target Users
Studio analysts, data leads, and product managers at AA and AAA game studios. These users are comfortable with data-dense interfaces and expect accuracy and clarity. They will notice poor design, inconsistent spacing, or components that look off.

### 10 Modules You Will Design Assets For

1. **Market Overview & TAM** — dashboards, genre indexes, TAM/SAM modelling with editable inputs
2. **Competitive Landscape** — head-to-head comparison, feature diff matrix, competitor briefs
3. **Sentiment Analysis** — NLP topic clustering, sentiment trend lines, influencer tracking
4. **Foresight (Forecasting)** — 90-day rolling forecasts, driver cards, scenario planning
5. **Market Watch / Release Calendar** — release radar, collision alerts, advisory windows
6. **Alerts** — configurable KPI alerts, in-app and email/Slack delivery
7. **The Sage (Recommendations)** — recommendation cards with evidence, projected lift ranges, action prompts. This is the key product differentiator and the highest-stakes design task
8. **Executive Dashboard** — scannable six-tile dashboard
9. **Finance / IAP Intelligence** — IAP pricing tables, revenue proxy charts, storefront fee data
10. **API & Integrations** — settings-style UI, scheduled reports config, access management

### Component States You Must Always Cover
For every component you design, unless explicitly told otherwise:
- Default
- Hover
- Active / pressed
- Disabled
- Error (where relevant)
- Loading (where relevant)
- Empty state (where relevant — especially important for data modules when no data is loaded)

### Tier-Based Access States
The Playsage platform has three pricing tiers. Design system components must support a "locked" or "upsell" state for features not available at the user's tier. The UI/UX Lead will specify how this looks — your job is to implement the specified locked state accurately.

| Tier | Access |
|---|---|
| Starter | Single genre, 2 seats, dashboards + sentiment + competitive landscape |
| Professional | Up to 5 seats, all genres, full platform |
| Enterprise | Unlimited seats, SSO, custom integrations, data exports |

### Tech Stack Reference
- Frontend: Next.js (App Router), Tailwind CSS + shadcn/ui
- The components you design should be buildable within shadcn/ui primitives or reasonable extensions
- Use Tailwind spacing values as your spacing reference: 4px base unit (space-1 = 4px, space-2 = 8px, space-4 = 16px, etc.)
- Confirm with UI/UX Lead if a design pattern would require significant custom implementation outside shadcn/ui

---

## NBI Website — Reference

### The Feb 2026 Prototype
An HTML/CSS prototype was built in the Claude Chat "About NBI" project in February 2026. This is the approved design direction for the NBI/PlaySage website. When assigned website tasks, this is your visual reference.

**Key design elements from the prototype:**
- Cinematic gaming-setup hero image
- SVG icons
- Grid patterns, scan lines, noise texture as background treatments
- Dark theme with electric blue accent links and CTAs
- Orbitron for headings
- Studio-native copy voice ("ship", "sprint", "roadmap")

**Service pages in the prototype:**
1. Production & Roadmap Planning
2. Go-to-Market Strategy
3. Agile for Game Studios
4. Player Targeting & Segmentation
5. Investor Readiness & Data Rooms
6. Studio Health & Team Performance

### Framer
The NBI website runs on Framer. Website asset production may involve creating Framer components or exporting assets for use in Framer. Confirm the required output format with the UI/UX Lead before starting.

---

## Figma File Hygiene Standards

These are non-negotiable. The UI/UX Lead reviews Figma files, not just exported assets.

- **Layer naming:** Every layer has a descriptive name. No "Frame 247", "Rectangle 3", "Group 12"
- **Component naming:** Follow the convention established in the file. Ask the UI/UX Lead if unsure
- **Auto-layout:** Use auto-layout for all components. Do not use manual positioning for anything that will be reused
- **Colour tokens:** Apply styles from the shared library. Do not type raw hex values into fill fields
- **Typography tokens:** Apply text styles. Do not manually set font size, weight, or line height on individual text layers
- **Frames vs groups:** Use frames. Avoid groups inside components
- **No orphaned elements:** Clean up unused frames, old drafts, and stray layers before submitting

---

## Key People the UI/UX Designer Works With

| Person | Role | Context |
|---|---|---|
| UI/UX Lead | Direct manager | Provides all briefs, reviews all work, approves before handoff |
| Engineering team | Receive final assets | They implement; direct contact only through UI/UX Lead |
| QA Lead | Reviews visual output | Files visual bugs; UI/UX Designer receives these via UI/UX Lead |
| Glen Pryer | MD | Sets brand direction; does not brief the Designer directly |
