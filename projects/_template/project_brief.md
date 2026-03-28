# Project Brief: Playsage Homepage Redesign

> This is a completed example project brief. It demonstrates how a real project brief should look when filled in using the project_brief.md template. The project used here (Playsage Homepage Redesign) is hypothetical, but the structure, level of detail, and specificity represent the expected standard for all project briefs in this folder.

---

**Project name:** Playsage Homepage Redesign
**Project lead:** VP Product Agent
**Date created:** 2026-03-28
**Last updated:** 2026-03-28
**Status:** Planning

---

## Purpose

The current Playsage application has no polished public-facing homepage — the application boots directly into the dashboard on login. Before any investor demo or customer pilot, Playsage needs a homepage that communicates what the product is, who it is for, and why it is better than Sensor Tower. This redesign creates that first-impression surface: a conversion-oriented landing page that can be shown to prospective studio customers and investors without requiring a live demo walkthrough.

## Scope

### In scope
- A single-page marketing homepage at the root URL (`/`) of the Playsage Next.js application
- Hero section with product headline, sub-headline, and primary CTA ("Request Access" or "Book a Demo" — to be confirmed with Glen)
- Module overview section covering the 10 core Playsage modules at a high level
- Cascade Engine feature callout — this is the key differentiator and must be prominently positioned
- Social proof section: advisory contacts (Vardis and Aris from Couch Heroes are confirmed), NBI's client history (Blizzard, Xbox, NASA, etc.)
- Pricing tier overview (Starter $1,500/mo, Professional $5,000/mo, Enterprise custom)
- CTA section at the bottom of the page linking to the demo request flow
- Mobile responsive layout (this page will be shared via link; mobile viewing is expected)

### Out of scope
- The actual onboarding or sign-up flow (that is a separate project)
- Individual module landing pages (homepage only at this stage)
- Blog, changelog, or documentation sections
- Any changes to the authenticated application (dashboard, modules, etc.)
- Multilingual versions
- A/B testing infrastructure

## Success Criteria

| Criterion | Measurement |
|---|---|
| The homepage accurately describes what Playsage is | Glen reviews the copy and confirms it is consistent with the product decisions in the v3 decision document |
| Cascade Engine differentiation is clear | A person with no prior Playsage knowledge can read the page and explain what Cascade Engine does |
| Pricing is presented correctly | Tier names, prices, and feature inclusions match the locked pricing decisions exactly |
| Visual design matches the Playsage design system | Dark background, electric blue accents, Orbitron for display text, no orange anywhere |
| Page loads in under 3 seconds on a standard broadband connection | Measured with Chrome DevTools network throttling at 25 Mbps |
| Page is mobile-responsive at 375px, 768px, and 1440px widths | Manual visual check at all three breakpoints |
| Glen approves the page for use in investor and customer contexts | Glen gives explicit written sign-off |

## Deliverables

| Deliverable | Owner | Due | Status |
|---|---|---|---|
| Requirements specification | VP Product Agent | 2026-04-04 | Not started |
| Approved design wireframes (all sections, all states) | UI/UX Lead Agent | 2026-04-11 | Not started |
| Implemented homepage (all sections, responsive) | Senior Engineer Agent | 2026-04-21 | Not started |
| QA sign-off (final Opus pass) | QA Lead Agent | 2026-04-23 | Not started |
| Glen approval for production deployment | Glen Pryer | 2026-04-24 | Not started |
| Deployed to production Vercel | DevOps Agent | 2026-04-25 | Not started |

## Dependencies

| Dependency | Provided by | Status |
|---|---|---|
| Confirmed CTA destination (demo request flow or external Calendly link) | Glen Pryer | Pending |
| Confirmed advisory contact names and titles for social proof section | Glen Pryer / VP Product | Pending — Vardis and Aris confirmed, need full names and titles for public use |
| Final pricing copy approval | Glen Pryer | Available — v3 decision document has confirmed pricing |
| Hero image or visual asset (cinematic gaming-setup style) | UI/UX Lead or Glen | Pending — established in HTML prototype but needs production-quality asset |
| Playsage domain / URL confirmed | Glen Pryer / DevOps Agent | Pending — playsage.com domain check noted as a high-priority open item in brand decisions |

## Key Decisions

| Decision | Chosen approach | Rationale | Date |
|---|---|---|---|
| Tech stack for homepage | Next.js App Router (same stack as full application) | Consistent with locked stack; no separate static site infrastructure needed | 2026-03-28 |
| Pricing display | Show all three tiers with prices | Glen has confirmed pricing is locked; transparency on pricing supports enterprise qualification | 2026-03-28 |
| CTA action | TBD — either "Request Access" (in-app form) or "Book a Demo" (Calendly or equivalent) | Pending Glen's confirmation of preferred conversion path | Open |
| Design system | Dark background, electric blue, Orbitron — consistent with Playsage product UI | Consistency between the homepage and the product builds trust and brand recognition | 2026-03-28 |

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Playsage.com domain not available, changing the production URL | Medium | High — any deployed homepage URL must be shareable with investors | Run domain check before starting design. If playsage.com is unavailable, Glen decides on alternative before work begins |
| Brand name still in flux (NBI potentially renaming to PlaySage) | High | Medium — homepage may need to be built under a provisional brand | Scope homepage content to be brand-name-agnostic where possible; finalise name before production deploy |
| Advisory contacts (Vardis, Aris) not approved for public use | Low | Medium — social proof section loses its strongest current examples | Confirm with Glen before including names on a public page; have fallback copy that references "game studio advisors" without naming them |
| Copy overclaims on Cascade Engine or The Sage | Medium | High — investor due diligence will scrutinise these claims; PRD red-team found overclaims in v1.2 | All product claims on the homepage must be reviewed against the v3 decision document before Glen approval |

## Stakeholders

| Name | Role | Involvement |
|---|---|---|
| Glen Pryer | Board Operator | Approves all external-facing content; final sign-off required before production deploy |
| VP Product Agent | Project lead | Owns requirements, reviews design, approves copy for product accuracy |
| UI/UX Lead Agent | Design | Owns wireframes and visual conformance to Playsage design system |
| Senior Engineer Agent | Implementation | Builds the page |
| QA Lead Agent | Quality | Final approval before deploy |
| DevOps Agent | Deployment | Executes the Vercel production deploy |

## Timeline

| Milestone | Target Date | Status |
|---|---|---|
| Requirements spec approved | 2026-04-04 | Not started |
| Design wireframes approved by VP Product | 2026-04-11 | Not started |
| Implementation complete and in review | 2026-04-20 | Not started |
| Code review approved and merged | 2026-04-21 | Not started |
| QA testing complete — QA Lead Opus pass | 2026-04-23 | Not started |
| Glen review and production deployment approval | 2026-04-24 | Not started |
| Live in production | 2026-04-25 | Not started |

## Notes

The HTML/CSS prototype built in the Claude Chat "About NBI" project (Feb 2026) contains a strong visual reference for this homepage. The typography stack (Orbitron + JetBrains Mono + Outfit), dark theme, electric blue accents, grid patterns, scan lines, and noise texture established in that prototype should be carried forward as the design foundation. The UI/UX Lead should review that prototype before starting wireframes.

Glen has explicitly confirmed: electric blue is correct, orange is never to appear anywhere in NBI or Playsage materials.

The GDC 2026 demo status needs to be clarified with Glen — if a homepage was used or promised as part of GDC outreach, there may be investor expectations already set that this project needs to meet.
