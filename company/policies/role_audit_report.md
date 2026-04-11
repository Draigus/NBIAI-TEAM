# Role Definition Audit Report

**Authored by:** Head of People Agent
**Date:** 2026-03-28
**Scope:** All 18 AI agent roles across the NBI AI agent company
**Purpose:** Formal quality assurance audit of all role definitions prior to deployment at scale

---

## Audit Method

For each role, I reviewed:
- `persona.md` (identity, decision authority, communication style)
- `responsibilities.md` (job description, core responsibilities, KPIs, interfaces)
- `prompts/system_prompt.md` (the actual instruction set the agent operates from)

Evaluation criteria:
1. NBI specificity -- tailored to NBI's actual business, not generic
2. Clarity of scope -- clear on what this agent does AND does not do
3. Quality standards -- British English, no em dashes, depth over shallow, no fabrication enforced
4. Output expectations -- deliverables concrete enough to assess success or failure
5. Knowledge gaps -- anything missing that the agent would need to do its job
6. System prompt effectiveness -- strong enough to produce high-quality, NBI-specific output

---

## Individual Role Assessments

---

### 1. Chief Executive Officer (CEO)

**Overall rating:** Strong

**Findings:**
- Excellent NBI specificity: system prompt names the two practice areas, active clients, product ambitions, and Glen's relationship to the business explicitly
- Decision authority is well-bounded: the list of what can be decided autonomously versus what must escalate to Glen is clear and covers the realistic edge cases
- "What You Never Do" section is a useful behavioural guardrail that most prompts lack
- Communication style instruction is direct and enforces the British English / no em dashes standards explicitly
- Tier 2 knowledge file (`strategy_context.md`) exists and contains real NBI data with named clients, revenue figures, and current priorities

**Recommended improvements:**
- Add explicit instruction that the CEO's weekly status report format should include a dedicated "Decisions Needed from Glen" section -- currently the prompt says to escalate decisions but does not specify this goes in the weekly report
- The KPIs in responsibilities.md reference "Glen's satisfaction with escalation quality" as a measurement, which is immeasurable in practice. Replace with a structural criterion (e.g. "every escalation includes: context, options considered, and a recommended course of action")

---

### 2. Chief Operating Officer (COO)

**Overall rating:** Strong

**Findings:**
- Genuinely NBI-specific: system prompt contains a full client portfolio table with engagement type, intensity level, and specific focus instructions for each client (Couch Heroes, Lighthouse, Sarge Universe, Blizzard, Goals Studio)
- The instruction that Kali Pryer is "Glen's daughter -- treat professionally, hold to the same standards as anyone else" is exactly the kind of context an AI agent needs to navigate this correctly
- Decision authority layers (COO autonomous, CEO, Glen via CEO) are clearly separated
- "What You Never Do" section includes gaming-specific operational behaviours ("Assume the Lighthouse embedded team is fine without checking -- verify weekly") rather than generic prohibitions
- The note about Sarge Universe -- "do not let an unpaid engagement consume disproportionate operational resource" -- is practical and NBI-specific

**Recommended improvements:**
- No instruction on what the COO's weekly delivery report to the CEO should contain structurally. Add a format template so output is consistent and comparable week over week
- The Tier 2 knowledge file (`operations_context.md`) exists but has not been reviewed as part of this audit -- its quality is assumed rather than verified. Flag for content audit separately

---

### 3. Chief Financial Officer (CFO)

**Overall rating:** Strong

**Findings:**
- Outstanding NBI specificity: the system prompt contains a complete financial picture with named figures -- Lighthouse £350K, Couch Heroes £300K, UK payroll £625,407, NSI transition ~£620K additional, 2026 target £1.2M, 2027 target £2M+
- The Tier 2 knowledge file (`financial_context.md`) is the strongest knowledge file in the system: it contains a full payroll breakdown by individual, revenue scenario tables, and an honest financial risk register
- The "you are not Bryan Rasmussen" framing is essential and handled correctly -- the AI CFO's subordinate role to the human CFO is explicit and consistent across persona, responsibilities, and system prompt
- Conservative financial stance is baked in explicitly: "assume payments will be late", "model the downside", "present projections as facts is not acceptable"
- The known payroll discrepancy (gaming subtotal vs overall total) is flagged honestly in the financial_context.md rather than papered over -- exactly the right approach

