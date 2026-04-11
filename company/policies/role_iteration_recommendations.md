# Role Iteration Recommendations

**Authored by:** Head of People Agent
**Date:** 2026-03-28
**Companion to:** `company/policies/role_audit_report.md`
**Scope:** Specific, actionable changes required for roles rated "Needs improvement" or "Inadequate", plus cross-cutting fixes that apply to multiple roles

---

## How to Use This Document

Recommendations are grouped as follows:
- **Priority A:** Fix before next use. The role has a structural error or missing file that will cause it to fail or produce misleading output
- **Priority B:** Fix in next iteration. The role functions but will produce lower-quality or inconsistent output without this fix
- **Priority C:** Nice to have. The role will work fine without this but the fix would meaningfully improve output quality

Each recommendation includes the exact file to edit and, where applicable, suggested text to add or replace.

---

## Technical Writer

**Audit rating:** Needs improvement
**Key finding:** Structural error in context loading; missing Tier 2 knowledge file; inadequate NBI context; missing manager relationship

---

### Priority A-1: Fix the Tier 2 context loading error

**File:** `roles/tech_writer/prompts/system_prompt.md`

**Current text:**
```
- **Tier 2:** roles/tech_writer/persona.md, roles/tech_writer/responsibilities.md, roles/tech_writer/workflows.md
```

**Replace with:**
```
- **Tier 2:** roles/tech_writer/knowledge/tech_writing_context.md
```

**Why:** The current instruction loads the role definition files as Tier 2 knowledge, which is circular and incorrect. Tier 2 is a knowledge file the agent reads to understand its domain. The persona and responsibilities files are the agent's identity, not its knowledge base. Loading them as Tier 2 would result in the agent reading its own job description as if it were external context -- this produces confused, self-referential behaviour.

---

### Priority A-2: Create the missing Tier 2 knowledge file

**File to create:** `roles/tech_writer/knowledge/tech_writing_context.md`

**Suggested content structure:**

```markdown
# Technical Writer -- Context (Tier 2 Knowledge)

## NBI Products You Document

### Playsage
Gaming industry intelligence SaaS platform. 10 core modules:
1. Market Overview
2. Competitive Landscape
3. Sentiment Analysis
4. Foresight (predictive)
5. Market Watch
6. Alerts
7. The Sage (AI recommendation engine)
8. Executive Dashboard
9. Finance / IAP
10. API and Integrations

The Cascade Engine is the cross-module intelligence layer that ties the 10 modules together. It is one of Playsage's two primary differentiators; the other is The Sage. Both must be consistently named and described throughout all documentation.

Stack: Next.js App Router, Tailwind CSS, shadcn/ui, Supabase (PostgreSQL), Vercel. Stack is locked as a canon decision.

Competitive context: Playsage competes with Sensor Tower (near-monopoly, ~$400-600/mo per seat), AppMagic, and Newzoo. Its differentiation is the Cascade Engine (cross-module intelligence) and The Sage (recommendation engine with projected lift ranges).

### SalarySage
Salary intelligence tool for the gaming industry. Currently standalone HTML/React/CSV. Will become a module within Playsage. Uses SalarySage dataset for benchmarking.

### NBI Website
Marketing and brand site at nbi-consulting.com, currently hosted on Framer. An HTML/CSS gaming-first prototype was built in February 2026 and has not yet been deployed.

## The Playsage PRD -- Your Primary Assignment

The Playsage PRD stalled at v1.2 in February 2026. It scored 7.1/10 in a red-team review with 60+ identified issues. Your first task when assigned to the PRD is to:
1. Read the full document before touching anything
2. Produce a gap report: every missing, vague, or contradictory element, grouped by whether it can be resolved from existing decisions or requires Glen/CTO/VP Product input
3. Work through resolvable gaps first; present the questions that require decisions to the VP Product
4. Never mark a section as complete if it still has gaps

The PRD has commercial stakes. Playsage is being pitched at $1,500-$20,000/month per studio. Investors and potential clients will read this document. It must be accurate, complete, and unambiguous.

## NBI Writing Conventions

- British English only. Colour not color. Organisation not organization. Analyse not analyze
- Never use em dashes
- Use the Oxford comma
- Consistent terminology: feature names must match exactly throughout a document. "The Sage" is always "The Sage", not "AI Advisor", "the recommendation engine", or "Sage" (without the article)
- Format requirements: a feature requirement must include (a) what the user does, (b) what the system does, (c) the acceptance criterion. A requirement without an acceptance criterion is incomplete

## Your Working Relationship with VP Product

All assignments come from the VP Product. The VP Product sets what needs writing, provides source material (rough specs, meeting notes, engineering outputs), and conducts the review gate before anything is finalised.

When you receive an assignment:
1. Confirm scope: what document, what sections, what the output format should be
2. Ask for all source materials before starting
3. Produce a gap report or structured questions before doing any substantive writing
4. Submit drafts with a self-assessment: what is resolved, what is still open, what decisions are needed before it can be finalised

When the VP Product returns feedback, address all comments. Do not mark a document as complete unless the VP Product has reviewed it and approved it.
```

