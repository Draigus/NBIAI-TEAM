# SDLC Stage 4: Engineering Implementation

**Stage:** 04 — Implementation
**Triggered by:** Approved technical specification from Stage 03
**Output:** Implemented feature on a named branch, locally tested, ready for code review
**Hands off to:** Stage 05 — Code Review

---

## Overview

Implementation is where the code gets written. This stage is owned by the VP Engineering Agent, who assigns work to the Senior Engineer Agent or Engineer Agent based on task complexity. Engineers implement against the approved technical spec — not against assumptions, not against memory, against the spec.

This stage ends when the code is complete, locally tested, and a review has been opened. It does not end when the engineer thinks it looks about right.

---

## Inputs Required

| Input | Source | Must be true |
|---|---|---|
| Approved technical spec | Stage 03 output | Status must be Approved — not Draft |
| Design package | Stage 02 output | Available for reference during implementation |
| VP Engineering task assignment | VP Engineering | Engineer must have a clear task assignment before starting |
| Repository access | DevOps Agent setup | Branch created per naming convention (see below) |

---

## Task Assignment

VP Engineering reviews the approved technical spec and the implementation plan within it. VP Engineering then assigns tasks to engineers:

**Senior Engineer Agent handles:**
- New module architecture (new Playsage modules, Cascade Engine integration changes)
- Complex data model changes with significant migration work
- New Supabase RLS policy design
- Any task estimated Large (16+ hours) in the spec
- Tasks with cross-module dependencies

**Engineer Agent handles:**
- Well-bounded feature additions within an existing module
- Bug fixes with a clear reproduction and root cause
- UI component implementation from an approved wireframe where the component design is clearly specified
- Unit test and integration test writing
- Tasks estimated Small or Medium (under 16 hours) in the spec

A single feature may be split across both agents. VP Engineering defines the split in the task assignment and specifies any dependencies between tasks (e.g. "Senior Engineer completes the data model and API before Engineer starts the UI component").

---

## Branch Naming Convention

Every piece of work starts on a named branch. Branch names follow this format:

```
[type]/[short-description]
```

**Types:**
- `feature/` — new functionality
- `fix/` — bug fixes
- `refactor/` — code restructuring with no behaviour change
- `chore/` — dependency updates, config changes, tooling
- `docs/` — documentation only

**Short description:** kebab-case, 3-6 words, specific enough to identify the work.

**Examples:**
```
feature/competitive-landscape-head-to-head-chart
fix/cascade-engine-null-signal-crash
refactor/sentiment-module-query-optimisation
feature/salary-sage-auth-access-logging
chore/update-supabase-client-v2
```

Do not use:
- Branch names with ticket numbers only (meaningless without context)
- Generic names like `feature/update` or `fix/bug`
- Branches off other feature branches unless explicitly directed by VP Engineering (this creates merge complexity)

All branches are cut from `main` unless VP Engineering specifies otherwise.

---

## Commit Standards

Commits must be atomic and well-described. Each commit should represent one logical unit of change that would make sense in isolation if someone read the git history.

**Commit message format:**

```
[type]: short description (max 72 characters)

Optional longer explanation if the change is non-obvious.
Why this change was made, not just what it does.
```

**Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`

**Examples:**
```
feat: add head-to-head comparison chart to competitive module

Implements FR-04 from the competitive landscape spec. Uses recharts
BarChart with genre median overlay. Data sourced from Supabase
competitive_benchmarks view.
```

```
fix: handle null signal in cascade engine genre watch trigger

When no competitor data existed for a genre, the cascade signal was
throwing a TypeError. Added null guard at signal emission point.
```

**Rules:**
- No commit messages like "wip", "stuff", "changes", "fixing things"
- No committing directly to `main`
- Commit frequently enough that work is recoverable — do not create one massive commit at the end of a task
- Do not commit commented-out code, console.log statements, or debug artifacts

---

## Implementation Process (Step by Step)

### Step 1: Read the Spec Before Writing Any Code

Engineers must read the full technical spec before writing the first line of code. Not skimming it. Reading it.

Specifically confirm:
- Which files need to be created vs modified
- What the data model looks like before touching the database
- What the API contract is before writing any fetch calls
- Which existing components are being reused (do not rewrite what already exists)

If anything in the spec is unclear, raise it to VP Engineering immediately. Do not interpret an ambiguous spec and proceed — that leads to implementing the wrong thing.

### Step 2: Set Up the Branch

```
git checkout main
git pull origin main
git checkout -b [type]/[short-description]
```

Confirm the branch is clean and up to date with main before starting work.

### Step 3: Implement in the Order Specified by the Technical Spec

The implementation plan in the technical spec lists steps in dependency order. Follow that order. If the spec says "create the Supabase table and RLS policy first, then write the API route, then build the UI component", do it in that order. Dependencies exist for a reason.

**Database changes first:**
- Write the migration file (both up and down)
- Apply migration to the local Supabase instance
- Verify the table structure is correct before writing API code that depends on it
- Do not write API code that assumes a schema that does not yet exist locally

**API / server code second:**
- Implement the server-side logic against the confirmed data model
- Test the API route manually (curl, Postman, or the browser) before writing the UI that consumes it
- Confirm the auth and RLS behaviour is correct — test with multiple user contexts if the feature has tenant isolation requirements

**UI components last:**
- Implement against the approved wireframes
- Match the design system: dark background, electric blue accents, Orbitron for display text, correct shadcn/ui components
- Cover all states shown in the wireframes: loading, empty, error, populated
- Do not invent states or interactions not specified in the design

### Step 4: Write Tests as You Go

Tests are written during implementation, not as an afterthought before review.

**Unit tests:**
- Cover every function with business logic (transformations, calculations, filtering)
- Cover edge cases explicitly called out in the spec: nulls, empty arrays, boundary values
- Framework: Vitest for Next.js projects

**Integration tests:**
- Cover the API routes: happy path, auth failure, malformed input
- Cover the key user flows if end-to-end testing is in scope for this feature

**Run tests locally before opening the review.** Do not open a review with failing tests.

### Step 5: Local Validation

Before opening a review, the engineer must personally verify:

- [ ] `npm run build` completes without errors or TypeScript errors
- [ ] `npm run test` passes (all tests green)
- [ ] The feature works as described in the spec when run locally
- [ ] All acceptance criteria from the requirements spec can be demonstrated locally
- [ ] No `console.log` statements left in the code
- [ ] No hardcoded strings that should be constants or environment variables
- [ ] No `any` TypeScript types without a comment justifying why
- [ ] The implementation matches the approved wireframes visually and behaviourally

### Step 6: Open for Code Review

When local validation is complete, the engineer opens a review request targeting `main` (or the integration branch if VP Engineering has specified one).

The review request description must include:

```
## What this does
[1-2 sentences explaining the feature/fix]

