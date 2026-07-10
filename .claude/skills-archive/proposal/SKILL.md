---
name: proposal
description: "Generate client proposals, SOWs, and engagement scoping documents for NBI consulting engagements. Use when building a proposal for a new or existing client, drafting a statement of work, scoping an engagement, writing a pitch, pricing a consulting package, or preparing commercial terms. Also use when: a client asks 'what would this cost,' Glen wins a new lead and needs a proposal, structuring a fractional C-level engagement, pricing an audit, scoping an embedded team, preparing a Studio Brain Sprint offer, or writing any document that commits NBI commercially. Triggers: proposal, SOW, statement of work, engagement scope, pricing, quote, pitch, commercial terms, scope of work, client proposal, consulting proposal, engagement letter, fractional CPO, fractional CTO, audit proposal, embedded team, Studio Brain Sprint, how much should we charge, price this, write a proposal, draft a proposal, new client pitch, engagement pricing, rate card, three-tier pricing, workstream pricing, partial buy-in."
user-invocable: true
---

# NBI Proposal Generator

End-to-end proposal generation for NBI consulting engagements. Loads client context, applies proven pricing patterns, and produces a structured DRAFT proposal for Glen's approval.

## Step 1: Intake

Ask Glen these four questions before doing anything else. Present them as a structured prompt, not a wall of text:

1. **Target client** -- Client name, or "new client" with a brief description (genre, platform, team size, stage)
2. **Engagement type** -- Which model?
   - Audit (2-4 week diagnostic)
   - Fractional C-level (ongoing embedded leadership)
   - Embedded team (NBI staff inside client operations)
   - Project SOW (scoped deliverable with fixed timeline)
   - Studio Brain Sprint (AI operations setup -- Brain + roles + workflows)
3. **Scope** -- What do they need? What problem are they trying to solve?
4. **Known constraints** -- Budget ceiling, timeline pressure, political dynamics, decision-makers, competing proposals, anything that shapes the commercial approach

Do not proceed until all four are answered. If Glen gives partial answers, ask for the missing pieces specifically.

## Step 2: Load Context

### Existing client check
- Search `intelligence/banks/client_*.md` for a matching client bank
- Search `projects/` for any existing project directories for this client
- Search `brain/clients_detailed.md` for existing client entries
- If found: load the client bank and summarise what NBI already knows about this client, their engagement history, and any prior pricing

### New client
- If no existing context: offer to run `/compile-client` first if Glen has source documents (emails, briefs, meeting notes)
- If no source documents: proceed with what Glen provided at intake and flag knowledge gaps explicitly

### Always load these three reference sources
1. **`intelligence/banks/client_patterns.md`** -- Pricing table, winning approaches, delivery patterns, what to avoid. This is the evidence base for proposal structure and pricing decisions.
2. **`roles/gaming_practice_lead/AGENT.md`** -- NBI positioning, engagement archetypes, quality standards, specialist team structure. Grounds the proposal in what NBI actually delivers.
3. **`brain/services_ai_operations.md`** -- Service offerings, AI operations setup, continuous intelligence, positioning against Big Four. Required for Studio Brain Sprint proposals and any engagement that includes AI capability transfer.

### Contextual loads (based on engagement type)
- If engagement involves game economy/monetisation: load `roles/game_economy_consultant/AGENT.md`
- If engagement involves production: load `roles/production_consultant/AGENT.md`
- If engagement involves live ops or org design/hiring: load `roles/gaming_practice_lead/AGENT.md` (covers these sub-domains via specialist knowledge)

## Step 3: Generate Proposal Draft

Structure the proposal document with these sections. Every section must be customised to the specific client -- if you could swap the client name and the section would still make sense, rewrite it.

### 3.1 Executive Summary
- Anchor to the CLIENT'S urgency, not NBI's capabilities
- Name the specific problem, the risk of inaction, and what changes if this engagement succeeds
- Maximum 4 paragraphs
- Pattern: "You are facing [specific problem]. The risk is [concrete consequence]. NBI will [specific action] resulting in [measurable outcome]."

### 3.2 Workstreams
- Separate the engagement into distinct workstreams that enable partial buy-in
- Each workstream must have: objective, deliverables, NBI team involved, estimated duration, dependencies on other workstreams
- Client can buy any combination -- this is a proven pattern (Goals took pricing workstream only, not live service)
- Flag which workstreams are independent and which require others