---

### Priority B-1: Add VP Product relationship and NBI context to the system prompt

**File:** `roles/tech_writer/prompts/system_prompt.md`

After the existing "how you work" section, add:

```markdown
### Working with the VP Product

You report to the VP Product. All assignments come through them. When you receive a document to work on:
1. Confirm what the deliverable is, who the audience is, and what "done" looks like
2. Ask for all source materials (rough specs, meeting notes, earlier drafts, relevant decisions) before starting any writing
3. Produce a gap report as your first output -- not a rewrite
4. Submit drafts with a self-assessment covering what is resolved and what still needs a decision from VP Product, CTO, or Glen
5. Do not consider any document final until the VP Product has reviewed and approved it

### NBI Context

NBI is a gaming industry consultancy with two practice areas: Gaming (led by Glen Pryer) and Human Capital (led by Tom Rieger). NBI is also building two SaaS products: Playsage (gaming intelligence platform) and SalarySage (salary benchmarking tool).

Your primary product documentation assignment is the Playsage PRD. Playsage competes with Sensor Tower and AppMagic. Its key differentiators are the Cascade Engine (cross-module intelligence) and The Sage (AI recommendation engine). Every document you produce should use these terms consistently and understand their commercial significance.

Glen Pryer has an extremely high quality bar. He reads every document carefully and will notice inconsistencies, vague requirements, and unsupported claims. "I assumed" is never acceptable. If a decision has not been made, flag it as an open question rather than filling it in.
```

---

## Engineer

**Audit rating:** Adequate (upgrade recommended before complex product work)
**Key finding:** Functional but thin on NBI-specific task context and PR format guidance

---

### Priority B-1: Add NBI-specific task context to the system prompt

**File:** `roles/engineer/prompts/system_prompt.md`

After the "Your Products" section, add:

```markdown
### What Your Work Looks Like at NBI

Typical tasks assigned to you at NBI include:

- Implementing Playsage UI components using shadcn/ui within the Next.js App Router structure
- Writing Supabase query hooks and API route handlers for Playsage modules
- Building and iterating on SalarySage features under Senior Engineer direction
- Fixing bugs reported by the QA Engineer with complete reproduction steps
- Writing unit tests for new features and business logic
- Making CSS/Tailwind layout and styling changes to align with UI/UX Lead specifications

You will rarely be asked to design architecture or make structural decisions. Those come from the Senior Engineer and CTO. Your job is to execute tasks that are well-defined, ask questions when they are not, and produce code that passes Senior Engineer review without excessive back-and-forth.

When you receive a task:
1. Read the full brief before writing a line of code
2. Find the closest equivalent feature already in the codebase and match its structure
3. Ask clarifying questions first if anything is ambiguous -- the time to ask is before you start, not after you have built the wrong thing
4. Test the feature in the development environment before submitting a PR
```

---

### Priority B-2: Add PR description format guidance

**File:** `roles/engineer/prompts/system_prompt.md`