**Recommended improvements:**
- No instruction on what a standard monthly financial report should contain structurally. Add a template or format expectation so the CFO's reports are consistent
- The instruction to "track every pound" and "chase every invoice" is operationally sound but the agent has no tools to actually send invoices or access QuickBooks directly. The prompt should clarify that the CFO produces the instructions/summaries for Kali/Patrice to execute rather than acting as if it can send invoices itself

---

### 4. Chief Technology Officer (CTO)

**Overall rating:** Strong

**Findings:**
- Detailed NBI product context in the system prompt: Playsage stack explicitly described (Next.js App Router, Tailwind + shadcn/ui, Supabase PostgreSQL, Vercel), SalarySage security incident documented as the canonical example of what to prevent, Astinus and NBI website contexts both covered
- The "SalarySage API key incident is the canonical example of what you exist to prevent" framing is powerful and appropriately anchors security thinking to a real NBI event rather than abstract policy
- Architecture governance framing is precise: the CTO does not write code, they architect, review, and govern -- this scope boundary is clear
- Communication style instruction includes an important nuance: translate technical complexity into business impact for non-technical stakeholders
- The Playsage stack being "locked" is reinforced correctly -- canon decisions are not re-openable without escalation

**Recommended improvements:**
- The responsibilities mention reviewing "cross-product architecture consistency" but there is no instruction about which products share infrastructure and which are fully separate. A brief product boundary map would help the agent avoid making inconsistent architecture decisions (e.g. recommending Astinus use the Supabase instance when that is likely wrong given its local-first design)
- No instruction on how to structure a technical status report to the CEO. Add format guidance

---

### 5. Chief Marketing Officer / Head of BD (CMO)

**Overall rating:** Strong

**Findings:**
- The system prompt contains named leads with email addresses (Jonas Rundberg at Goals Studio, Jen MacLean at Dragon Snacks Games) and specific status descriptions -- this is exactly the level of specificity needed for a BD-focused agent to add real value
- The instruction about Jen MacLean ("This is a strategic relationship, not just a lead") shows the kind of business judgement that goes beyond generic CRM logic
- Testimonials from Paul Sams, J Allen Brack, and Justin Logan are named with their titles -- the agent knows its strongest proof points
- The case study statistics (40% performance lift on Battlefront 2, 18% FTP retention at Jagex, 22% revenue increase at Z2) are embedded in the system prompt, not left as vague claims
- The "never send external communication without Glen/CEO approval" boundary is consistently enforced

**Recommended improvements:**
- The CDPR and Creative Assembly leads (Jakub Rabinski, James Clark) are listed as "details TBD" -- this creates a knowledge gap where the agent cannot act on these leads without additional context. Either fill in the details or explicitly instruct the agent to request a briefing from Glen before engaging with these leads
- No instruction on what a standard weekly pipeline report should contain structurally. Add format guidance so output is consistent

---

### 6. VP Engineering

**Overall rating:** Strong

**Findings:**
- Clear scope boundary between CTO (architecture, strategy) and VP Engineering (execution, sprint management, code review) -- the line is explicit in both directions
- The instruction that "VP Engineering PRs are reviewed by the Senior Engineer" prevents a gap where the VP Eng could approve their own code
- Sprint management expectations are concrete and measurable: 85% of committed points delivered, PRs reviewed within 24 hours, engineers unblocked within 4 hours
- The NBI product context section in the system prompt correctly covers all four engineering surfaces (Playsage, SalarySage, NBI website, Astinus) with the right priority order implied
- "All engineers use Claude Code as their primary development environment" is correctly noted as something the VP Eng is responsible for ensuring is leveraged effectively

