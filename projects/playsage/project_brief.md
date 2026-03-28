# Project Brief — Playsage

**Project name:** Playsage — Gaming Industry Intelligence Platform
**Project lead:** Glen Pryer
**Date created:** 2026-03-28
**Last updated:** 2026-03-28
**Status:** STALLED

---

## Purpose

Playsage is a B2B SaaS gaming intelligence platform that converts publicly available and studio-provided gaming data into integrated, actionable decision intelligence. It targets AA-to-AAA live-service studios that currently rely on fragmented, expensive tools (Sensor Tower, Newzoo, GameRefinery) offering isolated data views with no connective intelligence layer. The platform's core moat is the Cascade Engine, which links signals across all ten modules to surface connected insights that competitors cannot replicate. A $10M USA LLC raise is planned once foundational deliverables are complete.

---

## Scope

### In scope
- 10-module gaming intelligence platform (full list in knowledge/project_context.md)
- Cascade Engine architecture (cross-module signal integration)
- Standalone USA LLC legal and cap table structure
- Investor pitch materials and $10M seed/Series A raise
- GDC-ready offline demo (Docker Compose, 4 genres, 12 real titles, 38 synthetic)
- PRD v1.3 (corrections to v1.2's 60+ identified issues)
- Claude Code Master Instruction Document for development handoff
- SalarySage as a future module/feature — not scoped in v1 build
- Tech stack: Next.js App Router, Tailwind CSS + shadcn/ui, Supabase PostgreSQL, Vercel

### Out of scope
- Console store data in v1 (planned post-launch expansion)
- Self-serve indie tier (v1 targets AA-to-AAA studios only)
- Publisher portfolio dashboards (later expansion)
- Investor portfolio analytics tier (later expansion)
- SalarySage integration into Playsage (separate project — see projects/salarysage)

---

## Success Criteria

| Criterion | Measurement |
|---|---|
| Raise $10M | USA LLC term sheet signed, funds received |
| PRD v1.3 complete and red-team score 8.5+/10 | Structured re-review against v1.2 critique checklist |
| Cascade Engine architecture documented | Deliverable 2 signed off by Glen |
| Pitch deck ready for investor outreach | Glen approves for distribution |
| Claude Code instruction doc complete | Developer can begin build without Glen in the loop |
| First 3 paid Starter customers signed | Contracts executed at $1,500/month |
| Y1 ARR hits $780K (upside) or $126K (conservative floor) | Revenue tracking in QuickBooks |

---

## Deliverables

| Deliverable | Owner | Due | Status |
|---|---|---|---|
| Consolidated Decision Document v3 | Glen Pryer | Feb 2026 | Done |
| PRD v1.3 (corrections to v1.2) | Glen Pryer + Claude | TBD — stalled since ~20 Feb 2026 | Stalled |
| Cascade Engine Architecture Document | Glen Pryer + Claude | TBD | Not started |
| Pitch Deck (investor-ready) | Glen Pryer + Claude | TBD | Not started |
| Claude Code Master Instruction Document | Glen Pryer + Claude | TBD | Not started |
| Demo build (GDC-ready) | TBD developer | TBD | Status unknown — Glen to confirm |
| USA LLC formation | Glen Pryer + legal | TBD | Not started |

---

## Dependencies

| Dependency | Provided by | Status |
|---|---|---|
| Glen's input on 10 outstanding PRD decision points | Glen Pryer | Pending — stalled ~20 Feb 2026 |
| Resolution of PRD red-team issues (60+ items) | Glen Pryer + Claude | Pending |
| GDC demo status update | Glen Pryer | Unknown — needs confirmation |
| USA LLC legal formation | US legal counsel | Not started |
| Advisory board confirmation (Vardis, Aris + TBD) | Glen Pryer | Partial — Couch Heroes CEOs noted in decision doc |
| Licensed data feed contracts (Pillar 1) | TBD data providers | Not started |
| Studio partnership data agreements (Pillar 3) | Glen Pryer / NBI client relationships | Not started |

---

## Key Decisions

| Decision | Chosen approach | Rationale | Date |
|---|---|---|---|
| Tech stack | Next.js App Router + Tailwind + shadcn/ui + Supabase + Vercel | Modern, scalable, fast iteration; Supabase handles auth + DB without custom backend | Locked in v3 decision doc |
| Pricing — Starter | $1,500/month | Accessible entry for AA studios, recoupable in first consultant hire savings | Locked in v3 decision doc |
| Pricing — Pro | $5,000/month | Positions as premium operational tool, not a commodity data sub | Locked in v3 decision doc |
| Pricing — Enterprise | $12,000-20,000/month custom | Enables large publishers and platform holders to self-define scope | Locked in v3 decision doc |
| Raise target | $10M | Funds 3-year runway to Y3 profitability in upside case | Locked in v3 decision doc |
| Legal structure | USA LLC | Clean cap table, investor-friendly, separate from NBI Analytics Ltd | Locked in v3 decision doc |
| Beachhead | AA-to-AAA live-service studios | Highest willingness to pay; Glen has direct relationships; lower churn risk | Locked in v3 decision doc |
| The Sage v1 approach | Rule-plus-heuristic hybrid (not pure LLM) | LLM-only overclaims accuracy; hybrid is honest, shippable, and defensible | v1.2 red-team correction |
| Demo strategy | Offline Docker Compose fallback | GDC Wi-Fi unreliable; cannot demo on conference floor without guaranteed connectivity | Locked in v3 decision doc |

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| PRD stalls indefinitely with no one driving it | High (already stalled 5+ weeks) | High — blocks all downstream deliverables | Assign dedicated revival session; break into smaller sprint chunks |
| GDC demo was not built or shown — opportunity lost | Medium | High — primary investor hook was the demo | Glen to confirm status; plan next demo opportunity if missed |
| Sensor Tower price competition / feature catch-up | Medium | High | Differentiate on Cascade Engine and decision layer, not raw data breadth |
| Data Pillar 1 (licensed feeds) costs exceed budget | Medium | High | Model per-customer cost at each tier; validate before pitch |
| Platform ToS enforcement (scraping risk) | Medium | High | Legal review per platform; CFAA/hiQ analysis already done; diversify to licensed feeds |
| Studio partnership data flywheel takes too long to seed | High | High | Use NBI consulting clients as first data partners; Glen's relationships are the wedge |
| Name conflict — "Playsage" also proposed as company trading name | High | Medium | Explicit decision needed: one brand or two? Must resolve before trademark filings |
| $10M raise fails or takes longer than modelled | Medium | High | Conservative base case modelled; bootstrapping from NBI consulting revenue is the floor |

---

## Stakeholders

| Name | Role | Involvement |
|---|---|---|
| Glen Pryer | Product owner, project lead | Drives all decisions and output |
| Tom Rieger | Partner | Aligned; advisory board scope TBD |
| Vardis (Couch Heroes CEO) | Advisory board contact | Listed in decision doc; not yet formally confirmed |
| Aris (Couch Heroes COO) | Advisory board contact | Listed in decision doc; not yet formally confirmed |
| Target investors | $10M raise recipients | TBD — outreach not yet started |

---

## Timeline

| Milestone | Target Date | Status |
|---|---|---|
| Decision Document v3 complete | Feb 2026 | Done |
| PRD v1.2 complete | Feb 2026 | Done (7.1/10) |
| PRD v1.3 corrections complete | TBD | Stalled since ~20 Feb 2026 |
| Cascade Engine architecture document | TBD | Not started |
| Pitch deck complete | TBD | Not started |
| Claude Code master instruction doc | TBD | Not started |
| USA LLC formed | TBD | Not started |
| Investor outreach begins | TBD | Blocked on pitch deck |
| $10M raised | TBD | Blocked on all above |
| Development begins | TBD | Blocked on Claude Code doc |

---

## Notes

**Revival priority:** All downstream deliverables (Cascade Engine doc, pitch deck, Claude Code master instruction, investor outreach, development) are blocked on PRD v1.3 completion. The PRD stalled at approximately 20 February 2026 with Glen needing to answer ~10 outstanding decision points and ~60+ text corrections not yet applied. This is the single highest-leverage thing to unblock.

**Name ambiguity:** "Playsage" currently refers to both the software product and the proposed trading name for NBI. This dual usage is unresolved. A decision is needed before trademark applications are filed (USPTO Class 35 and 41, UK IPO, EUIPO pending).

**SalarySage relationship:** SalarySage is a confirmed future module of Playsage, not a separate product. Integration architecture is undefined. See projects/salarysage for current state.

**GDC 2026:** The original plan was a GDC demo. Whether this happened is unknown. Glen needs to confirm and brief the team on what was shown, to whom, and what the reaction was.

**Financial projections source:** All figures are from the v3 decision document. The upside case assumes 14 customers in Y1 ($780K ARR) and cash-flow positive at Y3 with 130 customers ($11.4M ARR). The conservative case reaches $4.6M ARR at Y3 and requires a Series A.
