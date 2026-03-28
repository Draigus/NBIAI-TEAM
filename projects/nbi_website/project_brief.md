# Project Brief — NBI Website Redesign

**Project name:** NBI Website Redesign (gaming-first repositioning)
**Project lead:** Glen Pryer
**Date created:** 2026-03-28
**Last updated:** 2026-03-28
**Status:** STALLED — prototype complete, not deployed

---

## Purpose

The current NBI website (nbi-consulting.com, Framer, scored 4.8/10) does not reflect the business NBI actually is. It presents three service areas with equal weight, buries the gaming practice, and has a near-empty hero section on load. A full HTML/CSS prototype has been built in the Claude Chat "About NBI" project that corrects all of this: gaming-first positioning, studio-native language, six service pages built around real client problems, and a dark gaming aesthetic. The prototype is complete but has not been deployed. A hosting and deployment decision is needed before this can go live.

An additional complication: the company is evaluating a brand rename to "PlaySage" (or "Playsage"), which would affect the website's name, domain, and all copy. This decision must be resolved before full deployment.

---

## Scope

### In scope
- Deploy or host the existing HTML/CSS prototype (10 files)
- Add 4 missing active clients to the website carousel (Lighthouse Studios, Sarge Universe, Couch Heroes, Goals Studio)
- Resolve the Netlify/Vercel direct hosting vs Framer recreation decision
- Resolve brand rename (NBI vs PlaySage) before deploying publicly
- Update copy and brand elements if rename proceeds
- Confirm Tom Rieger's practice area framing (studio health reframing in gaming language)

### Out of scope
- Full redesign from scratch (prototype is the agreed design direction)
- New service pages beyond the 6 already built
- Adding a blog or news section (not discussed)
- E-commerce or payment integration
- Any content management system (static prototype is the working approach)

---

## Success Criteria

| Criterion | Measurement |
|---|---|
| Site live and publicly accessible | URL resolves, no broken links |
| Gaming is the primary practice area on every page | Visual hierarchy and copy review |
| 4 missing active clients added to carousel | All 4 appear on live site |
| Brand name confirmed and applied consistently | No references to old name on live site |
| Hero section loads fully on first visit (no near-empty screen) | Browser test on load |
| Site scores 7.5+/10 on a repeat assessment | Structured assessment using same criteria as Feb 2026 review |
| Primary CTA (Book a Call / Contact) present on all key pages | Navigation and page review |

---

## Deliverables

| Deliverable | Owner | Due | Status |
|---|---|---|---|
| Hosting/deployment decision (Netlify vs Framer) | Glen Pryer | TBD | Not decided |
| Brand rename decision (NBI vs PlaySage) | Glen Pryer | TBD | Pending trademark checks |
| Deploy prototype to chosen hosting | Glen Pryer + Claude | TBD | Not started |
| Add 4 active clients to carousel | Glen Pryer + Claude | TBD | Not started |
| Update copy if brand rename confirmed | Glen Pryer + Claude | TBD | Not started |
| Team bios | Glen Pryer (source from LinkedIn) | TBD | Not started |
| Case studies | Glen Pryer | TBD | Not started — identified as priority gap |
| Outcome metrics documentation | Glen Pryer | TBD | Not compiled |

---

## Dependencies

| Dependency | Provided by | Status |
|---|---|---|
| Brand rename decision | Glen Pryer | Pending — trademark/domain checks not yet done |
| Playsage.com domain availability | Glen Pryer / legal | Not checked |
| USPTO + UK IPO + EUIPO trademark searches | Legal counsel | Not started |
| Social handle availability (LinkedIn, X, Instagram) for PlaySage | Glen Pryer | Not checked |
| UK immigration solicitor confirmation re: trading name change | Immigration solicitor | Not started |
| Tom Rieger alignment on studio health reframing | Tom Rieger | Confirmed aligned per NBI_Brain.md |
| Client permissions for logo use (new 4 clients) | Glen Pryer | Not confirmed |
| Netlify or Vercel account (if not using Framer) | Glen Pryer | Not set up |