**Recommended improvements:**
- No instruction on what a weekly engineering status report to the CTO should contain. This is the primary upward communication artefact and should have a defined format
- The prompt says to "track sprint velocity honestly" but does not define how velocity is tracked or what tool is used. With ClickUp under evaluation and no confirmed tooling, the agent needs guidance on how to maintain sprint metrics in a tool-agnostic way

---

### 7. VP Product

**Overall rating:** Strong

**Findings:**
- The PM review gate authority is unambiguous and extends to both product features and consulting deliverables -- this dual scope is correctly described and consistently stated across persona, responsibilities, and system prompt
- Playsage competitive context is specific and accurate: Sensor Tower (near-monopoly), AppMagic (scrappy challenger), Newzoo (market-level only), with Playsage's differentiation clearly identified as the Cascade Engine and The Sage
- "The Glen Standard" section is the best articulation of NBI's quality requirements in any system prompt -- naming the four failure modes (shallow work, inaccuracy, corner cutting, generic output) gives the agent clear criteria to apply during reviews
- Pricing tiers are embedded in the system prompt ($1,500/mo Starter, $5,000/mo Professional, $12-20K/mo Enterprise) so the agent understands commercial stakes
- The PMF vs NPS metric distinction (PMF score primary until 50+ users, then NPS) shows genuine product management thinking tailored to NBI's current stage

**Recommended improvements:**
- The role is described as having "no direct reports" but the Tech Writer reports to the VP Product. This is correct in the org chart but the VP Product system prompt does not acknowledge or describe how to manage and direct the Tech Writer. Add a section on this relationship
- No description of what the weekly product health report to the CEO should contain structurally

---

### 8. Head of People

**Overall rating:** Strong

**Findings:**
- Full NBI team roster embedded in the system prompt with individual salaries -- the agent has the data it needs to answer headcount and cost questions immediately
- Couch Heroes context section is specific: names the key contacts (Vardis, Aris, Lorenz, Robin, Valeria, David, Mustafa), describes Glen's current work at the studio, and explains that artifacts must be "correct, compliant, and ready for Glen to hand to the studio without further editing"
- The distinction between what the Head of People builds (frameworks, templates, process documentation) and what Patrice executes (day-to-day HR admin) is clear and prevents role confusion
- The SalarySage salary benchmarking reference is a good NBI-specific detail -- the agent knows to use NBI's own tool for benchmarking
- NSI transition planning is treated as a first-class priority with named individuals, projected costs, and timeline dependency framing

**Recommended improvements:**
- No UK employment law knowledge file exists. The agent is expected to research employment law requirements but has no reference document covering the key UK obligations NBI must meet (right to work, auto-enrolment, GDPR for employee records, IR35 considerations). This is a gap given the compliance mandate
- No instruction on where standard hiring artifact templates should be stored once created, or how to version-control them for reuse. The agent will produce artifacts but has no guidance on the filing/versioning system to use

---

### 9. Senior Engineer

**Overall rating:** Strong

**Findings:**
- The SalarySage API key incident is correctly used as the concrete reference point for the "no secrets in client-side code" rule -- not abstract policy, but a real NBI event
- The Supabase RLS (Row Level Security) obligation is explicitly called out as something this role owns -- a specific technical responsibility that most generic engineer role definitions would miss
- Tier 3 project knowledge is correctly scoped per product (Playsage vs SalarySage) rather than loaded wholesale
- Mentoring obligation is explicit and the mechanism is described (pair on hard problems, review code constructively, explain architectural decisions) rather than just stated as a responsibility
- Security non-negotiable section is the clearest, most specific security instruction in any engineering role -- includes exact examples of what is and is not safe for browser exposure

**Recommended improvements:**
- No instruction on what the Senior Engineer's handoff to VP Eng should look like structurally. A brief required format (what was built, approach chosen, tradeoffs, known follow-on items) would reduce VP Eng overhead in reviewing completed work
- The role references mentoring the Engineer but no guidance on cadence -- how often, in what format. This is a small gap but worth specifying

---

### 10. Engineer

**Overall rating:** Adequate

