# SDLC Stage 3: Technical Architecture

**Stage:** 03 — Architecture
**Triggered by:** Approved design package from Stage 02 (plus approved requirements from Stage 01)
**Output:** Approved technical specification document (using templates/technical_spec.md)
**Hands off to:** Stage 04 — Implementation

---

## Overview

The architecture stage converts approved design and requirements into a complete technical specification that engineers can implement without needing to make architecture decisions themselves. The CTO Agent owns this stage. Nothing goes to engineering without a signed-off technical spec.

This is not a bureaucratic exercise. The spec exists because vague implementation instructions produce inconsistent code, security holes, and rework. Every hour spent on a thorough spec saves multiple hours of debugging and refactoring.

---

## Inputs Required

| Input | Source | Must be true |
|---|---|---|
| Approved requirements spec | Stage 01 output | Approved state, not draft |
| Approved design package | Stage 02 output | VP Product sign-off confirmed |
| Existing codebase context | CTO / VP Engineering knowledge | CTO must understand current state of the relevant codebase before designing additions |
| Prior technical specs | Project folder | Any previously approved specs for related components |
| Locked tech stack decisions | See below | CTO must reference locked stack — these are not up for debate per-feature |

---

## Locked Tech Stack (Do Not Override Without a Formal Decision)

These constraints are locked across all NBI software products unless a formal decision is made and logged:

**Playsage:**
- Frontend: Next.js App Router (not Pages Router)
- Styling: Tailwind CSS + shadcn/ui
- Backend / database: Supabase (PostgreSQL)
- Hosting: Vercel
- Demo / offline fallback: Docker Compose (required for GDC-style offline demo scenarios)
- Language: TypeScript throughout — no untyped JavaScript. `any` types require justification
- Auth: Supabase Auth (not a custom auth implementation)
- No new frontend frameworks (React is fixed via Next.js)

**SalarySage:**
- Standalone HTML application — no server-side runtime
- Must remain offline-capable (no CDN-dependent assets, no required API calls at runtime)
- Data loaded from local CSV at runtime
- Auth: currently SHA-256 client-side (limited security — flag if requirements change this)

**NBI Website:**
- Platform: Framer
- Custom code: Minimal — only where Framer's native capabilities are genuinely insufficient
- No server-side backend for the website itself

**All products:**
- No hardcoded secrets, credentials, or API keys in source code — ever. All credentials via environment variables or Supabase secrets
- All dependencies must be assessed for: licence compatibility, ongoing maintenance status, and whether a simpler solution exists in the existing stack

---

## When to Create New Architecture vs Extend Existing

**Extend existing when:**
- The new feature uses components, data models, or patterns already established in the codebase
- Adding to an existing Supabase table is cleaner than adding a new table
- The UI can be built from existing shadcn/ui components with styling adjustments
- The feature is within an existing Playsage module (e.g. adding a new chart type to the Competitive Landscape module)

**Create new architecture when:**
- A new Playsage module is being introduced (each module has distinct data models and API routes)
- The feature requires data structures that do not map cleanly to existing tables without distortion
- Integration with a new third-party service is required (data feed, external API)
- The Cascade Engine integration layer is being extended (new cross-module signal)

**Flag to Glen before proceeding when:**
- The correct approach requires changing a locked tech stack decision
- The feature requires a new paid dependency (cost implications)
- The feature introduces a new data privacy or legal risk (e.g. new data scraping, new PII handling)
- The scope of work materially exceeds what was anticipated in the brief

---

## Step-by-Step Process

### Step 1: Architecture Review

CTO reads the approved requirements spec and approved design package together. The CTO's first job is to identify any technical blockers or surprises that were not visible at the requirements or design stage:

- Does the data model required by this feature fit cleanly into the existing Supabase schema?
- Does any requirement create a performance risk? (e.g. a module that queries across all genres, all titles, and all time ranges simultaneously)
- Does any requirement introduce a new security surface? (new API endpoint, new user permission level, new external data source)
- Is the Cascade Engine affected? If so, which modules send signals, which modules receive them, and what is the trigger logic?
- Are there any requirements that are technically infeasible with the locked stack? If so, flag immediately to VP Product before writing the spec

If blockers are found, CTO raises them with VP Product and CEO Agent. Do not write a spec that papers over a technical impossibility.

### Step 2: Write the Technical Specification

CTO writes the technical spec using the format defined in `templates/technical_spec.md`. The spec must fully populate every section of that template. Sections that are marked TBD or left blank are not acceptable in an approved spec.

**Mandatory content per section:**

**Overview:** What is being built, in plain language. Should be understandable by VP Product without technical background.

**Background and Context:** Current state of the codebase in the relevant area. Why this approach was chosen over alternatives — show at least one alternative considered and the reason it was rejected.

**Functional Requirements:** Transcribed from the requirements spec with any technical clarifications added. Do not modify the intent — only add implementation-relevant detail.

**Non-Functional Requirements:** Performance thresholds stated as measurable numbers. Security constraints stated specifically (not "be secure"). Database query performance targets where applicable (e.g. "p95 query time under 300ms for genre-level aggregations").

**Technical Design — Architecture:** How this fits into the existing system. Which existing components are touched. Which new components are introduced. If the Cascade Engine is involved, describe the signal flow.

