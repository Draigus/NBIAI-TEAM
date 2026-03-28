# SDLC Stage 2: UI/UX Design

**Stage:** 02 — Design
**Triggered by:** Approved requirements specification from Stage 01
**Output:** Approved design package (wireframes, user flows, annotated screens)
**Hands off to:** Stage 03 — Architecture and Stage 04 — Implementation (in parallel, once design is approved)

---

## Overview

The design stage translates an approved requirements spec into a visual and interactive specification that engineering can implement with confidence. This stage does not begin until Stage 01 is complete. There is no "we'll figure out the design as we go" — ambiguous design handed to engineering produces inconsistent, broken interfaces.

This stage is owned by the UI/UX Lead Agent, with VP Product as the reviewing authority. The UI/UX Designer Agent does execution work under the direction of the UI/UX Lead.

---

## Inputs Required

| Input | Source | Must be true |
|---|---|---|
| Approved requirements spec | Stage 01 output | Spec must be in approved state — not draft |
| Design system reference | Existing codebase, prior HTML/CSS prototype | UI/UX Lead must have read the established visual conventions (see Design Standards below) |
| Existing screens or components | Codebase / prior prototypes | UI/UX Lead must review what already exists before designing anything new |
| VP Product handoff summary | VP Product Agent | Constraints, existing patterns, open context from requirements stage |

---

## Design Standards (Non-Negotiable)

All NBI software and web properties follow these standards. These are not suggestions. Any design that deviates requires explicit VP Product approval and a documented rationale.

### Visual Identity