**Findings:**
- Scope is appropriately bounded: this is a execution role, not a decision-making role, and the system prompt makes that clear without being condescending
- The escalation ladder (Engineer to Senior Engineer first, VP Eng only for production bugs and irresolvable requirements) is sensible and clearly described
- The 30-minute rule ("escalate to Senior Engineer when blocked for more than 30 minutes") is specific and practical
- Security hard rule is clear and correctly placed as a standalone section
- British English and no em dashes enforced

**Findings -- why not Strong:**
- The system prompt is the most generic of all the engineering roles. While it references Playsage and SalarySage by name, the product descriptions are brief summaries rather than contextualised work instructions. An Engineer receiving this prompt understands their reporting relationships but would need to read the Tier 3 project knowledge files closely to actually do effective work
- No NBI-specific examples of the types of tasks this role handles. The Senior Engineer prompt has concrete examples (Supabase migrations, SalarySage migration, RLS policies). The Engineer prompt lists responsibilities but without the same grounding
- No instruction on PR description format -- what a good Engineer PR description looks like at NBI specifically

**Recommended improvements:**
- Add a section on what NBI-specific work the Engineer is likely to be doing: "typical tasks include implementing Playsage UI components using shadcn/ui, writing Supabase query hooks, fixing reported bugs from the QA Engineer, and building SalarySage features under Senior Engineer direction"
- Add PR description format guidance to match the quality standard set elsewhere

---

### 11. DevOps Engineer

**Overall rating:** Strong

**Findings:**
- The SalarySage incident is correctly used as the founding motivation for the role -- "your mandate includes ensuring that situation never happens again" is concrete and historically grounded
- The `NEXT_PUBLIC_` prefix explanation is a genuinely useful piece of Next.js-specific knowledge embedded in the system prompt -- not every DevOps agent would have this
- The four infrastructure surfaces (Playsage on Vercel/Supabase, SalarySage standalone, Framer website, Astinus) are all correctly described with the right priority order implied
- The "document every environment variable" instruction with named fields (name, purpose, scope, owner, rotation date) produces a concrete, actionable output rather than vague documentation requirements
- Escalation authority for production environment changes is correctly set at VP Engineering, not at a lower level

**Recommended improvements:**
- No instruction on what a production incident report should contain structurally. The responsibilities mention writing root cause reports but the system prompt only says "restore service first, root cause second" without a report format
- The Framer website management instruction is thin ("manage publication and any technical configuration") -- Framer has specific publishing and domain management workflows. A brief Framer context note would help

---

### 12. QA Lead

**Overall rating:** Strong

**Findings:**
- The dual-model approach (Sonnet for daily work, Opus for final pass) is explicitly described and the distinction between the two modes is clear -- the Opus pass is "an independent, top-to-bottom review as if you are seeing the product for the first time", not a rubber stamp
- Independence from engineering is asserted clearly: "Engineering does not override this. The CTO can accept named risk and instruct you to proceed -- but that decision is the CTO's, stated explicitly, not engineering pressure"
- The security testing instruction (open browser DevTools, check Sources, Network, and Response bodies for exposed secrets) is specific and tied directly to the SalarySage incident -- not generic security testing advice
- The bug report format example is outstanding: it shows a bad example ("it doesn't work") and a good example with specific step-by-step format, exact file and line reference. This is the strongest quality-of-output instruction in any role
- Commercial context is correctly framed: a broken Playsage demo is a commercial and reputational issue, not just a technical one

**Recommended improvements:**
- No instruction on the format of the release readiness report delivered to the CTO. This is the QA Lead's primary formal output and should have a defined structure (feature list tested, bugs found by severity, bugs resolved, known open issues, recommendation)
- The Tier 2 knowledge file (`qa_context.md`) exists but its content was not reviewed in this audit. Flag for content audit

---

### 13. QA Engineer

**Overall rating:** Strong

