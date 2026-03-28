# SDLC Stage 1: Requirements Gathering

**Stage:** 01 — Requirements
**Triggered by:** New feature request, product initiative, or Glen/CEO directive
**Output:** Approved requirements specification document
**Hands off to:** Stage 02 — Design

---

## Overview

Requirements gathering is the first stage of the SDLC. Nothing gets designed, architected, or built until a requirements spec exists and has been approved. This stage converts raw intent (a brief, a conversation, an idea) into a precise, unambiguous document that design and engineering can act on without guessing.

This stage is owned by the VP Product Agent, who coordinates with Glen (Board Operator) and the CEO Agent throughout.

---

## Inputs Required

Before this stage can begin, the following must be in hand:

| Input | Source | Description |
|---|---|---|
| Initial brief | Glen / CEO Agent | A written statement of what is wanted and why. Can be rough — a Slack message, a conversation note, a bullet list. Must be written down before work starts |
| Product context | VP Product knowledge base, PRD docs | Existing product state: what modules exist, what has already been decided, what constraints are locked |
| Any prior decisions | templates/technical_spec.md, decision logs | Existing locked decisions that constrain the feature (e.g. tech stack is locked for Playsage) |
| Affected project | Context | Which product this relates to: Playsage, SalarySage, NBI website, or an internal tool |

If the brief has not been written down, VP Product must request one from the CEO Agent before proceeding. Do not proceed on a verbal or implied brief.

---

## Step-by-Step Process

### Step 1: Receive and Register the Brief

1. The brief arrives from Glen directly or via the CEO Agent.
2. VP Product acknowledges receipt and logs the brief with the date received.
3. VP Product reads the brief in full against the current product context (PRD, decision log, existing specs).
4. VP Product identifies which of the 10 Playsage modules (or which SalarySage/website area) the brief relates to.

### Step 2: Clarification Pass

VP Product performs a structured review of the brief and identifies gaps. The following questions must be answerable before writing the spec. If any are unanswered, VP Product raises them with the CEO Agent for escalation to Glen.

**Questions to ask (apply all that are relevant):**