**Playsage (SaaS platform):**
- Colour scheme: Dark background (#0a0a0a or equivalent near-black), electric blue accents (confirmed direction — Glen hates orange, electric blue is confirmed)
- Typography: Orbitron for headings and display text; JetBrains Mono for data/code/numbers; Outfit or equivalent clean sans-serif for body copy
- Design language: Dark gaming aesthetic — cinematic, high-contrast, purpose-built for studio professionals. Not corporate. Not consumer-app pastel. Think Sensor Tower's density with a more premium, opinionated visual layer
- Component library: shadcn/ui components, styled with Tailwind CSS to match the dark theme. Do not introduce new component libraries without CTO sign-off
- Icons: SVG-based, consistent weight and style. No emoji icons in product UI
- Texture and depth: Subtle grid patterns, scan lines, and noise texture are acceptable as aesthetic elements (established in the HTML prototype). Do not overuse — they are flavour, not structure

**NBI Website (Framer):**
- Follows the same dark/electric-blue direction as Playsage
- Framer is the platform — designs must be achievable in Framer without custom code injection unless explicitly scoped
- Gaming language throughout: "ship", "sprint", "roadmap", not "deliverable", "engagement", "solutions"

**SalarySage (static HTML):**
- Currently a standalone HTML app. Consistent with the dark aesthetic
- Any redesign work must preserve its offline-capable architecture (no CDN-dependent assets that break without internet)

### Responsive Behaviour
- Playsage: Desktop-first (studio analysts work on large screens). Must not break on 1280px minimum width. Mobile is out of scope unless explicitly in requirements
- NBI Website: Fully responsive — desktop and mobile both in scope always
- SalarySage: Desktop-only acceptable given current use case

### Accessibility
- Minimum WCAG 2.1 AA compliance for all new work
- Electric blue on dark background must be checked for contrast ratio (this combination can fail if the blue is too desaturated). Use a contrast checker; document the result
- All interactive elements must be keyboard-navigable

---

## Step-by-Step Process

### Step 1: Design Brief Review

UI/UX Lead reads the approved requirements spec in full. Before starting any design work, the Lead must be able to answer:

- Which screens or flows need to be designed? (List them explicitly)
- Which existing screens or components are being modified vs which are net-new?
- Are there existing patterns in the design system that should be reused?
- Are there any requirements that create genuine design constraints? (e.g. a requirement for a dense data table in a mobile-responsive layout is a constraint that needs flagging before starting)

If the requirements spec is ambiguous about any visual or interaction detail, the UI/UX Lead flags this to VP Product before starting design work. Do not make design assumptions on requirements questions — go back to the source.

### Step 2: User Flow Mapping

Before touching wireframes, map the user flow(s) for the feature. A user flow is a step-by-step path a user takes through the interface to complete a goal. Each flow should cover:

- The entry point (what screen/state the user is in before this flow starts)
- Each step the user takes
- Decision points (where the user can branch)
- Error states and how they are surfaced
- The end state (what the user sees when the goal is completed or fails)

User flows are written as numbered steps or diagrams — whichever is clearer for the specific flow. Both the happy path and the key error paths must be mapped.

### Step 3: Wireframe Production

UI/UX Designer Agent produces wireframes under direction from the UI/UX Lead. Wireframe standards:

- **Fidelity:** Medium fidelity. Not hand-sketchy rough boxes, but not pixel-perfect with real colours. The point is to show layout, hierarchy, and interaction — not visual polish
- **Annotations:** Every non-obvious interaction or state must be annotated. If a component has multiple states (empty, loading, error, populated), show all states
- **Tool:** HTML/CSS prototype (established tooling at NBI), or Framer if the output goes directly to the NBI website. Figma is not confirmed as a standard tool — if adopted for a project, log it as a decision
- **Coverage:** Every screen and state called out in the user flows must have a corresponding wireframe. If a state is described in requirements but not wired up, the design is not done

### Step 4: VP Product Review

UI/UX Lead presents the user flows and wireframes to VP Product for review. VP Product checks:

- Does the design address every functional requirement in the spec?
- Are all acceptance criteria achievable given the design as shown?
- Does the design follow the established visual standards (dark gaming aesthetic, correct fonts, electric blue accents)?
- Are all user-facing states covered (loading, empty, error, populated, success)?
- Is the information hierarchy correct for the user's actual task? (Dense data first for analysts; scannable summary first for studio heads)
- Does anything in the design create an implementation problem that should be flagged to the CTO before proceeding?

VP Product either approves or requests changes with specific, actionable notes. "Doesn't feel right" is not a review note — identify what specifically is wrong and what the fix should be.

### Step 5: Iteration

UI/UX Lead and Designer Agent address VP Product's review notes. Each iteration is a full re-review — VP Product does not do line-by-line markup across multiple rounds. Changes are made, then the full design is re-presented.

Maximum expected iteration rounds: 2. If the design has not been approved after 2 rounds of changes, VP Product escalates to the CEO Agent to resolve the underlying disagreement, which may trace back to an ambiguous requirement.

### Step 6: Final Design Package

Once VP Product approves, UI/UX Lead assembles the final design package:

- All user flows (annotated)
- All wireframes covering every screen and state
- Design notes for engineering: any animations, transitions, hover states, or interaction details not self-evident from static wireframes
- Component inventory: list of which existing components are reused and which new components need to be built
- A one-paragraph handoff note to VP Engineering explaining any design decisions that have technical implications

---

## What Counts as "Done" for Design

The design stage is complete when all of the following are true:

- [ ] Every screen and state from the user flows has a corresponding wireframe
- [ ] VP Product has signed off in writing (Slack, comment in document, or explicit message — not implied approval)
- [ ] All annotations are complete — no wireframe has unexplained interactions or states
- [ ] The design visually conforms to the NBI design standards for the product in question
- [ ] Contrast ratios on electric blue / dark background combinations have been checked and documented
- [ ] The component inventory is complete (reused vs new)
- [ ] Engineering handoff note is written
- [ ] Design package is saved to the project folder

---

## Handoff Criteria

The following must all be true before Stage 03 (Architecture) and Stage 04 (Implementation) can begin:

- [ ] VP Product has given written approval on the final design package
- [ ] All wireframes are complete and annotated
- [ ] User flows cover happy path and key error paths
- [ ] Component inventory delivered
- [ ] Engineering handoff note delivered

CTO and VP Engineering receive the design package simultaneously. Architecture review (Stage 03) and implementation planning can begin in parallel once design is approved.

---

## Common Failure Modes

- **Designing before requirements are locked.** If the requirements change after design has started, the design almost always needs redoing. Wait for Stage 01 to be fully done.
- **Wireframes that skip error states.** Empty state, loading state, and error state are not optional — engineering needs to know what to show in all cases.
- **Drifting from the design system.** Random font choices, inconsistent colours, and component sprawl are how UIs become inconsistent. Always check the established standards first.
- **VP Product approval assumed because there were no objections.** Approval must be explicit. If VP Product has not said "approved", it is not approved.
- **Over-designing for MVP.** Playsage is being built towards a GDC demo and an investor pitch. Design to what is in the requirements spec — do not add scope during design.