**Technical Design — Data Model:** Full table definitions in pseudo-schema format. Column names, types, constraints, relationships. Include any new Supabase RLS policies required.

**Technical Design — API Design:** All new endpoints with method, path, request shape, response shape, and auth requirements. Existing endpoints being modified must show before/after.

**Component / Module Breakdown:** Table of every component involved, what it does, and what technology it uses. Engineers should be able to read this and know exactly which files to create or modify.

**Third-Party Dependencies:** Any new library or service with licence, cost, and alternatives considered. No new dependencies without this assessment.

**Implementation Plan:** Ordered steps with estimates (Small = under 4 hours, Medium = 4-16 hours, Large = 16+ hours). Steps must be sequenced in dependency order — an engineer cannot accidentally start step 3 before step 1 creates what step 3 requires.

**Security Considerations:** Auth model, RLS policies, input validation points, OWASP top-10 relevant items for this feature specifically. Not a copy-paste of generic security platitudes — specific to what is being built.

**Testing Plan:** Unit test targets (which functions, which edge cases), integration test targets (which flows), manual QA scenarios. Specific enough that QA Lead can write the test plan from this section without further input.

**Deployment:** Environment variables required (names, where they come from). Migration steps if the database schema changes. Rollback procedure if the deploy fails.

**Open Questions:** Any unresolved items that need an answer before or during implementation. Owner and deadline for each.

### Step 3: VP Engineering Review

CTO passes the completed spec to VP Engineering for a technical review. VP Engineering checks:

- Is the implementation plan achievable with the current engineering agents (Senior Engineer and Engineer)?
- Are the effort estimates realistic?
- Are there any dependencies between steps that the CTO may have missed?
- Is there anything in the spec that will create a maintenance or scalability problem down the line?
- Are the test targets sufficient for the QA team to work from?

VP Engineering returns either an approval or specific change requests. Changes are made by the CTO and re-reviewed.

### Step 4: CTO Approval and Sign-Off

Once VP Engineering is satisfied, CTO formally approves the spec by updating the Status field in the document to "Approved" and recording the approval date.

The approved spec is saved to the project folder. It becomes the binding reference for the implementation stage. Engineers do not deviate from the spec without a spec amendment process (raise to CTO, document the change, update the spec).

### Step 5: Handoff to VP Engineering

CTO delivers the spec to VP Engineering with a brief verbal (written) summary covering:
- What is being built at a high level
- Which engineers should handle which parts (Senior Engineer for complex/architectural work; Engineer for well-defined, bounded tasks)
- Any specific risks or watch-out areas the CTO wants VP Engineering to be aware of
- Whether any architecture questions remain open and what the resolution path is

---

## Architecture Review Checklist

Before approving any technical spec, the CTO must confirm all of the following:

**Stack compliance:**
- [ ] Next.js App Router used (not Pages Router) for Playsage
- [ ] Supabase PostgreSQL used for all persistent data
- [ ] Vercel deployment assumed for Playsage
- [ ] No new frontend frameworks introduced
- [ ] TypeScript throughout, no unjustified `any` types
- [ ] No hardcoded secrets anywhere in the spec or implied implementation

**Data model:**
- [ ] New tables / columns are justified — no redundant or speculative schema additions
- [ ] RLS policies defined for any new tables containing user data
- [ ] Migrations are reversible (have a down migration)
- [ ] Foreign key relationships are correct and indexed appropriately

**API design:**
- [ ] All new endpoints are authenticated
- [ ] Input validation defined at every API boundary
- [ ] No endpoints that expose data cross-tenant (Supabase RLS must enforce tenant isolation)

**Performance:**
- [ ] No obvious N+1 query patterns in the design
- [ ] Large data sets paginated or aggregated server-side
- [ ] Cascade Engine signals designed to be asynchronous where they do not need to be synchronous

**Security:**
- [ ] OWASP top-10 reviewed for this feature
- [ ] No new PII collected without a corresponding data handling decision
- [ ] Dependencies assessed for known vulnerabilities

**Feasibility:**
- [ ] Every requirement in the spec is technically achievable with the locked stack
- [ ] Any technically infeasible requirement has been escalated and resolved before spec is marked Approved

---

## Handoff Criteria

The following must all be true before Stage 04 (Implementation) can begin:

- [ ] Technical spec document is in Approved state (not Draft, not In Review)
- [ ] All sections of templates/technical_spec.md are fully populated
- [ ] VP Engineering has reviewed and confirmed the implementation plan is executable
- [ ] CTO has signed off
- [ ] Spec saved to the project folder
- [ ] VP Engineering handoff summary delivered

---

## Common Failure Modes

- **Writing the spec without reading the existing codebase.** Architecture decisions made in ignorance of the current state create conflicts on implementation. Always review current state first.
- **Leaving open questions in an approved spec.** Open questions in an approved spec become engineering assumptions. Engineering assumptions produce unexpected behaviour. Close all questions before approval.
- **Underestimating Cascade Engine complexity.** Adding a new module signal requires checking every other module that might be affected. Do not treat Cascade Engine changes as simple.
- **Skipping the migration plan.** Any schema change without a migration plan risks data loss in production. Even for early-stage builds, the habit must be correct from the start.
- **Spec drift during implementation.** If engineering discovers something that requires deviating from the spec, the correct path is a spec amendment — not undocumented deviation. The spec is the contract.