**Findings:**
- Clear scope demarcation: QA Engineer does not make ship/no-ship decisions -- that is the QA Lead's authority. This is stated explicitly and the instruction for handling direct questions from engineering ("That decision sits with the QA Lead. I can give you the current test execution status.") is exactly right
- The bug report title example ("Login button unresponsive on mobile Safari 17 after failed password attempt" versus "login broken") teaches the expected quality level rather than just describing it
- The "reproduce every bug at least twice before filing" rule prevents weak bug reports that waste engineering time
- The NBI context section at the bottom connects product quality to commercial stakes: "Every defect that ships through a testable gap is a credibility problem for the business"
- Playsage-specific testing focus areas are correctly identified: accuracy of data display, correct tier-based feature access, integrity of The Sage's recommendations

**Recommended improvements:**
- No instruction on how to organise and maintain test execution records. The responsibilities mention maintaining records so the QA Lead always has an accurate coverage picture, but the format and tool are unspecified
- "Perform exploratory testing sessions when directed" appears in responsibilities but exploratory testing methodology is not described. Given that NBI does not yet have a comprehensive test suite, exploratory testing will be a significant part of the job. Add brief guidance on session-based exploratory testing documentation

---

### 14. UI/UX Lead

**Overall rating:** Strong

**Findings:**
- The exact brand system components are documented in the system prompt: dark theme, electric blue (#0066FF or similar), Orbitron headings, JetBrains Mono for data/mono, Outfit for body -- this is specific enough to actually produce on-brand designs
- "Glen confirmed: Hates orange. Loves electric blue. Dark theme is locked" is the kind of founder preference that gets lost unless explicitly documented. It is correctly placed here
- The Sage is correctly flagged as the highest-stakes UI design task with specific reasoning: "Studios paying £50K+ for this product will judge the platform's intelligence partly on how the recommendations are presented"
- The management instruction for the UI/UX Designer is concrete: brief clearly, set a midpoint checkpoint, review against the brief and design system, give specific actionable feedback (not "feels wrong" but "the button is using the light variant; replace with the primary electric blue outlined variant")
- The ten Playsage modules are listed by name -- the agent knows the full scope of what it is designing for

**Recommended improvements:**
- The Figma tool is listed for design and prototyping, but it is unclear whether Figma is confirmed or assumed. If Figma has not been formally adopted, this should be noted as "Figma or equivalent". The org chart lists Figma as "(if adopted)"
- No instruction on how to hand off designs to engineering -- what format, what detail level, what file structure. This handoff is the primary interface with the engineering team and needs to be more specific

---

### 15. UI/UX Designer

**Overall rating:** Adequate

**Findings:**
- The Figma hygiene section is the strongest part of this role definition: specific, technical, and non-negotiable rules that produce consistent, engineer-ready output
- The instruction to ask the UI/UX Lead before starting work when a brief is ambiguous ("an hour spent asking the right question is better than a day of work in the wrong direction") is correct and appropriately positioned
- Brand constraints are clear: the token system, the font stack, the dark-only constraint
- The PR-equivalent submission note ("what was delivered, any minor decisions where the brief was silent, any open questions") is good practice

**Findings -- why not Strong:**
- The system prompt is shorter than almost all others and lacks some of the contextual grounding that distinguishes NBI-specific roles from generic equivalents
- The "what you never do without direction" section is entirely about brand compliance -- there is no parallel section about what the agent should proactively do to add value within a brief (e.g. flagging when a requested component does not exist in the design system before starting, rather than only escalating deviations)
- No instruction on what NBI currently needs the most design work on. An agent reading this prompt without Tier 3 project knowledge would have no idea where to start

**Recommended improvements:**
- Add a brief "current design priorities" section mirroring the Producer and CMO prompts: the NBI website prototype exists as an HTML/CSS reference, Playsage is the primary design surface, The Sage recommendation cards are the highest-priority UI task
- Strengthen the proactive behaviours: add an instruction to surface design system gaps (missing components, undefined states, inconsistent patterns) rather than waiting for a brief to expose them

---

### 16. Data Analyst

**Overall rating:** Strong

**Findings:**
- The gaming analytics methodology section is the strongest NBI-specific content in the IC roles: DAU/MAU forecasting, player segmentation with named segments (whales, dolphins, engaged F2P, lapsing players, new player cohort), churn prediction with survival analysis at N-day horizons, IAP/monetisation pricing review
- The Goals Studio analytical scope is specifically documented: "Jonas Rundberg scoped two pieces -- (1) hard currency pricing review for 7 items with regional pricing recommendations, and (2) in-game store review" -- an AI agent reading this knows exactly what to produce for that client
- Financial context is at the right level of specificity: exact revenue figures, payroll totals, NSI transition scenarios -- matches the CFO's financial context
- The four stakeholder framework (COO, CFO, CMO, clients) is clear and the different depth expectations per stakeholder are described
- Glen's "super anal" standard for accuracy is correctly named and tied directly to the consequences of getting it wrong ("An incorrect number in a CFO report or investor model is a credibility catastrophe")

**Recommended improvements:**
- No description of the actual data tools available to work with. QuickBooks is mentioned as a financial data source but there is no guidance on how the agent accesses or works with QuickBooks data (exports? read access? specific report types?). This creates a gap between the responsibilities described and the tools actually accessible
- The Lighthouse Studios embedded team (Amir, Ruan, Stavros) is an analytics team that may have data and methodologies the Data Analyst agent should coordinate with. No instruction on how this coordination should work

---

### 17. Producer

**Overall rating:** Strong

**Findings:**
- This is the most operationally specific system prompt across all roles. The "Active Project Landscape" section documents the status of every live initiative with specific dates, stall reasons, and urgency flags -- this is not a template, it is a real briefing
- The Goals Studio follow-up being "overdue since 11 March 2026" and the Jen MacLean emails being "unread and unanswered since 19 March 2026" are exactly the kinds of specific, dated items that allow an agent to take immediate action
- The known priority order section (1: Couch Heroes, 2: Sarge Universe pitch deck, 3: Goals Studio follow-up, 4: Jen MacLean emails, 5: SalarySage API key fix, 6: Playsage PRD) removes ambiguity about what to surface to the COO first
- The slippage report format instruction is outstanding: "What is behind. By how many days. Impact on downstream dependencies. Two or three recovery options, or an explicit statement that recovery options are not available without scope change. What decision the COO needs to make."
- The clarification that the AI Producer does not replace Kali on real client work -- it manages the internal AI team's project operations -- is an important scope boundary that prevents role confusion

**Recommended improvements:**
- The ClickUp project management tool is "under evaluation" -- the agent has no confirmed primary tool for backlog management. Either confirm ClickUp, specify a fallback (e.g. structured markdown task lists), or instruct the agent to flag tool selection as a decision needed from Glen
- No instruction on what the weekly Friday status report to the COO should contain structurally. This is the Producer's most important recurring output and needs a defined format

---

### 18. Technical Writer

**Overall rating:** Needs improvement

**Findings:**
- The system prompt correctly identifies the most immediate assignment (Playsage PRD v1.2 stalled since February 2026, 60+ issues to resolve) and the right methodology (read before writing, produce a gap report first, flag missing decisions as questions rather than inventing answers)
- The "what you never do" rules are correctly framed around the core failure modes for a technical writer (inventing requirements, marking sections complete with gaps remaining, guessing rather than asking)
- British English and no em dashes enforced

**Findings -- why Needs improvement:**
- The reporting line is different from every other role. The Tech Writer reports to VP Product, but the system prompt context loading loads `roles/tech_writer/persona.md` and `roles/tech_writer/responsibilities.md` as Tier 2 knowledge -- this is a structural error. Tier 2 should be a knowledge file (`roles/tech_writer/knowledge/tech_writing_context.md`), not the role definition files themselves. The role definition files are the agent's identity, not its knowledge base
- No Tier 2 knowledge file exists. Every other role has a `knowledge/` directory with a context file. The Tech Writer has none. The system prompt references `roles/tech_writer/workflows.md` which also does not appear to exist
- The system prompt is substantially shorter and less detailed than almost all other system prompts. There is almost no NBI context embedded in it. An agent reading it would understand the process (gap reports, ask questions, no fabrication) but would not understand what NBI is, what Playsage is, or why the PRD matters commercially. The CEO system prompt has this context. The Tech Writer's does not
- No description of the Tech Writer's relationship with the VP Product as manager. Unlike other IC roles that clearly describe their manager relationship, this prompt has no section on how the Tech Writer receives assignments, how feedback is delivered, or what review process exists

**Recommended improvements:**
- Create `roles/tech_writer/knowledge/tech_writing_context.md` with NBI product context (what Playsage is, the 10 modules, the Cascade Engine, the competitive context), the PRD background (v1.2 scoring 7.1/10, 60+ issues identified, commercial stakes), and writing conventions
- Fix the Tier 2 context loading instruction -- it should reference a knowledge file, not the persona and responsibilities files
- Add the VP Product relationship description: how assignments arrive, what "done" means for a spec, how the review process works
- Add NBI brand voice guidance: what NBI documentation sounds like, examples of before/after rewrites

---

## Summary

### Roles Ready to Deploy As-Is

These roles have strong, specific system prompts, clear scope boundaries, and sufficient NBI context to operate effectively:

- CEO
- COO
- CFO
- CTO
- CMO / Head of BD
- VP Engineering
- VP Product
- Head of People
- Senior Engineer
- DevOps Engineer
- QA Lead
- QA Engineer
- UI/UX Lead
- Data Analyst
- Producer

### Roles Needing Iteration Before Significant Work

These roles will function but have gaps that could produce substandard or contextually incorrect output:

- **Engineer** -- functional but thin on NBI-specific task context; acceptable for simple, well-specified tasks, but upgrade recommended before complex product work
- **UI/UX Designer** -- functional for brief execution but lacks current NBI design priorities and proactive surfacing behaviours; acceptable under close direction from UI/UX Lead
- **Technical Writer** -- the structural error in context loading (Tier 2 referencing persona files rather than a knowledge file) and the missing knowledge file make this role unreliable as currently configured. Do not assign complex PRD work without fixing the context loading first

### Roles With the Most Critical Gaps

1. **Technical Writer** -- structural error in context loading; missing Tier 2 knowledge file; missing VP Product relationship description; inadequate NBI context for the role's primary assignment. Fix before use
2. **Engineer** -- thin on NBI-specific task context; acceptable for simple work but insufficient for complex feature development without strong Senior Engineer direction
3. **UI/UX Designer** -- lacks current design priorities and proactive surfacing; acceptable under close direction

### Top 3 Systemic Issues Across All Roles

**Issue 1: Weekly report format is undefined for most roles**
The CEO, COO, CFO, VP Engineering, VP Product, and Producer all have a regular reporting obligation upward. None of these system prompts specify what the report should contain structurally. Every agent will invent its own format, making reports inconsistent and harder to scan. Fix: add a "Weekly Report Format" section to each relevant system prompt with the required headings and content.

**Issue 2: Tool access is described but execution mechanics are not**
Multiple roles reference tools (QuickBooks for the CFO and Data Analyst, ClickUp for the Producer and VP Engineering, Figma for the UI/UX roles) but do not explain how the agent is expected to interact with those tools. In several cases the tools are "under evaluation" or the access model is unclear. This creates a gap between what the role is described as doing and what the agent can actually execute. Fix: for each tool, add a note on the expected interaction model (read access via export, direct API, Claude Code, or manual coordination through another team member).

**Issue 3: Knowledge file quality is unverified beyond the CFO**
Only the CFO's `financial_context.md` was reviewed in depth during this audit. The CFO file is excellent. The assumption is that the others are comparable, but this is unverified. Several knowledge files (notably `qa_context.md` which is shared between QA Lead and QA Engineer as two separate files) have the highest risk of being thin or generic given that QA is an area where NBI has the least established real-world practice. A secondary audit of Tier 2 knowledge files is recommended.
