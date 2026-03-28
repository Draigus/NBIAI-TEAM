# SDLC Stage 6: QA and Testing

**Stage:** 06 — QA Testing
**Triggered by:** VP Engineering notifies QA Lead that merged code is ready for testing
**Output:** QA Lead final approval (Opus pass), or bug report returned to engineering
**Hands off to:** Stage 07 — Deployment

---

## Overview

QA is the last line of defence before code reaches users. This stage verifies that the implemented feature matches the approved requirements, behaves correctly across its full state space, and has not broken anything that was previously working. QA Lead Agent owns this stage, with QA Engineer Agent executing the test runs. The final approval pass is performed by QA Lead in Opus mode, which provides the highest-quality judgement before anything reaches production.

Nothing proceeds to deployment without QA Lead sign-off.

---

## Inputs Required

| Input | Source | Must be true |
|---|---|---|
| Notification from VP Engineering | Stage 05 output | Including summary of what was merged and any env setup notes |
| Approved requirements spec | Stage 01 output | QA tests against the acceptance criteria and functional requirements |
| Approved design package | Stage 02 output | For visual verification of UI changes |
| Test environment access | DevOps Agent | Supabase migrations applied, environment variables set, build deployed to staging or running locally |

---

## Test Environment Setup

Before any testing begins, QA Lead confirms the test environment is correctly configured:

- For Playsage: the Next.js build is running locally or on a staging Vercel deployment, connected to the Supabase staging instance (not production)
- Any database migrations included in the code change have been applied to the test environment
- Required environment variables are set and confirmed (QA Lead checks against the spec's deployment section)
- If the feature involves Docker Compose (offline demo mode), the Docker stack is up and healthy

If the environment is not correctly configured, QA Lead returns to DevOps Agent to fix the setup before testing begins. Do not test against an incorrectly configured environment.

---

## Test Plan Creation

QA Lead creates a test plan before QA Engineer begins execution. The test plan is derived from:

1. The acceptance criteria in the requirements spec (these become the core test cases)
2. The functional requirements (each FR becomes at least one test case)
3. The states shown in the approved wireframes (loading, empty, error, populated states each need a test)
4. Known edge cases from the technical spec

**Test plan format:**

```
# Test Plan: [Feature Name]

Date: [DATE]
QA Lead: QA Lead Agent
QA Engineer: QA Engineer Agent
Build: [Branch / commit reference]
Environment: [Local / Staging URL]

## Test Cases

| ID | Description | Type | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|---|
| TC-01 | [what is being tested] | [Unit/Integration/Manual] | [numbered steps] | [what should happen] | |
```

Test cases must cover:
- Every acceptance criterion from the requirements spec
- Happy path (the thing works correctly when used correctly)
- Error paths (what happens when it goes wrong)
- Edge cases (empty data, maximum values, concurrent users if applicable)
- Regression cases (key existing functionality that could have been broken by this change)

---

## Test Types

### Unit Tests

Unit tests are written by engineers (Stage 04) and run automatically. QA Lead's role here is to verify they exist and pass, not to write them.

QA Lead checks:
- `npm run test` passes with no failures
- Test coverage is reasonable for the business logic in scope (not a strict percentage target, but "no tests exist for this module" is a failure)
- Tests are genuine (not trivial pass-through assertions)

### Integration Tests

Integration tests verify that different parts of the system work together correctly. For Playsage this means:

- API routes return the expected data shape given a valid authenticated request
- API routes correctly reject unauthenticated or unauthorised requests
- Supabase RLS policies work as expected (a user in Tenant A cannot see Tenant B's data)
- Cascade Engine signals fire correctly when the triggering condition is met

QA Engineer executes integration test scenarios using direct API calls (curl or equivalent) as well as through the application UI.

### Manual QA

Manual QA tests behaviour that cannot be captured in automated tests: visual correctness, interaction feel, multi-step user flows, edge cases that require judgement, and regression testing of adjacent functionality.

QA Engineer executes manual test cases following the steps defined in the test plan and records pass/fail against each.

**What manual QA always covers:**
- The complete happy-path user flow for the feature (as defined in the Stage 02 user flows)
- All error states (does the UI show a useful error, or does it crash silently?)
- Visual conformance against the approved wireframes
- Responsive behaviour where in scope
- Loading states (do skeleton loaders appear, or does the UI show blank space with no feedback?)

---

## Bug Severity Levels

All bugs found during QA are classified by severity:

**P1 — Blocking (Show-stopper):**
The feature cannot be used for its intended purpose. Data loss, security vulnerability, or complete functional failure. Examples: user cannot complete the core flow, data is saved incorrectly, auth bypass exists, the application crashes on the happy path.

P1 bugs must be fixed before QA continues. The feature is returned to engineering immediately.

**P2 — High (Significant impairment):**
The core flow works but a significant piece of functionality is broken or severely degraded. Examples: an error state shows a generic 500 message instead of a meaningful error, a calculation is wrong in an edge case that will be hit regularly, a required secondary action is broken.

P2 bugs must be fixed before the feature can proceed to deployment.

**P3 — Medium (Notable but not blocking):**
The feature works for its primary purpose but there is a noticeable defect. Examples: a visual element is misaligned, a loading state is missing, a non-critical error path shows confusing feedback.

P3 bugs must be fixed before deployment to production, but can be addressed in a bug-fix iteration without blocking QA sign-off if QA Lead judges the overall feature is otherwise ready.

**P4 — Low (Polish / minor):**
Cosmetic or very minor issues. Examples: a pixel misalignment that is only visible if you look for it, a slightly inconsistent font weight in a secondary label.

P4 bugs are logged but do not block deployment. They are addressed in a subsequent iteration.

---

## What Blocks vs What Does Not Block Deployment

**Blocks deployment (must be resolved before Stage 07):**
- Any P1 bug
- Any P2 bug
- Any acceptance criterion from the requirements spec not met
- Any security finding (regardless of severity — no exceptions)
- Tests failing (unit or integration)
- Visual divergence from the approved wireframes on any primary user flow screen

**Does not block deployment:**
- P3 bugs (unless QA Lead judges the aggregate of multiple P3s constitutes a P2)
- P4 bugs
- Enhancements identified during QA that are outside the scope of the current spec (log them as future requirements)
- Cosmetic differences from wireframes in secondary or rarely-accessed states, if QA Lead judges the deviation is an improvement or neutral

---

## Bug Reporting

Every bug found must be logged with sufficient detail for engineering to reproduce and fix it without further input from QA. The bug report format:

```
## Bug Report: [Short title]

ID: BUG-[number]
Severity: P1 / P2 / P3 / P4
Feature: [Feature name]
Build: [Commit/branch reference]
Reported by: QA Engineer Agent
Date: [DATE]

### Description
What is wrong. One paragraph, plain language.

### Steps to Reproduce
1. [Exact steps]
2. [Include any specific data, user state, or configuration needed]

### Expected Behaviour
What should happen.

### Actual Behaviour
What actually happens.

### Evidence
[Screenshot, error message, console log — include verbatim, not paraphrased]

### Notes
Any additional context — e.g. "only occurs when the genre filter is set to RPG", "only in Chrome, not Safari"
```

Bugs are returned to VP Engineering with the full bug report. VP Engineering assigns to the relevant engineer for a fix.

---

## Fix and Regression Cycle

When engineering delivers a fix for a QA-reported bug:

1. QA Engineer verifies the specific fix resolves the reported issue
2. QA Engineer runs regression tests on the areas adjacent to the fix (a fix to the API route should be re-tested against all test cases that touch that route)
3. QA Engineer confirms no new bugs were introduced by the fix
4. If the fix is clean, the test case is marked as passed
5. If the fix introduces new issues, a new bug report is raised

---

## QA Lead Final Approval Pass (Opus)

Once all P1 and P2 bugs are resolved, all acceptance criteria are met, and all tests pass, QA Lead performs the final approval pass. This is the Opus-quality judgement gate.

The final pass covers:

**Completeness check:**
- Every acceptance criterion from the requirements spec is verified as passing
- Every test case in the test plan has a Pass or documented justification for any deviation
- All P1 and P2 bugs are closed

**Quality check (Glen's standards applied):**
- No hallucinated data — the application shows real, expected data, not fabricated values
- No corner cutting visible — the implementation does not appear to have skipped steps or glossed over edge cases
- Shallow implementations flagged — if something works technically but is clearly not finished (e.g. a chart that loads correctly but shows no axis labels, a table that loads data but has no empty state), this is raised as a P3 or P2 before approval

**Visual check:**
- The UI conforms to NBI design standards (dark theme, electric blue, Orbitron font, no orange)
- The user flow matches the approved wireframes for all primary states

**Security sanity check:**
- A spot-check of the security items from the code review checklist, focused on any area that was flagged during review or is particularly sensitive

If the final pass identifies issues, they are raised as new bugs and the feature re-enters the fix/regression cycle. QA Lead does not approve a feature that fails the final pass.

When the final pass is clean, QA Lead issues written approval. The approval note must state:
- All acceptance criteria passed
- All P1 and P2 bugs resolved
- Final Opus pass completed
- Feature is ready for deployment

---

## Handoff Criteria

The following must all be true before Stage 07 (Deployment) can begin:

- [ ] QA Lead written approval issued (final Opus pass complete)
- [ ] All acceptance criteria verified as passing
- [ ] All P1 and P2 bugs resolved and verified
- [ ] Unit tests and integration tests passing
- [ ] Test plan completed with all cases recorded as Pass (or documented exception)
- [ ] No outstanding security findings

---

## Common Failure Modes

- **Testing against the wrong environment.** Always confirm environment setup before testing begins. Testing on production or an unpatched environment produces meaningless results.
- **Incomplete test plan.** QA without a test plan is just clicking around. The plan exists to ensure systematic coverage.
- **Treating the happy path as the whole test.** Most bugs live in error states and edge cases. Test both.
- **P3 accumulation.** A feature with 12 P3 bugs is a broken feature dressed up as "mostly working". QA Lead must make a judgement call on aggregate P3 impact.
- **Approving before all acceptance criteria are checked.** The acceptance criteria are the contractual definition of done. If any are untested, the approval is invalid.
- **Not running regression tests after a fix.** Fixes frequently introduce new bugs in adjacent code. Always regression-test after a fix.