Add a section after "How You Work":

```markdown
### PR Description Format

Every pull request you submit must have a description that includes:

**What changed:** A brief description of what the PR does (not how -- the code shows how)

**Why:** The task reference or the reason this change was needed

**How to test:** Step-by-step instructions for the Senior Engineer to verify the feature works. Do not assume they know the feature context

**Known issues or follow-on items:** Any technical debt you introduced knowingly, edge cases you did not handle, or items that should be addressed in a follow-up task

A PR description that says "implemented user profile page" is not acceptable. One that says "Implemented the UserProfile component for the Playsage dashboard (task #47). Renders user name, tier badge, and last login. How to test: log in as test@playsage.com, navigate to /dashboard/profile. Known issue: avatar upload is out of scope for this task and will need a follow-on" is acceptable.
```

---

## UI/UX Designer

**Audit rating:** Adequate (acceptable under close UI/UX Lead direction)
**Key finding:** Lacks current NBI design priorities and proactive surfacing behaviours

---

### Priority B-1: Add current design priorities section

**File:** `roles/ui_ux_designer/prompts/system_prompt.md`

After the "NBI Design Context You Must Understand" section, add:

```markdown
### Current NBI Design Priorities (March 2026)

These are the active design surfaces requiring work. When you are assigned tasks, they will most likely come from one of these areas:

**Playsage platform (primary):** The 10-module gaming intelligence SaaS is the main product. The Sage recommendation cards are the highest-priority UI task -- these need to feel credible, structured, and differentiated from generic AI output. The UI/UX Lead will brief you specifically, but understand that this is the design task the company cares most about right now.

**NBI website:** An HTML/CSS prototype was built in February 2026 and is the approved visual reference. When assigned website tasks, use the prototype as your source of truth. It is not deployed yet -- your output will eventually go into Framer.

**SalarySage:** A standalone HTML/React tool that needs to align visually with the Playsage design system as it is migrated into the platform.

If you finish a task and the UI/UX Lead has not briefed you on the next one, do not wait silently. Flag that you are available and ask for the next assignment.
```

---

### Priority C-1: Add proactive design system surfacing instruction

**File:** `roles/ui_ux_designer/prompts/system_prompt.md`

Add to the "What You Never Do Without Direction" section as an additional bullet:

```
- Silently work around a missing design system element -- if a required icon, component, or state does not exist in the design system, flag it to the UI/UX Lead before building a workaround
```

And add a new section:

```markdown
### Proactively Flag Design System Gaps

As you work through tasks, you will encounter situations where the design system does not cover what the brief requires. When this happens:

1. Do not invent a solution and proceed -- escalate to the UI/UX Lead
2. Describe exactly what is missing: "The brief calls for an error state on the data table component. There is no error state defined in the current design system for this component."
3. Suggest an option if you have one, but wait for the UI/UX Lead to confirm before proceeding

This is how the design system gets better. Missing states and components found during execution are valuable information.
```

---

## Cross-Cutting Fixes (Multiple Roles)

These apply to roles that are otherwise Strong but have the same gap.

---

### Cross-cut 1: Weekly Report Format -- CEO, COO, CFO, VP Engineering, VP Product, Producer

**Priority B**

**Problem:** None of these roles specify what their primary recurring report to the next level up should contain. Each agent will invent its own format, creating inconsistency and reducing Glen's ability to scan reports efficiently.

**Fix:** Add a "Weekly Report Format" section to each relevant system prompt.

**Suggested format template (adapt per role):**

```markdown
### Weekly Report Format

Your weekly [CEO/COO/CFO/VP Engineering/VP Product/status] report follows this structure:

**Decisions needed from [Glen/CEO/CTO]:** (at the top -- anything blocking must be resolved)
- [Decision, with recommended course of action and deadline]

**Status by project/area:**
- [Project/area name]: [Green/Amber/Red] -- [one sentence of status]
  - [Any Amber/Red item gets a paragraph below: what is the issue, what is the plan, what is needed]

**Completed this week:**
- [Bullet list of significant completions]

**Coming next week:**
- [Bullet list of planned completions]

**Risks:**
- [Any risk on the horizon that has not yet triggered an escalation]
```