---

## Key Decisions

| Decision | Chosen approach | Rationale | Date |
|---|---|---|---|
| Brand/business structure | One company, two practice areas (Gaming + Human Capital) | Avoids confusing two-website split; gaming leads, Tom's practice area is secondary | Confirmed per NBI_Brain.md |
| Design direction | Dark theme, electric blue accents, Orbitron + JetBrains Mono + Outfit fonts | Confirmed by Glen; reflects gaming industry aesthetic | Feb 2026 |
| Colour scheme | Dark background, electric blue accents | Glen confirmed: hates orange, likes electric blue | Feb 2026 |
| Tom's HC practice framing on gaming site | "Studio Health and Team Performance" — reframed in gaming language | Avoids corporate org-health language that gaming studios would reject | Feb 2026 |
| Primary CTA | Book a Call / Contact | Lead generation and credibility are co-equal goals | Feb 2026 |
| Hosting decision | NOT YET DECIDED | Option A: Netlify or Vercel direct hosting; Option B: recreate in Framer using prototype as blueprint | Pending |
| Brand rename | NOT YET DECIDED | "PlaySage" or "Playsage" proposed — pending trademark and domain checks | Pending |

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Brand rename not resolved; site deployed under old name then renamed | High | Medium — wasted rework | Resolve rename before deploying publicly; staging deploy acceptable |
| Framer option selected but prototype recreation takes significant time | Medium | Medium | Netlify/Vercel direct hosting is faster; use prototype as-is |
| 4 active clients do not consent to logo use on public site | Low | Low — omit if no consent | Confirm with each client before going live |
| Hero section animation/load issue not fixed in deployment | Medium | Medium | Test on actual hosting before launch; the issue exists in the Framer version, not confirmed in the HTML prototype |
| PlaySage trademark/domain blocked or contested | Medium | High | Run trademark searches before committing to name; check domain before announcing publicly |
| Tom's HC work framed wrong and alienates gaming clients | Medium | High | Use prototype's "Studio Health and Team Performance" framing; avoid corporate language |
| Case studies and team bios still absent at launch | High | Medium | Launch without them as first phase; add in sprint 2 |

---

## Stakeholders

| Name | Role | Involvement |
|---|---|---|
| Glen Pryer | Owner, decision authority | All decisions; approves before any public deployment |
| Tom Rieger | Partner | Aligned with gaming-first direction; his practice area framing needs to work for gaming clients |
| Bryan Rasmussen | CFO | Financial approval for any paid hosting or domain costs |

---

## Timeline

| Milestone | Target Date | Status |
|---|---|---|
| Hosting decision made | TBD | Not decided |
| Brand rename resolved | TBD | Pending trademark/domain checks |
| Prototype deployed to staging | TBD | Not started |
| 4 active clients added | TBD | Not started |
| Brand copy updated (if rename) | TBD | Pending rename decision |
| Site live publicly | TBD | Blocked on all above |
| Team bios added | TBD | Not started |
| Case studies added | TBD — future phase | Not started |

---

## Notes

**Current site score:** 4.8/10. Assessed February 2026 in the Claude Chat "About NBI" project.

**Prototype location:** 10 HTML/CSS files built in the Claude Chat "About NBI" project. Not saved to a local or cloud repository — may need to be retrieved from Claude Chat or rebuilt from that conversation history.

**Why the hero section is broken on the current Framer site:** animation timing issue causes the hero to load as a near-empty dark screen. This is a known issue with the existing site, not the prototype.

**Tom's practice area:** All discussions confirm Tom is aligned with the gaming-first direction. His org health / human capital work should appear on the site as "Studio Health and Team Performance" framed in studio-native language. This avoids the cultural disconnect between corporate behavioural science language and gaming studio culture.

**LinkedIn:** NBI has a company LinkedIn page that is inactive. Any website launch should be paired with a LinkedIn activation plan, but this is not in scope for the website project itself.
