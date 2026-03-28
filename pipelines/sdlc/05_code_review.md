# SDLC Stage 5: Code Review

**Stage:** 05 — Code Review
**Triggered by:** Engineer opens a review request at the end of Stage 04
**Output:** Approved and merged code on main (or integration branch)
**Hands off to:** Stage 06 — QA Testing

---

## Overview

Code review is the quality gate between engineering and QA. Its purpose is to catch problems before they reach the QA team and, more importantly, before they reach production. VP Engineering Agent owns this stage. Reviews are conducted using `templates/code_review_checklist.md` as the evaluation framework.

Review is not a formality. A review that approves code without genuinely checking it provides no value and no protection.

---

## Inputs Required

| Input | Source | Must be true |
|---|---|---|
| Review request | Engineer Agent / Senior Engineer Agent | Opened with description, spec reference, test instructions, and AC checklist |
| Technical spec | Stage 03 output | VP Engineering must have read the spec before reviewing the code |
| Approved design package | Stage 02 output | Available for visual verification |
| Code review checklist | templates/code_review_checklist.md | VP Engineering works through this checklist for every review |

---

## Who Reviews What

**VP Engineering Agent (Opus) reviews all code** before anything merges to main. There is no peer review between engineers only — VP Engineering is the mandatory reviewer.

For very large changes (a new Playsage module, a significant Cascade Engine change), the CTO Agent may be brought in as a second reviewer at VP Engineering's discretion. This is not routine — it is for changes where the architectural implications warrant a second set of eyes at the CTO level.

There is no self-merge. Engineers do not merge their own branches. VP Engineering merges after approval.

---

## Turnaround Time Expectation

A review request opened by an engineer must receive a first response from VP Engineering within one working session. A working session is defined as the active context in which the agent team is running.

"First response" means either:
- An approval (code merges)
- A request for changes with specific, actionable notes (engineer addresses and re-submits)

Reviews do not queue indefinitely. If VP Engineering cannot begin a review, the reason must be stated and an expected time given.

---

## Review Process (Step by Step)

### Step 1: Pre-Review Check

Before reading the code, VP Engineering checks that the review request is complete. If any of the following are missing, return the review request to the engineer immediately with a request to complete it:

- [ ] Review description is present (what the change does)
- [ ] Spec reference is included
- [ ] Instructions for testing locally are included
- [ ] Acceptance criteria checklist is included

Do not review incomplete review requests. Incomplete submissions are a Stage 04 failure — return them.

### Step 2: Read the Spec First

VP Engineering reads the relevant technical spec before reading the code. The spec is the definition of what the code is supposed to do. Reviewing code without knowing what it is supposed to do means reviewing against the engineer's interpretation, not against the agreed standard.

### Step 3: Execute the Code Review Checklist

VP Engineering works through every item in `templates/code_review_checklist.md`. The checklist covers:

**Functionality:**
- Does the code do what the spec says it should do?
- Are edge cases handled (null inputs, empty data sets, boundary values)?
- Are all acceptance criteria from the requirements spec met?

**Code Quality:**
- Is the code readable? Can a different engineer understand what it does without the author present?
- Is there duplication that should be abstracted?
- Are functions appropriately sized and single-purpose?
- Is there dead code, commented-out blocks, or debug statements left in?

**Security (OWASP Top 10):**
- No hardcoded secrets, API keys, or credentials
- Input validated and sanitised at all system boundaries (API routes, form inputs)
- No SQL injection risk (parameterised queries used throughout — Supabase client handles this when used correctly; raw SQL queries need explicit checking)
- No XSS risk (output properly escaped, especially user-generated content)
- Authentication and authorisation checks in place on every API route
- No sensitive data logged (no user credentials, PII, or session tokens in log output)

**Tests:**
- Unit tests cover the business logic, including the edge cases from the spec
- Integration tests cover the key API flows
- Tests are genuine (not written purely to make coverage numbers look good)
- No previously passing tests have been removed or broken

**Tech Stack Compliance:**
- Next.js App Router patterns followed (not Pages Router patterns mixed in)
- Tailwind CSS + shadcn/ui used for styling (no random CSS frameworks mixed in)
- Supabase PostgreSQL used for data persistence
- TypeScript types correct — no `any` without a comment justification
- No new dependencies added without CTO awareness

**Performance:**
- No N+1 query patterns (a query inside a loop is the most common form)
- No unnecessary re-renders in React components (check useEffect dependencies, memo usage)
- Large data sets paginated or streamed server-side