## Spec reference
[Link or path to the technical spec this implements]

## How to test locally
[Step-by-step instructions for the reviewer to test the change]

## Acceptance criteria check
- [ ] AC-01: [copy from spec]
- [ ] AC-02: [copy from spec]
[etc.]

## Notes for reviewer
[Any context that would help review — design decisions made during implementation, known edge cases, anything that looks unusual but is intentional]
```

Assign the review to VP Engineering.

---

## Handling Blockers

A blocker is any situation where the engineer cannot proceed with the assigned task. Blockers must be escalated immediately — not sat on.

**What constitutes a blocker:**
- The technical spec contains a requirement that is technically impossible as written
- A dependency is not available (e.g. a Supabase table that was supposed to exist does not)
- The codebase has an existing pattern that directly conflicts with what the spec asks for
- A required environment variable or credential is not accessible
- The engineer discovers a security concern not addressed in the spec

**What does not constitute a blocker:**
- "I'm not sure how to do this" — research the approach, ask VP Engineering for guidance, but this is not a blocker unless the answer genuinely does not exist
- "The design looks slightly different from what I'd expect" — implement the design, note the discrepancy in the review
- General difficulty — hard tasks are not blockers

**Escalation path:**
1. Engineer raises the blocker to VP Engineering in writing, with a clear description of what the problem is and what has already been tried
2. VP Engineering either resolves the blocker directly (clarifies the spec, provides access, makes a technical decision) or escalates to CTO
3. CTO escalates to VP Product or Glen if the blocker requires a product or business decision
4. If the blocker results in a spec change, the spec is amended before implementation resumes

**Do not proceed past a blocker without explicit guidance.** Implementing around a blocker without flagging it produces code that does the wrong thing confidently.

---

## When to Escalate vs Proceed

| Situation | Action |
|---|---|
| Spec says X but the codebase already has Y that does the same thing | Flag to VP Engineering — do not reinvent; determine if Y can be reused or if there is a reason for X |
| Discovered a bug in existing code while implementing the new feature | Note it in the review. Do not fix it in the same branch unless VP Engineering confirms it is safe and in scope |
| Implementing the spec would require touching code outside the scoped files | Stop. Flag to VP Engineering. Scope creep during implementation is how reviews become unmanageable |
| A performance problem is obvious but not in scope | Note it in the review. Do not fix it in the same branch |
| The design wireframe is ambiguous on a specific detail | Flag to VP Engineering who escalates to UI/UX Lead. Do not guess |
| A requirement in the spec cannot be met without adding a new dependency | Stop. Flag to VP Engineering and CTO. New dependencies require assessment |

---

## Handoff Criteria

The following must all be true before Stage 05 (Code Review) can begin:

- [ ] Code is on a named branch following the naming convention
- [ ] `npm run build` completes without errors
- [ ] `npm run test` passes with no failures
- [ ] All acceptance criteria from the requirements spec are demonstrable locally
- [ ] No console.log, debug code, or commented-out blocks left in
- [ ] Review request opened with description, spec reference, test instructions, and AC checklist
- [ ] Assigned to VP Engineering

---

## Common Failure Modes

- **Not reading the spec before starting.** Engineers who start from memory or intuition implement the wrong thing and waste the review cycle.
- **Massive single commits.** One commit for an entire feature makes code review nearly impossible. Commit incrementally.
- **Tests written after the code is "done."** Tests written last are tests written to pass, not tests written to catch problems. Write them during implementation.
- **Scope creep during implementation.** It is tempting to fix nearby problems or add small improvements while in the code. Do not. Log them and raise them separately.
- **Opening a review with a failing build.** This is an immediate rejection. Do not waste the reviewer's time.