**Scope and intent:**
- What exact user action or system behaviour is being requested?
- Is this a new capability, an enhancement to something existing, or a fix?
- Which user role(s) does this affect? (e.g. Playsage: Studio Analyst, Studio Head, Enterprise Admin)
- What specific pain point does this solve? Is there evidence (user feedback, data, Glen's direct experience) that this pain point exists?

**Boundaries:**
- What is explicitly out of scope for this version?
- Are there related features that should be done at the same time vs deferred?
- Does this touch the Cascade Engine integration layer? If so, which upstream/downstream modules are affected?

**Acceptance:**
- How will Glen know this is done and done correctly?
- Are there metrics that should move as a result of this feature?
- Is there a demo scenario in mind (e.g. GDC demo context for Playsage)?

**External-facing check:**
- Will this feature be visible to end users or clients?
- Does it affect pricing tiers, data handling, or any third-party integrations?
- If external-facing: Glen approval is required before design begins (see Step 4).

**Constraints and dependencies:**
- Are there hard technical constraints? (e.g. Supabase row-level security, Vercel edge limits, Docker offline demo requirement)
- Does this depend on data not yet available? (e.g. licensed data feeds not yet integrated, studio partnership data)
- Are there regulatory, legal, or ToS considerations? (e.g. scraping constraints under CFAA/hiQ; data privacy for salary data)

### Step 3: Write the Requirements Specification

VP Product writes the formal requirements spec. The document must include the following sections:

**Requirements Spec Structure:**

```
# Requirements Specification: [Feature Name]

Project: [Playsage / SalarySage / NBI Website / Internal Tool]
Module: [Which module or area]
Author: VP Product Agent
Date: [DATE]
Status: Draft

## Summary
One paragraph. What this feature is, why it is being built, and what problem it solves.

## User Stories
Format: As a [user role], I want to [action], so that [outcome].
- At minimum 1 user story per distinct user role affected.
- Include edge cases and error states as separate user stories if they have non-trivial requirements.

## Functional Requirements
Numbered list. Each requirement must be:
- Testable (QA can write a test case against it)
- Specific (no "should be easy to use" or "should perform well" — give numbers where relevant)
- Atomic (one thing per requirement)

Example format:
FR-01: The system shall display X when Y occurs.
FR-02: The user shall be able to perform Z within the context of W.

## Non-Functional Requirements
NFR-01: [Performance — specific threshold, e.g. "page must load within 2 seconds on a standard broadband connection"]
NFR-02: [Security — specific constraint, e.g. "user data must not be accessible across tenants"]
NFR-03: [Accessibility — e.g. "keyboard navigable, WCAG 2.1 AA"]
NFR-04: [Compatibility — browsers, screen sizes, offline/online context as relevant]

## Scope Boundaries
### In scope
- [specific list]

### Out of scope (this version)
- [specific list — not deferred to vague "future"; state actual version or condition]

## Acceptance Criteria
Numbered list of conditions that must all be true for the feature to be considered complete.
These map directly to the FR list above.
AC-01: [Maps to FR-01]
AC-02: [Maps to FR-02]

## Assumptions
- [List any assumptions made. If any are wrong, the spec becomes invalid and must be revised.]

## Open Questions
| Question | Owner | Deadline |
|---|---|---|
| [question] | [who needs to answer] | [date] |

## Dependencies
| Dependency | Status |
|---|---|
| [what is needed before build can start] | [Available / Pending / Blocked] |
```

### Step 4: Glen Approval Gate (External-Facing Features)

If the feature is external-facing (visible to customers, affects marketing copy, changes pricing presentation, introduces new data handling), VP Product must route the spec to the CEO Agent for Glen's approval before proceeding.

The CEO Agent presents the spec to Glen with:
- A one-paragraph summary of what is being built and why
- A clear flag of what is external-facing
- Any open questions that require Glen's judgement

Glen reviews and either approves (proceed to design), requests changes (return to VP Product for revision), or rejects (brief is closed and logged).

Internal features (infrastructure, refactoring, internal dashboards, developer tooling) do not require Glen approval at this stage, but must still meet the spec format above.

### Step 5: Handoff to Design

Once the spec is approved (Glen approval for external features; VP Product sign-off for internal), VP Product packages the handoff:

1. Requirements spec document is finalised and saved to the project folder.
2. VP Product writes a handoff summary covering: what was decided, any open questions still pending, any constraints the UI/UX Lead must know about, and which existing design patterns from the design system apply.
3. The handoff is passed to the UI/UX Lead Agent (Stage 02).

---

## Handoff Criteria

The following must all be true before this stage is considered complete and Stage 02 can begin:

- [ ] Requirements spec exists as a written document (not just notes or a brief)
- [ ] All functional requirements are testable and specific
- [ ] All non-functional requirements include measurable thresholds where applicable
- [ ] Scope boundaries are explicitly stated (in and out)
- [ ] All open questions either answered or assigned with a deadline
- [ ] External-facing features have Glen's written approval (Slack message, email, or annotation in the spec counts)
- [ ] Internal features have VP Product sign-off
- [ ] Dependencies are listed with their current status
- [ ] Handoff summary written and delivered to UI/UX Lead Agent

If any of the above are incomplete, the stage is not done. Do not pass to design with unresolved ambiguity.

---

## Common Failure Modes

These are the most common ways this stage goes wrong. Avoid them:

- **Brief accepted without a written document.** If it was not written down, it did not happen. Always get the brief in text before starting.
- **Scope not bounded.** "Everything related to X" is not a scope. List what is in and what is out.
- **Requirements not testable.** "The UI should feel responsive" cannot be tested. "Page interaction must respond within 200ms" can.
- **Skipping the Glen approval gate.** External features that reach design or engineering without Glen's sign-off will be sent back. This wastes time.
- **Open questions treated as answered.** If a question is unresolved at handoff, it becomes an assumption. Assumptions break builds. Chase the answer before moving on.