**Documentation:**
- Complex logic has inline comments explaining the why, not the what
- API changes are reflected in any relevant documentation
- The technical spec is not contradicted by the implementation (if implementation deviated from spec, that deviation must be explained)

**Deployment:**
- Environment variables documented in the review
- Database migrations included and have both up and down paths
- No breaking changes to existing data structures or API contracts unless the spec explicitly covers the migration

### Step 4: Manual Testing

VP Engineering tests the change manually using the instructions provided in the review request. This is not optional. Reading code is not sufficient — behaviour must be confirmed.

For each acceptance criterion in the review request:
1. Follow the testing steps provided
2. Verify the expected outcome occurs
3. Test at least one error path (what happens if required data is missing, auth fails, or an edge case is hit)

If the testing instructions are insufficient to verify the change, request clarification before completing the review.

### Step 5: Visual Check (UI Changes)

For any change that affects the user interface, VP Engineering checks the implementation against the approved design wireframes:

- Does the layout match the wireframes?
- Is the correct typeface used? (Orbitron for headings/display, correct fallback chain)
- Are the colours correct? (Dark background, electric blue accents, no orange)
- Are all states shown in the wireframes implemented? (Loading, empty, error, populated)
- Is the implementation responsive where responsiveness is required?

### Step 6: Deliver the Review Decision

VP Engineering delivers one of three outcomes:

**Approved — ready to merge:**
All checklist items pass. VP Engineering merges the branch to main (or the specified integration branch).

**Approved with minor comments — merge after addressing:**
The code is functionally correct and meets quality standards, but there are small improvements (naming, a missing comment, a minor style inconsistency). The engineer addresses the minor comments and VP Engineering merges without a full re-review.

**Changes required — do not merge until resolved:**
One or more checklist items have failed. VP Engineering provides specific, actionable notes on each failing item. The engineer must address all required changes and re-submit. The full review process restarts on re-submission.

---

## How to Write Review Notes

Review notes must be specific and actionable. Vague notes help no one and slow down the resolution.

**Not acceptable:**
- "This seems inefficient"
- "Security concern here"
- "Clean this up"

**Acceptable:**
- "This query runs inside a loop on line 47. Move it outside the loop and pass the results in, or restructure as a JOIN at the database level. This will cause an N+1 issue at scale."
- "The `/api/competitive/titles` route on line 12 does not check for an authenticated session. Add the Supabase auth check before the data query."
- "The variable name `d` on line 23 is unclear. Rename to `genreData` or similar."

Every note that is categorised as "Changes required" must include what the problem is and what the expected fix is. The engineer should be able to implement the fix without needing to ask for clarification.

---

## Handling Disagreements

Occasionally an engineer will disagree with a review note. This is fine and healthy. The process for disagreements:

1. The engineer responds to the note with a specific counter-argument. Not "I think it's fine" but "I disagree because X, and the alternative would cause Y."
2. VP Engineering considers the argument and either maintains the request (with an explanation of why the counter-argument does not resolve the concern) or accepts the counter-argument and withdraws the note.
3. If VP Engineering and the engineer reach an impasse, the CTO Agent resolves it. The CTO's decision is final.
4. If the disagreement is about a product or requirements matter (not a technical matter), VP Product is the arbiter.

Disagreements are resolved in writing. The resolution is noted in the review. This creates a record of why certain decisions were made.

---

## After Merge

Once VP Engineering merges the branch:

1. VP Engineering notifies QA Lead Agent that the feature is in main (or the integration branch) and is ready for QA.
2. VP Engineering includes a brief summary of what was merged: what the feature does, the branch name, and any notes the QA team should know (e.g. "the Supabase migration needs to be applied to the QA environment before testing").
3. The branch is deleted after merge. No stale branches.

---

## Handoff Criteria

The following must all be true before Stage 06 (QA Testing) can begin:

- [ ] Code is merged to main (or the specified integration branch)
- [ ] All items on templates/code_review_checklist.md are checked and passed
- [ ] VP Engineering has confirmed the merge
- [ ] QA Lead Agent has been notified with a summary of what was merged
- [ ] Any environment setup notes (migrations, environment variables) have been communicated to QA

---

## Common Failure Modes

- **Approving without running the code.** Reading code and running code are different. Both are required.
- **Review notes that are vague.** An engineer cannot fix "this looks wrong." Be specific.
- **Letting reviews queue.** A review that sits open for multiple sessions creates merge conflicts and slows QA. Review promptly.
- **Skipping the security checklist items because "it's a small change."** Security bugs do not respect change size. Run the checklist every time.
- **Merging without notifying QA.** QA needs to know what is in the build before they can test it. Always notify.