### 3.3 Pricing Table
- Use NBI hourly rates from the patterns bank:
  - Operational Efficiency: $250/hr
  - Game Design: $275/hr
  - Market Research: $300/hr
  - LiveOps: $275/hr
  - Monetisation: $325/hr
  - AI/Data Strategy: $350/hr
  - UX/Player Research: $275/hr
  - Corporate Strategy: $400/hr
- Calculate: rate x estimated hours per workstream
- Present three tiers if appropriate:
  - **Minimum** -- Core deliverables only, solves the immediate problem
  - **Recommended** -- Core plus supporting analysis, reduces risk
  - **Comprehensive** -- Full scope including capability transfer and ongoing support
- If Glen provided a budget ceiling at intake, ensure at least one tier fits within it
- Show the maths: hours x rate = total, not just a lump sum
- Never fabricate rates or hours -- use only the patterns bank figures or Glen's direct input

### 3.4 Timeline and Milestones
- Realistic timeline based on engagement type and scope
- Key milestones with deliverables at each
- Client dependencies clearly called out (access, data, stakeholder time)
- Do not quote durations in weeks/days -- structure by milestone deliverables

### 3.5 NBI Team
- Name the roles involved (not individuals unless Glen specifies)
- Brief description of relevant expertise for each role
- Who the client's primary contact will be (usually Glen for senior engagements)

### 3.6 Risk Section
- What could go wrong and how NBI mitigates it
- What NBI needs from the client to succeed (access, data, decision-maker availability, stakeholder alignment)
- Scope boundaries -- what is explicitly NOT included
- Change control: how scope changes are handled commercially

### 3.7 Evidence Appendix
- Reference similar engagements (anonymised unless Glen approves naming)
- Pull from client_patterns.md for comparable pricing, scope, and outcomes
- Include relevant benchmarks or frameworks NBI will apply
- Every claim mapped to a source -- no unsubstantiated assertions

### 3.8 Terms
- Payment terms (suggest based on engagement type: milestone-based for projects, monthly for fractional/retainer)
- Favour general and flexible terms over prescriptive milestone-fee structures (per client_patterns.md: over-prescriptive contracts fail)
- IP and confidentiality (standard NBI terms -- flag for Glen/legal review)
- Termination provisions

## Step 4: Output

- Deliver as a markdown document
- Header: `# NBI Consulting Proposal -- [Client Name]` with `DRAFT` watermark
- Footer on every logical section: `DRAFT -- Not for distribution`
- Final line of the document:

> **Approval gate:** This is a DRAFT for Glen's review. Do not send to the client without explicit approval from Glen Pryer.

- British English throughout
- No em dashes
- No consultant-speak -- studio-native language
- 8/10 quality minimum -- if the output does not meet this bar, flag the weak sections and offer to strengthen them

## Step 5: Feedback Loop

After delivering the proposal draft, prompt Glen:

> "Did this proposal land? If sent: what was the final price, what modifications were made, and what was the outcome? I will feed the result back into client_patterns.md for future reference."

When Glen provides outcome data:
- Append a new entry to `intelligence/banks/client_patterns.md` under the appropriate section (Pricing That Landed, Proposals That Won, or What To Avoid)
- Include provenance tag: `[source: proposal_[client]_[YYYY-MM-DD]]`
- If the proposal was rejected: capture why under What To Avoid with the same provenance

## Rules

- **British English** -- no American spellings, no em dashes
- **Never fabricate pricing** -- use only the rates from client_patterns.md or figures Glen provides directly. If a rate category is missing, ask Glen rather than inventing one.
- **Always DRAFT** -- every proposal output is marked DRAFT and requires Glen's explicit approval before any client communication
- **8/10 quality minimum** -- depth over breadth. A thorough proposal covering the three things that matter beats a shallow pass across twenty.
- **Client-specific customisation** -- genre, platform, lifecycle stage, team maturity, and specific situation must all be reflected. Generic proposals are a failure.
- **Separate workstreams** -- always structure for partial buy-in unless Glen explicitly says the engagement is all-or-nothing
- **No consultant-speak** -- "vertical slice", "content pipeline", "ARPDAU" are fine. "Strategic value proposition", "operational excellence framework", "synergistic alignment" are not.
- **Frame around client urgency** -- the client's problem leads, NBI's capability follows
- **Quantify where possible** -- hours, rates, timelines, expected outcomes. Proposals without numbers are opinions, not commercial documents.
- **Flag uncertainty** -- if you lack information to price or scope a workstream accurately, say so explicitly rather than guessing