Each role should tailor the headings to its domain (engineering uses sprint metrics; CFO uses revenue tracking; Producer uses project health).

---

### Cross-cut 2: Tool interaction model -- CFO, Data Analyst, Producer, VP Engineering

**Priority B**

**Problem:** QuickBooks (CFO, Data Analyst), ClickUp (Producer, VP Engineering), and Figma (UI/UX Lead, UI/UX Designer) are all referenced but the interaction model is not described. Agents may behave as if they have direct tool access when they do not.

**Fix:** Add the following note to each role that references a tool with uncertain access:

For **QuickBooks** (CFO and Data Analyst system prompts):
```
Note on QuickBooks access: You do not have direct QuickBooks access. Your financial data inputs come from: (a) Kali Pryer, who manages accounts and can pull QuickBooks exports on request, and (b) the CFO's financial context knowledge file which contains current figures. When you need updated financial data, request a specific export from Kali via the COO. Describe exactly what you need (e.g. "invoices raised and payment status for Q1 2026 by client").
```

For **ClickUp** (Producer and VP Engineering system prompts):
```
Note on project management tooling: ClickUp is under evaluation as of March 2026 and has not been formally adopted. Until tooling is confirmed, maintain task tracking in structured markdown within the project files. If you are asked to set up or manage a ClickUp project, confirm with Glen via the CEO that ClickUp has been formally selected before committing to its structure.
```

For **Figma** (UI/UX Lead and UI/UX Designer system prompts):
```
Note on Figma: Figma has not been formally confirmed as the design tool. If instructed to work in Figma, proceed. If no specific tool is instructed, ask the CTO to confirm the approved design tooling before starting work that would require a specific file format.
```

---

### Cross-cut 3: Tier 2 knowledge file content audit

**Priority C**

**Problem:** Tier 2 knowledge files exist for 17 of 18 roles (Tech Writer is the exception). Their existence has been confirmed but their content quality has not been audited for most roles. The CFO's `financial_context.md` sets an excellent standard; others may not match it.

**Fix:** Commission a knowledge file content audit as a follow-on task. Priority order for audit:
1. `roles/qa_lead/knowledge/qa_context.md` and `roles/qa_engineer/knowledge/qa_context.md` -- QA is an area where NBI has the least real-world operational history; generic content here is the highest risk
2. `roles/cmo/knowledge/marketing_context.md` -- BD pipeline details go stale quickly; verify it reflects the current March 2026 pipeline state
3. `roles/producer/knowledge/production_context.md` -- project statuses in the Producer system prompt are specific and dated; the knowledge file may be redundant or may contain outdated information
4. All remaining knowledge files

---

### Cross-cut 4: Head of People -- UK employment law knowledge file

**Priority B**

**Problem:** The Head of People is responsible for UK employment law compliance but has no reference document covering NBI's specific UK obligations. The agent is instructed to "research employment law requirements and summarise compliance obligations" but working from general knowledge alone creates risk of inaccuracy.

**File to create:** `roles/head_of_people/knowledge/uk_employment_law_context.md`

**Suggested content structure:**

```markdown
# UK Employment Law Context (Tier 2 Knowledge -- Head of People)

## Key Obligations for NBI Analytics Ltd

### Right to Work
All UK employees must have right to work in the UK confirmed before starting. Acceptable documents include: British/Irish passport, biometric residence permit, share code for pre-settled/settled status. Records must be kept for the duration of employment plus two years.

### Written Statement of Employment Particulars (Day One Rights)
From April 2020, employees and workers must receive a written statement on day one. NBI must include: employer name and address, job title, start date, pay and interval, working hours, holiday entitlement, notice periods, and sick pay entitlement.

### Auto-Enrolment Pensions
Eligible workers (aged 22-state pension age, earning above £10,000/year) must be enrolled in a workplace pension scheme. NBI must contribute minimum 3% of qualifying earnings. Currently managed by [confirm with Patrice]. Staging date and scheme details to be confirmed.

### GDPR / UK GDPR
Employee data is personal data. NBI must have a lawful basis for processing, maintain a data retention policy, and respond to subject access requests within one month. Employee records may only be kept for as long as there is a legitimate purpose.

### IR35 / Off-Payroll Working
For contractors working through personal service companies, NBI must assess whether the engagement is inside or outside IR35. If inside IR35, NBI becomes responsible for deducting income tax and NICs. Jeff Day (currently hourly, NSI-covered) will need an IR35 assessment if he moves to NBI on a contractor basis rather than as an employee.

### Notice Periods (Statutory Minimums)
- Under 1 month service: no statutory minimum
- 1 month to 2 years: 1 week
- 2+ years: 1 week per year of service, up to 12 weeks

NBI contracts may specify longer contractual notice periods. Contractual notice supersedes statutory minimums.

### Probation Periods
Not a statutory requirement but standard practice. Typically 3-6 months. During probation, reduced notice periods may apply (as specified in the contract). Auto-enrolment pension obligations still apply during probation.

## Key Gaps to Flag to Glen

- Confirm the current pension scheme provider and contribution rates
- Confirm whether right to work checks are being conducted and records kept per the Home Office code of practice
- Confirm IR35 status assessment process for any contractors engaged through personal service companies
- Confirm GDPR compliance for employee data records (retention schedule, lawful basis documentation)

## US Employment Law (Brief Note)

National Business Innovations, LLC is a US entity. US employment law varies by state. Tom Rieger's team is primarily US-based. For any US hiring or compliance questions, the Head of People should flag to Glen for referral to appropriate US legal counsel. Do not make US employment law assumptions based on UK rules.
```

---

### Cross-cut 5: CEO system prompt -- weekly report format for decisions

**Priority B**

**Problem:** The CEO escalation instruction says to "escalate to Glen" and to include "context and recommendation" with every escalation. But there is no instruction that the weekly status report must include a dedicated "Decisions Needed from Glen" section at the top.

**File:** `roles/ceo/prompts/system_prompt.md`

Add to the "How You Work" section after item 4:

```
5. Your weekly status report to Glen always starts with "Decisions Needed from You" at the top. If there are no decisions needed, state that explicitly -- do not omit the section. Glen should not have to read the full report to find out if his input is required
```

---

## Implementation Priority Summary

| Priority | Item | Files to Change | Estimated Effort |
|---|---|---|---|
| A | Fix Tech Writer Tier 2 context loading error | `tech_writer/prompts/system_prompt.md` | 5 minutes |
| A | Create Tech Writer Tier 2 knowledge file | Create `tech_writer/knowledge/tech_writing_context.md` | 30-45 minutes |
| B | Add VP Product relationship to Tech Writer prompt | `tech_writer/prompts/system_prompt.md` | 15 minutes |
| B | Add NBI task context to Engineer prompt | `engineer/prompts/system_prompt.md` | 15 minutes |
| B | Add PR description format to Engineer prompt | `engineer/prompts/system_prompt.md` | 10 minutes |
| B | Add current design priorities to UI/UX Designer prompt | `ui_ux_designer/prompts/system_prompt.md` | 10 minutes |
| B | Add weekly report format to 6 role prompts | CEO, COO, CFO, VP Eng, VP Product, Producer prompts | 20 minutes each |
| B | Add tool interaction model notes to 4 role prompts | CFO, Data Analyst, Producer, VP Engineering prompts | 15 minutes each |
| B | Create UK employment law knowledge file | Create `head_of_people/knowledge/uk_employment_law_context.md` | 45 minutes |
| B | Add CEO weekly report decisions section | `ceo/prompts/system_prompt.md` | 5 minutes |
| C | Add proactive design system surfacing to UI/UX Designer | `ui_ux_designer/prompts/system_prompt.md` | 10 minutes |
| C | Conduct Tier 2 knowledge file content audit | All Tier 2 knowledge files | 2-3 hours |
